import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import { entrarPara } from "@jilson/core";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// Na NOSSA fronteira: a busca da assinatura (a rede da Stripe) e o balcão de e-mail. O aviso, a
// sincronia, o espelho e a marca de cada e-mail rodam de verdade, contra o banco.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { enderecoDoSite } from "../lib/endereco-do-site.js";
import { readFileSync, existsSync } from "node:fs";
import { ANTECEDENCIA_DO_AVISO_EM_MS, PRAZO_DA_MARCA_PENDENTE_EM_MS, avisarSobreAAssinatura, emailDevido, marcaResolve, rodadaDosAvisos } from "../lib/avisos-da-assinatura.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { diaNoEmail } from "../views/email-da-cobranca.js";

// OS E-MAILS DA COBRANÇA (Fase 4, etapa 4.7, passo 7 — decisões do operador, 28/10/2026). O que estes
// testes protegem:
//   - a renovação que falhou → "a cobrança falhou", UMA vez, com a próxima tentativa e o dia em que
//     as aulas trancam; no último dia antes de trancar → "antes de trancar"; já trancada → nada;
//   - uma falha nova (outro mês) é outro e-mail;
//   - a assinatura que foi paga e terminou → "sua assinatura terminou", com reativar; a que expirou
//     sem o primeiro pagamento, a sem dono e a conta excluída → nada; a cancelada com dias pagos
//     espera o período acabar;
//   - o envio que falha volta a tentar; "duplicado" não; duas pontas juntas mandam um só;
//   - uma falha na regra nunca derruba o 200 do aviso.

const SEGREDO = "whsec_teste_da_suite_local";
const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;

type Aviso = { id: string; type: string; data: { object: Record<string, unknown> } };
// O aviso de FATURA diz a assinatura dentro da fatura (`parent.subscription_details`), como a Stripe manda.
const avisoDaAssinatura = (subId: string, type = "customer.subscription.updated"): Aviso => ({
  id: novoId("evt"),
  type,
  data: { object: type.startsWith("invoice.") ? { id: novoId("in"), object: "invoice", parent: { subscription_details: { subscription: subId } } } : { id: subId, object: "subscription" } },
});
function enviar(aviso: Aviso) {
  const corpo = JSON.stringify({ object: "event", ...aviso }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", cabecalho).send(corpo);
}

async function novaConta(dados: { deletedAt?: Date } = {}) {
  const id = novoId("conta");
  return prisma.user.create({ data: { id, email: `cobranca-${n}-${S}@teste.local`, ...dados } });
}
/** A assinatura como a Stripe diz, da conta `userId`. */
const naStripe = (id: string, userId: string, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
  id,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId: `cus_${id}`,
  userId,
  livemode: false,
  ...dados,
});
/** A assinatura da conta com a renovação que falhou em `falha`, e a Stripe tentando de novo em `proxima`. */
const atrasada = (id: string, userId: string, falha: Date, proxima: Date | null = new Date(Date.now() + 2 * DIA)) => naStripe(id, userId, { status: "past_due", pagoAte: falha, proximaTentativa: proxima });

const doTipo = (tipo: PedidoDeEmail["tipo"]) => enviarEmail.mock.calls.map(([p]) => p).filter((p) => p.tipo === tipo);
const todos = () => enviarEmail.mock.calls.map(([p]) => p);
const marcas = async (sub: string) => prisma.subscriptionEmail.findMany({ where: { subscription: { stripeSubscriptionId: sub } }, select: { kind: true, reference: true }, orderBy: { id: "asc" } });
/** As marcas com a confirmação do envio (`sentAt`): vazio = pendente. */
const marcasCompletas = async (sub: string) => prisma.subscriptionEmail.findMany({ where: { subscription: { stripeSubscriptionId: sub } }, select: { kind: true, reference: true, sentAt: true }, orderBy: { id: "asc" } });

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
});

beforeEach(() => {
  buscarAssinatura.mockReset();
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: S } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("a cobrança que falhou", () => {
  it("a renovação falhou: 'a cobrança falhou' sai UMA vez, para o e-mail da conta, com a próxima tentativa, o dia em que tranca e o botão de trocar o cartão", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const falha = new Date(Date.now() - 5 * 60 * 1000);
    const proxima = new Date(Date.now() + 2 * DIA);
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, falha, proxima));
    expect((await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"))).status).toBe(200);

    const enviados = doTipo("cobranca-falhou");
    expect(enviados).toHaveLength(1);
    const [pedido] = enviados;
    const espelho = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: sub } });
    expect([pedido?.para, pedido?.chave, pedido?.referencia]).toEqual([conta.email, `cobranca-falhou/${espelho.id}/${falha.toISOString()}`, `conta:${conta.id} assinatura:${sub}`]);
    const texto = pedido?.mensagem.paragrafos.join(" ") ?? "";
    expect(texto).toContain(`Vamos tentar de novo no dia ${diaNoEmail(proxima)}.`);
    expect(texto).toContain(`abertas até o dia ${diaNoEmail(new Date(falha.getTime() + 3 * DIA))}`);
    expect(pedido?.mensagem.botao).toEqual({ texto: "Trocar cartão", endereco: enderecoDoSite(entrarPara("cartao")) });
    expect(pedido?.mensagem.botao?.endereco).toMatch(/\/login\?depois=cartao$/);
    expect(await marcas(sub)).toEqual([{ kind: "COBRANCA_FALHOU", reference: falha.toISOString() }]);
    // O envio confirmado fica gravado na marca (vazio seria "pendente", retomável depois do prazo).
    expect((await marcasCompletas(sub))[0]?.sentAt).toBeInstanceOf(Date);

    // Outros avisos da mesma falha (a Stripe tentando de novo): não sai outro.
    await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));
    await enviar(avisoDaAssinatura(sub));
    expect(todos()).toHaveLength(1);
  });

  it("sem nova tentativa marcada (ou com a data já passada): a frase da próxima tentativa sai, e o resto fica", async () => {
    for (const proxima of [null, new Date(Date.now() - HORA)]) {
      enviarEmail.mockClear();
      const conta = await novaConta();
      const sub = novoId("sub");
      buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, new Date(Date.now() - 60_000), proxima));
      await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));
      const [pedido] = doTipo("cobranca-falhou");
      expect(pedido?.mensagem.paragrafos.join(" ")).not.toContain("Vamos tentar de novo");
      expect(pedido?.mensagem.paragrafos.join(" ")).toContain("abertas até o dia");
    }
  });

  it("no último dia antes de trancar: sai o 'antes de trancar', com o dia em que tranca — e não o da falha", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const falha = new Date(Date.now() - 2.5 * DIA);
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, falha));
    await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));

    expect(doTipo("cobranca-falhou")).toHaveLength(0);
    const [pedido] = doTipo("antes-de-trancar");
    expect(pedido?.para).toBe(conta.email);
    expect(pedido?.mensagem.paragrafos.join(" ")).toContain(`Se não for pago até o dia ${diaNoEmail(new Date(falha.getTime() + 3 * DIA))}`);
    expect(pedido?.mensagem.botao?.endereco).toBe(enderecoDoSite(entrarPara("cartao")));
  });

  it("já trancada (passou dos 3 dias): nenhum e-mail — o de cancelada vem quando as tentativas acabarem", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, new Date(Date.now() - 4 * DIA)));
    expect((await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"))).status).toBe(200);
    expect(todos()).toHaveLength(0);
    expect(await marcas(sub)).toEqual([]);
  });

  it("a mesma falha: o da falha na hora e, no último dia, o 'antes de trancar' — um de cada, e depois nada", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const falha = new Date(Date.now() - 60_000);
    const assinatura = atrasada(sub, conta.id, falha);
    buscarAssinatura.mockResolvedValue(assinatura);
    await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));
    expect(doTipo("cobranca-falhou")).toHaveLength(1);

    // A rodada do agendador no último dia, e de novo uma hora depois.
    const ultimoDia = new Date(falha.getTime() + 2 * DIA + HORA);
    await avisarSobreAAssinatura(assinatura, ultimoDia);
    await avisarSobreAAssinatura(assinatura, new Date(ultimoDia.getTime() + HORA));
    expect(doTipo("antes-de-trancar")).toHaveLength(1);
    expect(doTipo("cobranca-falhou")).toHaveLength(1);
    // Passou dos 3 dias: nada mais.
    await avisarSobreAAssinatura(assinatura, new Date(falha.getTime() + 3 * DIA + HORA));
    expect(todos()).toHaveLength(2);
  });

  it("pagou e, num mês seguinte, falhou de novo: outro e-mail da falha", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const primeira = new Date(Date.now() - 2 * HORA);
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, primeira));
    await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));
    // Pagou (o cartão novo): sem e-mail.
    buscarAssinatura.mockResolvedValue(naStripe(sub, conta.id));
    await enviar(avisoDaAssinatura(sub, "invoice.paid"));
    expect(todos()).toHaveLength(1);
    // A falha seguinte.
    const segunda = new Date(Date.now() - 60_000);
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, segunda));
    await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));
    const falhas = doTipo("cobranca-falhou");
    expect(falhas.map((p) => p.chave)).toEqual([expect.stringContaining(primeira.toISOString()), expect.stringContaining(segunda.toISOString())]);
  });
});

describe("a assinatura que terminou", () => {
  it("foi paga e terminou: 'sua assinatura terminou', com o botão de reativar — UMA vez", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub, conta.id, { status: "canceled", pagoAte: new Date(Date.now() - 60_000) }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"));
    await enviar(avisoDaAssinatura(sub));

    const enviados = doTipo("assinatura-cancelada");
    expect(enviados).toHaveLength(1);
    const [pedido] = enviados;
    expect([pedido?.para, pedido?.mensagem.titulo]).toEqual([conta.email, "Sua assinatura terminou"]);
    expect(pedido?.mensagem.botao).toEqual({ texto: "Reativar assinatura", endereco: enderecoDoSite(entrarPara("assinar")) });
    expect(await marcas(sub)).toEqual([{ kind: "CANCELADA", reference: "fim" }]);
  });

  it("as tentativas de cobrança acabaram: a versão 'foi cancelada', que diz que não conseguimos cobrar", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub, conta.id, { status: "canceled", pagoAte: new Date(Date.now() - 15 * DIA), encerradaSemPagamento: true }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"));
    const [pedido] = doTipo("assinatura-cancelada");
    expect(pedido?.mensagem.titulo).toBe("Sua assinatura foi cancelada");
    expect(pedido?.mensagem.paragrafos.join(" ")).toContain("Não conseguimos cobrar a renovação");
  });

  it("a que expirou sem o primeiro pagamento, a ativa e a que se renovou: nenhum e-mail", async () => {
    const conta = await novaConta();
    for (const status of ["incomplete_expired", "incomplete", "active", "trialing"]) {
      const sub = novoId("sub");
      buscarAssinatura.mockResolvedValue(naStripe(sub, conta.id, { status, pagoAte: new Date(Date.now() - 60_000) }));
      expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"))).status, status).toBe(200);
    }
    expect(todos()).toHaveLength(0);
  });

  it("cancelada com dias pagos (o painel cancelou na hora): nada até o período acabar; acabou, sai", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const assinatura = naStripe(sub, conta.id, { status: "canceled", pagoAte: new Date(Date.now() + 10 * DIA) });
    buscarAssinatura.mockResolvedValue(assinatura);
    await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"));
    expect(todos()).toHaveLength(0);

    await prisma.subscription.update({ where: { stripeSubscriptionId: sub }, data: { currentPeriodEnd: new Date(Date.now() - 60_000) } });
    await avisarSobreAAssinatura(assinatura);
    expect(doTipo("assinatura-cancelada")).toHaveLength(1);
  });

  it("a conta excluída a pedido do titular e a assinatura sem conta na escola: nenhum e-mail", async () => {
    // A assinatura sem conta que dá acesso é alerta do aviso (alguém pagando e trancado fora) — aqui, esperado.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const excluida = await novaConta({ deletedAt: new Date() });
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(sub, excluida.id, { status: "canceled", pagoAte: new Date(Date.now() - 60_000) }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"));
    // A marca fica CONSUMIDA (resolvida sem envio): a rodada do agendador não volta a esta assinatura.
    expect((await marcasCompletas(sub)).map((m) => [m.kind, m.sentAt instanceof Date])).toEqual([["CANCELADA", true]]);

    const semConta = novoId("sub");
    buscarAssinatura.mockResolvedValue(naStripe(semConta, `conta-que-nao-existe-${S}`, { status: "past_due", pagoAte: new Date(Date.now() - 60_000) }));
    expect((await enviar(avisoDaAssinatura(semConta, "invoice.payment_failed"))).status).toBe(200);
    expect(todos()).toHaveLength(0);
  });
});

describe("uma vez cada", () => {
  it("o envio que falhou devolve a marca, e o aviso seguinte manda; 'duplicado' guarda a marca", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, new Date(Date.now() - 60_000)));
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "falhou" });
    await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"));
    expect(await marcas(sub)).toEqual([]);
    await enviar(avisoDaAssinatura(sub));
    expect(doTipo("cobranca-falhou")).toHaveLength(2);
    expect(await marcas(sub)).toHaveLength(1);

    const outra = novoId("sub");
    buscarAssinatura.mockResolvedValue(atrasada(outra, conta.id, new Date(Date.now() - 60_000)));
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "duplicado" });
    await enviar(avisoDaAssinatura(outra, "invoice.payment_failed"));
    await enviar(avisoDaAssinatura(outra));
    expect(enviarEmail.mock.calls.filter(([p]) => p.referencia?.includes(outra))).toHaveLength(1);
    expect(await marcas(outra)).toHaveLength(1);
  });

  it("o aviso da Stripe e a rodada do agendador ao mesmo tempo: um e-mail só", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const assinatura = atrasada(sub, conta.id, new Date(Date.now() - 60_000));
    buscarAssinatura.mockResolvedValue(naStripe(sub, conta.id, { status: "active" }));
    await enviar(avisoDaAssinatura(sub));
    await prisma.subscription.update({ where: { stripeSubscriptionId: sub }, data: { status: "past_due", currentPeriodEnd: assinatura.pagoAte } });
    await Promise.all([avisarSobreAAssinatura(assinatura), avisarSobreAAssinatura(assinatura), avisarSobreAAssinatura(assinatura)]);
    expect(doTipo("cobranca-falhou")).toHaveLength(1);
  });

  it("uma falha dentro da regra vira alerta [email], e o aviso da Stripe continua 200", async () => {
    const erros = vi.spyOn(console, "error").mockImplementation(() => {});
    const conta = await novaConta();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(atrasada(sub, conta.id, new Date(Date.now() - 60_000)));
    enviarEmail.mockRejectedValueOnce(new Error("o balcão quebrou o contrato"));
    expect((await enviar(avisoDaAssinatura(sub, "invoice.payment_failed"))).status).toBe(200);
    const alertas = erros.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[email]"));
    expect(alertas.some((texto) => texto.includes(sub))).toBe(true);
    expect(alertas.join(" ")).not.toContain(conta.email);
  });
});

// A RODADA DE HORA EM HORA (etapa 4.7, passo 7b): o job do agendador. As assinaturas daqui nascem
// direto no banco, no estado em que a rodada as encontraria; a Stripe responde por um mapa — o que
// sobrou de outros arquivos de teste no banco cai na falha dela, e por isso os testes conferem
// assinatura por assinatura.
describe("a rodada do agendador", () => {
  const naStripeAgora = new Map<string, AssinaturaNaStripe>();
  beforeEach(() => {
    naStripeAgora.clear();
    buscarAssinatura.mockImplementation(async (id) => {
      const assinatura = naStripeAgora.get(id);
      if (!assinatura) throw new Error(`a Stripe deste teste não conhece ${id}`);
      return assinatura;
    });
    // A falha da Stripe nas assinaturas de outros testes vira alerta: aqui, esperado.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  async function noBanco(sub: string, conta: string, dados: { status: string; currentPeriodEnd: Date | null; updatedAt?: Date }) {
    return prisma.subscription.create({ data: { stripeSubscriptionId: sub, ownerUserId: conta, status: dados.status, currentPeriodEnd: dados.currentPeriodEnd, livemode: false, ...(dados.updatedAt ? { updatedAt: dados.updatedAt } : {}) } });
  }
  const conferiuNaStripe = (sub: string) => buscarAssinatura.mock.calls.some(([id]) => id === sub);
  const daAssinatura = (sub: string, tipo: PedidoDeEmail["tipo"]) => doTipo(tipo).filter((p) => p.referencia?.endsWith(`assinatura:${sub}`));

  it("no último dia antes de trancar: confere na Stripe e manda o 'antes de trancar'; na rodada seguinte, nem vai à Stripe", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const falha = new Date(Date.now() - 2.5 * DIA);
    const linha = await noBanco(sub, conta.id, { status: "past_due", currentPeriodEnd: falha });
    await prisma.subscriptionEmail.create({ data: { subscriptionId: linha.id, kind: "COBRANCA_FALHOU", reference: falha.toISOString(), sentAt: new Date() } });
    naStripeAgora.set(sub, atrasada(sub, conta.id, falha));

    await rodadaDosAvisos();
    expect(conferiuNaStripe(sub)).toBe(true);
    expect(daAssinatura(sub, "antes-de-trancar")).toHaveLength(1);
    expect(daAssinatura(sub, "cobranca-falhou")).toHaveLength(0);

    buscarAssinatura.mockClear();
    await rodadaDosAvisos();
    expect(conferiuNaStripe(sub)).toBe(false);
    expect(daAssinatura(sub, "antes-de-trancar")).toHaveLength(1);
  });

  it("pagou e o aviso da Stripe se perdeu: a rodada acerta o espelho pela Stripe e não manda nada", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    await noBanco(sub, conta.id, { status: "past_due", currentPeriodEnd: new Date(Date.now() - 2.5 * DIA) });
    naStripeAgora.set(sub, naStripe(sub, conta.id));
    await rodadaDosAvisos();
    expect((await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: sub } })).status).toBe("active");
    expect(todos().filter((p) => p.referencia?.endsWith(`assinatura:${sub}`))).toHaveLength(0);
  });

  it("o e-mail da falha que não saiu (o aviso se perdeu): a rodada manda", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const falha = new Date(Date.now() - HORA);
    await noBanco(sub, conta.id, { status: "past_due", currentPeriodEnd: falha });
    naStripeAgora.set(sub, atrasada(sub, conta.id, falha));
    await rodadaDosAvisos();
    expect(daAssinatura(sub, "cobranca-falhou")).toHaveLength(1);
  });

  it("a cancelada há pouco, e a com dias pagos cujo período acabou agora: a rodada manda; a de 10 dias atrás nem vai à Stripe", async () => {
    const conta = await novaConta();
    const recente = novoId("sub");
    await noBanco(recente, conta.id, { status: "canceled", currentPeriodEnd: new Date(Date.now() - 20 * DIA) });
    naStripeAgora.set(recente, naStripe(recente, conta.id, { status: "canceled", pagoAte: new Date(Date.now() - 20 * DIA) }));
    const outra = await novaConta();
    const acabouAgora = novoId("sub");
    await noBanco(acabouAgora, outra.id, { status: "canceled", currentPeriodEnd: new Date(Date.now() - HORA), updatedAt: new Date(Date.now() - 5 * DIA) });
    naStripeAgora.set(acabouAgora, naStripe(acabouAgora, outra.id, { status: "canceled", pagoAte: new Date(Date.now() - HORA) }));
    const terceira = await novaConta();
    const antiga = novoId("sub");
    await noBanco(antiga, terceira.id, { status: "canceled", currentPeriodEnd: new Date(Date.now() - 10 * DIA), updatedAt: new Date(Date.now() - 10 * DIA) });

    await rodadaDosAvisos();
    expect(daAssinatura(recente, "assinatura-cancelada")).toHaveLength(1);
    expect(daAssinatura(acabouAgora, "assinatura-cancelada")).toHaveLength(1);
    expect(conferiuNaStripe(antiga)).toBe(false);
  });

  it("a já trancada e a que já recebeu o e-mail devido: nem vai à Stripe", async () => {
    const conta = await novaConta();
    const trancada = novoId("sub");
    await noBanco(trancada, conta.id, { status: "past_due", currentPeriodEnd: new Date(Date.now() - 4 * DIA) });
    const recebeu = novoId("sub");
    const falha = new Date(Date.now() - HORA);
    const linha = await noBanco(recebeu, conta.id, { status: "past_due", currentPeriodEnd: falha });
    await prisma.subscriptionEmail.create({ data: { subscriptionId: linha.id, kind: "COBRANCA_FALHOU", reference: falha.toISOString(), sentAt: new Date() } });
    await rodadaDosAvisos();
    expect([conferiuNaStripe(trancada), conferiuNaStripe(recebeu)]).toEqual([false, false]);
  });

  it("uma assinatura que falha na Stripe não para a rodada: vira alerta [avisos], e a seguinte manda", async () => {
    const conta = await novaConta();
    const quebrada = novoId("sub");
    const falha = new Date(Date.now() - HORA);
    await noBanco(quebrada, conta.id, { status: "past_due", currentPeriodEnd: falha });
    const outra = await novaConta();
    const boa = novoId("sub");
    await noBanco(boa, outra.id, { status: "past_due", currentPeriodEnd: falha });
    naStripeAgora.set(boa, atrasada(boa, outra.id, falha));

    const rodada = await rodadaDosAvisos();
    expect(rodada.falhas).toBeGreaterThanOrEqual(1);
    expect(daAssinatura(boa, "cobranca-falhou")).toHaveLength(1);
    const alertas = vi.mocked(console.error).mock.calls.map(([texto]) => String(texto));
    expect(alertas.some((texto) => texto.startsWith("[avisos]") && texto.includes(quebrada))).toBe(true);
  });

  // P1 DA REVISÃO DA ETAPA (28/10/2026): a cancelada de quem JÁ ASSINOU DE NOVO voltava à fila toda hora
  // (a rodada regravava o espelho e renovava o `updatedAt` que a escolheu) — e, no dia em que a nova
  // atrasasse, mandaria "sua assinatura terminou — reative" em vez de "troque o cartão".
  it("cancelou e já assinou de novo: nenhum e-mail, a marca consumida, a rodada não volta à Stripe — e a nova atrasada não ressuscita o 'terminou'", async () => {
    const conta = await novaConta();
    const nova = novoId("sub");
    await noBanco(nova, conta.id, { status: "active", currentPeriodEnd: new Date(Date.now() + 30 * DIA) });
    const antiga = novoId("sub");
    buscarAssinatura.mockResolvedValueOnce(naStripe(antiga, conta.id, { status: "canceled", pagoAte: new Date(Date.now() - 60_000) }));
    await enviar(avisoDaAssinatura(antiga, "customer.subscription.deleted"));
    expect(daAssinatura(antiga, "assinatura-cancelada")).toHaveLength(0);
    expect((await marcasCompletas(antiga)).map((m) => [m.kind, m.sentAt instanceof Date])).toEqual([["CANCELADA", true]]);

    buscarAssinatura.mockClear();
    await rodadaDosAvisos();
    await rodadaDosAvisos();
    expect(conferiuNaStripe(antiga)).toBe(false);

    // A nova atrasa e tranca: a antiga continua sem e-mail, e a nova trancada também não deve nada.
    await prisma.subscription.update({ where: { stripeSubscriptionId: nova }, data: { status: "past_due", currentPeriodEnd: new Date(Date.now() - 4 * DIA) } });
    await rodadaDosAvisos();
    expect(daAssinatura(antiga, "assinatura-cancelada")).toHaveLength(0);
    expect([conferiuNaStripe(antiga), conferiuNaStripe(nova)]).toEqual([false, false]);
  });

  it("a cancelada é só LIDA na Stripe: o espelho não é regravado, e a rodada seguinte não volta", async () => {
    const conta = await novaConta();
    const sub = novoId("sub");
    const linha = await noBanco(sub, conta.id, { status: "canceled", currentPeriodEnd: new Date(Date.now() - 20 * DIA) });
    naStripeAgora.set(sub, naStripe(sub, conta.id, { status: "canceled", pagoAte: new Date(Date.now() - 20 * DIA) }));
    await rodadaDosAvisos();
    expect(daAssinatura(sub, "assinatura-cancelada")).toHaveLength(1);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: linha.id } })).updatedAt.getTime()).toBe(linha.updatedAt.getTime());
    buscarAssinatura.mockClear();
    await rodadaDosAvisos();
    expect(conferiuNaStripe(sub)).toBe(false);
  });

  // A7 DA REVISÃO DA ETAPA: quem tomou a marca e caiu antes de o Resend responder deixava o e-mail
  // marcado e nunca enviado. A pendente velha é retomada; a recente é de quem está enviando agora.
  it("a marca PENDENTE há mais que o prazo é retomada e enviada; a pendente recente, não", async () => {
    const conta = await novaConta();
    const falha = new Date(Date.now() - HORA);
    const velha = novoId("sub");
    const linhaVelha = await noBanco(velha, conta.id, { status: "past_due", currentPeriodEnd: falha });
    await prisma.subscriptionEmail.create({ data: { subscriptionId: linhaVelha.id, kind: "COBRANCA_FALHOU", reference: falha.toISOString(), createdAt: new Date(Date.now() - PRAZO_DA_MARCA_PENDENTE_EM_MS - 60_000) } });
    naStripeAgora.set(velha, atrasada(velha, conta.id, falha));
    const outra = await novaConta();
    const recente = novoId("sub");
    const linhaRecente = await noBanco(recente, outra.id, { status: "past_due", currentPeriodEnd: falha });
    await prisma.subscriptionEmail.create({ data: { subscriptionId: linhaRecente.id, kind: "COBRANCA_FALHOU", reference: falha.toISOString() } });
    naStripeAgora.set(recente, atrasada(recente, outra.id, falha));

    await rodadaDosAvisos();
    expect(daAssinatura(velha, "cobranca-falhou")).toHaveLength(1);
    expect((await marcasCompletas(velha))[0]?.sentAt).toBeInstanceOf(Date);
    expect(daAssinatura(recente, "cobranca-falhou")).toHaveLength(0);
    expect(conferiuNaStripe(recente)).toBe(false);
    expect((await marcasCompletas(recente))[0]?.sentAt).toBeNull();
  });

  // P2 DA REVISÃO DA ETAPA: a assinatura que a Stripe não conhece virava alerta a cada hora.
  it("a Stripe não conhece a assinatura: aviso (não alerta), contada em 'desconhecidas', e as outras seguem", async () => {
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    const conta = await novaConta();
    const falha = new Date(Date.now() - HORA);
    const sumida = novoId("sub");
    await noBanco(sumida, conta.id, { status: "past_due", currentPeriodEnd: falha });
    const outra = await novaConta();
    const boa = novoId("sub");
    await noBanco(boa, outra.id, { status: "past_due", currentPeriodEnd: falha });
    naStripeAgora.set(boa, atrasada(boa, outra.id, falha));
    buscarAssinatura.mockImplementation(async (id) => {
      if (id === sumida) throw new AssinaturaNaoEncontrada(id);
      const assinatura = naStripeAgora.get(id);
      if (!assinatura) throw new Error(`a Stripe deste teste não conhece ${id}`);
      return assinatura;
    });

    const rodada = await rodadaDosAvisos();
    expect(rodada.desconhecidas).toBeGreaterThanOrEqual(1);
    expect(daAssinatura(boa, "cobranca-falhou")).toHaveLength(1);
    expect(avisos.mock.calls.some(([texto]) => String(texto).startsWith("[avisos]") && String(texto).includes(sumida))).toBe(true);
    expect(vi.mocked(console.error).mock.calls.some(([texto]) => String(texto).includes(sumida))).toBe(false);
  });

  // P2 DA REVISÃO DA ETAPA: o job tem 5 minutos; passado o prazo, as assinaturas que sobram ficam para a próxima hora.
  it("com o prazo esgotado, nada vai à Stripe: as assinaturas ficam adiadas, com aviso", async () => {
    const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
    const conta = await novaConta();
    const sub = novoId("sub");
    await noBanco(sub, conta.id, { status: "past_due", currentPeriodEnd: new Date(Date.now() - HORA) });
    naStripeAgora.set(sub, atrasada(sub, conta.id, new Date(Date.now() - HORA)));
    const rodada = await rodadaDosAvisos(new Date(), 0);
    expect(rodada.adiadas).toBeGreaterThanOrEqual(1);
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(daAssinatura(sub, "cobranca-falhou")).toHaveLength(0);
    expect(avisos.mock.calls.some(([texto]) => String(texto).includes("parou pelo prazo"))).toBe(true);
  });

  it("a conta excluída (LGPD): a rodada nem a escolhe — nenhuma ida à Stripe, mesmo sem marca", async () => {
    const excluida = await novaConta({ deletedAt: new Date() });
    const sub = novoId("sub");
    await noBanco(sub, excluida.id, { status: "canceled", currentPeriodEnd: new Date(Date.now() - HORA) });
    naStripeAgora.set(sub, naStripe(sub, excluida.id, { status: "canceled", pagoAte: new Date(Date.now() - HORA) }));
    await rodadaDosAvisos();
    expect(conferiuNaStripe(sub)).toBe(false);
    expect(todos().filter((p) => p.referencia?.endsWith(`assinatura:${sub}`))).toHaveLength(0);
  });

  it("o job da publicação executa o arquivo da rodada", () => {
    const raiz = new URL("../../../", import.meta.url);
    const publicacao = readFileSync(new URL(".github/workflows/deploy.yml", raiz), "utf8");
    expect(publicacao).toContain("--args=server/dist/tarefas/avisos-da-cobranca.js");
    expect(existsSync(new URL("server/src/tarefas/avisos-da-cobranca.ts", raiz))).toBe(true);
  });
});

describe("qual e-mail é devido agora (função pura)", () => {
  const falha = new Date("2026-11-10T15:00:00Z");
  const tranca = falha.getTime() + 3 * DIA;
  const atrasadaDesde = { status: "past_due", currentPeriodEnd: falha };

  it("atrasada: a falha antes do último dia; o 'antes de trancar' no último dia; nada depois de trancar", () => {
    expect(emailDevido(atrasadaDesde, new Date(falha.getTime() + 60_000))?.tipo).toBe("COBRANCA_FALHOU");
    expect(emailDevido(atrasadaDesde, new Date(tranca - ANTECEDENCIA_DO_AVISO_EM_MS - 1))?.tipo).toBe("COBRANCA_FALHOU");
    expect(emailDevido(atrasadaDesde, new Date(tranca - ANTECEDENCIA_DO_AVISO_EM_MS))?.tipo).toBe("ANTES_DE_TRANCAR");
    expect(emailDevido(atrasadaDesde, new Date(tranca - 1))?.tipo).toBe("ANTES_DE_TRANCAR");
    expect(emailDevido(atrasadaDesde, new Date(tranca))).toBeNull();
    // A referência é o instante da falha, e o dia em que tranca vai junto.
    expect(emailDevido(atrasadaDesde, falha)).toEqual({ tipo: "COBRANCA_FALHOU", referencia: falha.toISOString(), trancaEm: new Date(tranca) });
    expect(ANTECEDENCIA_DO_AVISO_EM_MS).toBe(DIA);
  });

  it("cancelada: o de cancelada só sem dias pagos; nenhum outro status, e nem a atrasada sem data", () => {
    expect(emailDevido({ status: "canceled", currentPeriodEnd: null })).toEqual({ tipo: "CANCELADA", referencia: "fim", trancaEm: null });
    expect(emailDevido({ status: "canceled", currentPeriodEnd: new Date(falha.getTime() - 1) }, falha)).toEqual({ tipo: "CANCELADA", referencia: "fim", trancaEm: null });
    // Com dias pagos (o cancelamento na hora, pelo painel): nada AINDA — deve quando o período acabar.
    expect(emailDevido({ status: "canceled", currentPeriodEnd: new Date(falha.getTime() + 10 * DIA) }, falha)).toBeNull();
    for (const status of ["active", "trialing", "incomplete", "incomplete_expired", "paused", "unpaid"]) {
      expect(emailDevido({ status, currentPeriodEnd: falha }, falha), status).toBeNull();
    }
    expect(emailDevido({ status: "past_due", currentPeriodEnd: null })).toBeNull();
  });

  it("a marca resolve o e-mail se foi enviada (ou consumida), ou se está pendente há menos que o prazo", () => {
    const devido = { tipo: "COBRANCA_FALHOU" as const, referencia: falha.toISOString(), trancaEm: new Date(tranca) };
    const agora = new Date();
    const enviada = { kind: "COBRANCA_FALHOU" as const, reference: falha.toISOString(), sentAt: agora, createdAt: new Date(agora.getTime() - DIA) };
    const pendenteRecente = { ...enviada, sentAt: null, createdAt: new Date(agora.getTime() - PRAZO_DA_MARCA_PENDENTE_EM_MS + 1000) };
    const pendenteVelha = { ...enviada, sentAt: null, createdAt: new Date(agora.getTime() - PRAZO_DA_MARCA_PENDENTE_EM_MS - 1000) };
    const deOutroEmail = { ...enviada, kind: "ANTES_DE_TRANCAR" as const };
    expect(marcaResolve([enviada], devido, agora)).toBe(true);
    expect(marcaResolve([pendenteRecente], devido, agora)).toBe(true);
    expect(marcaResolve([pendenteVelha], devido, agora)).toBe(false);
    expect(marcaResolve([deOutroEmail], devido, agora)).toBe(false);
    expect(marcaResolve([], devido, agora)).toBe(false);
  });

  it("o dia sai no horário de Brasília", () => {
    // 02:00 em UTC ainda é o dia anterior em Brasília (UTC−3).
    expect(diaNoEmail(new Date("2026-10-31T02:00:00Z"))).toBe("30/10/2026");
    expect(diaNoEmail(new Date("2026-10-31T03:00:00Z"))).toBe("31/10/2026");
  });
});
