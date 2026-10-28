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
import { ANTECEDENCIA_DO_AVISO_EM_MS, avisarSobreAAssinatura, emailDevido } from "../lib/avisos-da-assinatura.js";
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
const marcas = async (sub: string) => prisma.subscriptionEmail.findMany({ where: { subscription: { stripeSubscriptionId: sub } }, select: { kind: true, reference: true } });

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

  it("cancelada: o de cancelada; nenhum outro status, e nem a atrasada sem data", () => {
    expect(emailDevido({ status: "canceled", currentPeriodEnd: null })).toEqual({ tipo: "CANCELADA", referencia: "fim", trancaEm: null });
    for (const status of ["active", "trialing", "incomplete", "incomplete_expired", "paused", "unpaid"]) {
      expect(emailDevido({ status, currentPeriodEnd: falha }, falha), status).toBeNull();
    }
    expect(emailDevido({ status: "past_due", currentPeriodEnd: null })).toBeNull();
  });

  it("o dia sai no horário de Brasília", () => {
    // 02:00 em UTC ainda é o dia anterior em Brasília (UTC−3).
    expect(diaNoEmail(new Date("2026-10-31T02:00:00Z"))).toBe("30/10/2026");
    expect(diaNoEmail(new Date("2026-10-31T03:00:00Z"))).toBe("31/10/2026");
  });
});
