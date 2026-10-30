import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { pt } from "@jilson/core";
import type { Envio, PedidoDeEmail } from "../lib/email.js";
import type { ClienteNaStripe } from "../lib/stripe-limpeza.js";

// O envio e a Stripe na NOSSA fronteira: só o que iria à rede vira dublê; a regra, o banco e a trava são os de verdade.
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));
const lerClienteNaStripe = vi.fn<(id: string) => Promise<ClienteNaStripe | "nao-existe">>();
const cancelarPagamentoAberto = vi.fn<(id: string) => Promise<void>>();
const apagarClienteNaStripe = vi.fn<(id: string) => Promise<"apagado" | "nao-existe">>();
vi.mock("../lib/stripe-limpeza.js", () => ({
  lerClienteNaStripe: (id: string) => lerClienteNaStripe(id),
  cancelarPagamentoAberto: (id: string) => cancelarPagamentoAberto(id),
  apagarClienteNaStripe: (id: string) => apagarClienteNaStripe(id),
}));

import { prisma } from "../lib/prisma.js";
import { caminhoDoLink, codigoDoLink, idDoLink } from "../lib/links-do-email.js";
import { descadastrar, leadAtivo, registrarLead } from "../lib/leads.js";
import { ESPERA_DO_LEMBRETE_EM_MS, INTERVALO_DA_NAO_APAGADA_EM_MS, MARGEM_DA_ULTIMA_FICHA_EM_MS, oQueFazerComAFicha, pagouOuEstaPagando, podeApagar, PRAZO_DA_FICHA_EM_MS, PRAZO_DO_LEMBRETE_PENDENTE_EM_MS, PRAZO_PARA_APAGAR_EM_MS, rodadaDeQuemNaoTerminou } from "../lib/quem-nao-terminou.js";
import { montarLembrete } from "../views/email-do-lembrete.js";

// QUEM NÃO TERMINOU DE ASSINAR (etapa 4.7, passo 9 — decisões do operador, 29/10/2026). O que estes testes protegem:
//   - O LEMBRETE: 2 horas depois da última tentativa, UM por ficha; nunca para quem tem conta, nem para quem a Stripe
//     diz que pagou; quem marcou a caixa vira lead (nome e e-mail) e lê o link de descadastrar; quem não marcou lê o de
//     pedir as novidades; o envio que falha volta, e a marca presa (quem a tomou caiu) é retomada depois de 15 min;
//   - A LIMPEZA, 7 dias depois: APAGAR O CLIENTE DA STRIPE CANCELA AS ASSINATURAS ATIVAS DELE — só se apaga quem nunca
//     pagou nada; com pagamento, não apaga e alerta UMA vez (e confere de novo uma vez por dia); a Stripe antes da ficha;
//     a Stripe que falha deixa a ficha; a trava ocupada deixa a ficha para a próxima hora; a ficha com conta, nunca;
//   - OS LINKS: assinados pelo servidor — o de um tipo não abre o outro, e o adulterado não abre nada.

const S = `${Date.now()}`;
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const AGORA = new Date();
const AMBIENTE = ["STRIPE_SECRET_KEY", "BETTER_AUTH_URL"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
const SITE = "https://escola.teste";

let n = 0;
const novoEmail = () => `quem-nao-terminou-${++n}-${S}@teste.local`;
type DadosDaFicha = Partial<{
  nome: string | null;
  novidades: boolean;
  ultimaTentativaEm: Date;
  lembreteTomadoEm: Date | null;
  lembreteEnviadoEm: Date | null;
  naoApagadaEm: Date | null;
  userId: string | null;
  livemode: boolean;
  acquisitionSource: string | null;
  acquisitionCampaign: string | null;
}>;
const novaFicha = (dados: DadosDaFicha = {}) =>
  prisma.guestCheckout.create({ data: { id: randomUUID(), email: novoEmail(), stripeCustomerId: `cus_qnt_${S}_${++n}`, livemode: false, ultimaTentativaEm: new Date(AGORA.getTime() - 3 * HORA), ...dados } });
const ficha = (id: string) => prisma.guestCheckout.findUnique({ where: { id } });
const atras = (ms: number) => new Date(AGORA.getTime() - ms);
const enviadosPara = (email: string) => enviarEmail.mock.calls.map(([pedido]) => pedido).filter((pedido) => pedido.para === email);
const LIMPO: ClienteNaStripe = { assinaturas: ["incomplete_expired"], pagamentos: [{ id: "pi_cancelado", status: "canceled" }], completo: true };

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.BETTER_AUTH_URL = SITE;
});

beforeEach(() => {
  enviarEmail.mockReset().mockImplementation(async () => ({ enviado: true, id: "email_da_suite" }));
  lerClienteNaStripe.mockReset().mockResolvedValue(LIMPO);
  cancelarPagamentoAberto.mockReset().mockResolvedValue(undefined);
  apagarClienteNaStripe.mockReset().mockResolvedValue("apagado");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(async () => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.lead.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("a regra (função pura)", () => {
  const base = { userId: null, lembreteTomadoEm: null, lembreteEnviadoEm: null, naoApagadaEm: null };

  it("o lembrete: só depois de 2 horas, uma vez, e a marca presa é retomada depois de 15 minutos", () => {
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(ESPERA_DO_LEMBRETE_EM_MS - 1) }, AGORA)).toBe("nada");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(ESPERA_DO_LEMBRETE_EM_MS) }, AGORA)).toBe("lembrar");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(3 * HORA), lembreteEnviadoEm: atras(HORA) }, AGORA)).toBe("nada");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(3 * HORA), lembreteTomadoEm: atras(PRAZO_DO_LEMBRETE_PENDENTE_EM_MS - 1) }, AGORA)).toBe("nada");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(3 * HORA), lembreteTomadoEm: atras(PRAZO_DO_LEMBRETE_PENDENTE_EM_MS + 1) }, AGORA)).toBe("lembrar");
    expect([ESPERA_DO_LEMBRETE_EM_MS, PRAZO_DO_LEMBRETE_PENDENTE_EM_MS]).toEqual([2 * HORA, 15 * 60 * 1000]);
  });

  it("a limpeza: aos 7 dias (com ou sem lembrete); a não apagada só depois de um dia; a ficha com conta, nunca", () => {
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(PRAZO_DA_FICHA_EM_MS - 1), lembreteEnviadoEm: atras(DIA) }, AGORA)).toBe("nada");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(PRAZO_DA_FICHA_EM_MS), lembreteEnviadoEm: atras(DIA) }, AGORA)).toBe("apagar");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(PRAZO_DA_FICHA_EM_MS) }, AGORA)).toBe("apagar");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(8 * DIA), naoApagadaEm: atras(INTERVALO_DA_NAO_APAGADA_EM_MS - 1) }, AGORA)).toBe("nada");
    expect(oQueFazerComAFicha({ ...base, ultimaTentativaEm: atras(8 * DIA), naoApagadaEm: atras(INTERVALO_DA_NAO_APAGADA_EM_MS) }, AGORA)).toBe("apagar");
    for (const desde of [3 * HORA, 8 * DIA, 400 * DIA]) expect(oQueFazerComAFicha({ ...base, userId: "conta", ultimaTentativaEm: atras(desde) }, AGORA)).toBe("nada");
    expect(PRAZO_DA_FICHA_EM_MS).toBe(7 * DIA);
  });

  it("pagou, ou está pagando: uma assinatura que passou da incompleta, ou um pagamento pago (ou a caminho)", () => {
    const cliente = (assinaturas: string[], pagamentos: string[] = []): ClienteNaStripe => ({ assinaturas, pagamentos: pagamentos.map((status, i) => ({ id: `pi_${i}`, status })), completo: true });
    expect(pagouOuEstaPagando(cliente(["incomplete", "incomplete_expired"], ["requires_payment_method", "requires_action", "canceled"]))).toBe(false);
    for (const status of ["active", "past_due", "canceled", "trialing", "unpaid"]) expect(pagouOuEstaPagando(cliente([status])), status).toBe(true);
    for (const status of ["succeeded", "processing", "requires_capture"]) expect(pagouOuEstaPagando(cliente([], [status])), status).toBe(true);
  });

  it("pode apagar: só quem nunca pagou nada, com a lista inteira — e os pagamentos abertos são cancelados antes", () => {
    expect(podeApagar({ assinaturas: ["incomplete_expired"], pagamentos: [{ id: "pi_1", status: "canceled" }, { id: "pi_2", status: "requires_payment_method" }, { id: "pi_3", status: "requires_action" }], completo: true })).toEqual({ pode: true, aCancelar: ["pi_2", "pi_3"] });
    expect(podeApagar({ assinaturas: [], pagamentos: [], completo: true })).toEqual({ pode: true, aCancelar: [] });
    for (const status of ["incomplete", "active", "canceled", "past_due"]) expect(podeApagar({ assinaturas: ["incomplete_expired", status], pagamentos: [], completo: true }).pode, status).toBe(false);
    for (const status of ["succeeded", "processing", "requires_capture"]) expect(podeApagar({ assinaturas: [], pagamentos: [{ id: "pi_1", status }], completo: true }).pode, status).toBe(false);
    expect(podeApagar({ assinaturas: [], pagamentos: [], completo: false }).pode).toBe(false);
  });
});

describe("os links do e-mail", () => {
  it("o código prova o id, só para o tipo dele; o adulterado, o malformado e o de outro segredo não abrem nada", () => {
    const id = randomUUID();
    expect(idDoLink("novidades", codigoDoLink("novidades", id))).toBe(id);
    expect(idDoLink("descadastrar", codigoDoLink("descadastrar", id))).toBe(id);
    expect(idDoLink("descadastrar", codigoDoLink("novidades", id))).toBeNull();
    expect(caminhoDoLink("novidades", id)).toBe(`/novidades/${codigoDoLink("novidades", id)}`);
    const codigo = codigoDoLink("novidades", id);
    // O id e a assinatura, separados por uma barra — sem ponto (o portão do "Em breve" deixa passar endereço com ponto).
    expect(codigo).toMatch(/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{43}$/);
    const assinatura = codigo.slice(codigo.lastIndexOf("/") + 1);
    const trocada = `${assinatura[0] === "A" ? "B" : "A"}${assinatura.slice(1)}`;
    // A ÚLTIMA letra leva bits de sobra: trocá-la por uma de mesmo valor útil dá os mesmos bytes — e mesmo assim não abre.
    const ultima = assinatura.at(-1) ?? "A";
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const vizinha = alfabeto[alfabeto.indexOf(ultima) ^ 1] ?? "A";
    expect(idDoLink("novidades", `${id}/${assinatura.slice(0, -1)}${vizinha}`)).toBeNull();
    expect(idDoLink("novidades", `${id}/${trocada}`)).toBeNull();
    expect(idDoLink("novidades", `${randomUUID()}/${assinatura}`)).toBeNull();
    for (const malformado of ["", id, `${id}/`, `/${assinatura}`, `nao-e-uuid/${assinatura}`, `${id}/${assinatura}x`, `${id.toUpperCase()}/${assinatura}`, `${id}.${assinatura}`]) expect(idDoLink("novidades", malformado), malformado).toBeNull();
    const segredo = process.env.BETTER_AUTH_SECRET;
    try {
      process.env.BETTER_AUTH_SECRET = "outro-segredo-qualquer";
      expect(idDoLink("novidades", codigo)).toBeNull();
    } finally {
      process.env.BETTER_AUTH_SECRET = segredo;
    }
  });
});

describe("o lembrete, montado (função pura)", () => {
  const t = pt.app.email.lembrete;
  const site = (caminho: string) => `${SITE}${caminho}`;

  // SÓ TEXTO FIXO (decisão do operador, 30/10/2026, depois da revisão de segurança): nada do que o visitante digitou.
  it("quem NÃO marcou a caixa: só texto fixo, o botão para a tela de assinar, o link de pedir as novidades e o aviso dos 7 dias", () => {
    const mensagem = montarLembrete({ link: { tipo: "novidades", endereco: `${SITE}/novidades/x` } }, t, site);
    expect(mensagem).toEqual({
      assunto: t.assunto,
      titulo: t.titulo,
      paragrafos: [t.naoConcluida],
      botao: { texto: t.botao, endereco: `${SITE}/assinar` },
      depoisDoBotao: [t.querNovidades, { link: t.linkNovidades, endereco: `${SITE}/novidades/x` }, t.apagamos, t.naoFoiVoce],
    });
  });

  it("quem marcou (é lead): o link de descadastrar, sem o aviso dos 7 dias", () => {
    const mensagem = montarLembrete({ link: { tipo: "descadastrar", endereco: `${SITE}/descadastrar/x` } }, t, site);
    expect(mensagem.paragrafos).toEqual([t.naoConcluida]);
    expect(mensagem.depoisDoBotao).toEqual([t.eLead, { link: t.linkDescadastrar, endereco: `${SITE}/descadastrar/x` }, t.naoFoiVoce]);
  });
});

describe("o lembrete, na rodada de hora em hora", () => {
  it("antes de 2 horas, nada; depois, UM lembrete para o e-mail da ficha — com o link de pedir as novidades, que prova a ficha — e a rodada seguinte não repete", async () => {
    const cedo = await novaFicha({ ultimaTentativaEm: atras(ESPERA_DO_LEMBRETE_EM_MS - 60_000) });
    const devida = await novaFicha({ nome: "Bia Golpe" });
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(cedo.email)).toEqual([]);
    const [pedido] = enviadosPara(devida.email);
    expect(enviadosPara(devida.email)).toHaveLength(1);
    expect(pedido?.tipo).toBe("lembrete-da-assinatura");
    expect(pedido?.chave).toBe(`lembrete-da-assinatura/${devida.id}`);
    expect(pedido?.referencia).toBe(`ficha:${devida.id}`);
    // O nome digitado NÃO entra no e-mail (decisão do operador, 30/10/2026): ele servia a um golpe assinado pela escola.
    expect(pedido?.mensagem.paragrafos).toEqual([pt.app.email.lembrete.naoConcluida]);
    expect(JSON.stringify(pedido?.mensagem)).not.toContain("Bia");
    expect(JSON.stringify(pedido?.mensagem)).not.toContain("Golpe");
    const link = pedido?.mensagem.depoisDoBotao?.find((item) => typeof item !== "string");
    expect(typeof link === "object" ? link.link : null).toBe(pt.app.email.lembrete.linkNovidades);
    const codigo = typeof link === "object" ? link.endereco.replace(`${SITE}/novidades/`, "") : "";
    expect(idDoLink("novidades", codigo)).toBe(devida.id);
    expect(rodada.lembretes).toBeGreaterThanOrEqual(1);
    expect((await ficha(devida.id))?.lembreteEnviadoEm).not.toBeNull();
    // Quem não marcou a caixa não vira lead.
    expect(await prisma.lead.findUnique({ where: { email: devida.email } })).toBeNull();

    await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(devida.email)).toHaveLength(1);
  });

  it("quem marcou a caixa vira LEAD nessa hora (nome, e-mail e UTM — da caixa, sem a prova do e-mail) e lê o link de descadastrar, que prova o lead", async () => {
    const devida = await novaFicha({ nome: "Caio", novidades: true, acquisitionSource: "youtube", acquisitionCampaign: "video-1" });
    await rodadaDeQuemNaoTerminou(AGORA);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { email: devida.email } });
    expect([lead.nome, lead.origem, lead.consentimentoEm.toISOString(), lead.confirmadoEm, lead.descadastradoEm, lead.acquisitionSource, lead.acquisitionCampaign]).toEqual([
      "Caio",
      "CAIXA_AO_ASSINAR",
      devida.ultimaTentativaEm.toISOString(),
      null,
      null,
      "youtube",
      "video-1",
    ]);
    const link = enviadosPara(devida.email)[0]?.mensagem.depoisDoBotao?.find((item) => typeof item !== "string");
    expect(typeof link === "object" ? link.link : null).toBe(pt.app.email.lembrete.linkDescadastrar);
    expect(idDoLink("descadastrar", typeof link === "object" ? link.endereco.replace(`${SITE}/descadastrar/`, "") : "")).toBe(lead.id);
  });

  it("o e-mail que tem conta, e a ficha cuja Stripe diz que houve pagamento: sem lembrete — e a rodada não volta a elas", async () => {
    const comConta = await novaFicha();
    await prisma.user.create({ data: { id: `conta-qnt-${S}-${++n}`, email: comConta.email } });
    const pagou = await novaFicha();
    lerClienteNaStripe.mockImplementation(async (id) => (id === pagou.stripeCustomerId ? { assinaturas: ["active"], pagamentos: [], completo: true } : LIMPO));
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(comConta.email)).toEqual([]);
    expect(enviadosPara(pagou.email)).toEqual([]);
    expect((await ficha(comConta.id))?.lembreteEnviadoEm).not.toBeNull();
    expect((await ficha(pagou.id))?.lembreteEnviadoEm).not.toBeNull();
  });

  it("o envio que falha devolve a marca, e a rodada seguinte manda", async () => {
    const devida = await novaFicha();
    enviarEmail.mockImplementation(async (pedido) => (pedido.para === devida.email ? { enviado: false, motivo: "falhou" } : { enviado: true, id: "x" }));
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(rodada.falhas).toBeGreaterThanOrEqual(1);
    expect(await ficha(devida.id)).toMatchObject({ lembreteTomadoEm: null, lembreteEnviadoEm: null });
    enviarEmail.mockImplementation(async () => ({ enviado: true, id: "y" }));
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(devida.email)).toHaveLength(2);
    expect((await ficha(devida.id))?.lembreteEnviadoEm).not.toBeNull();
  });

  it("a marca presa (quem a tomou caiu): há menos de 15 minutos, ninguém manda; depois, a rodada retoma e manda", async () => {
    const recente = await novaFicha({ lembreteTomadoEm: atras(PRAZO_DO_LEMBRETE_PENDENTE_EM_MS - 60_000) });
    const antiga = await novaFicha({ lembreteTomadoEm: atras(PRAZO_DO_LEMBRETE_PENDENTE_EM_MS + 60_000) });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(recente.email)).toEqual([]);
    expect(enviadosPara(antiga.email)).toHaveLength(1);
  });
});

describe("a limpeza dos 7 dias", () => {
  const velha = (dados: DadosDaFicha = {}) => novaFicha({ ultimaTentativaEm: atras(8 * DIA), lembreteTomadoEm: atras(7 * DIA), lembreteEnviadoEm: atras(7 * DIA), ...dados });

  it("quem nunca pagou: os pagamentos abertos cancelados, o cliente apagado na Stripe e SÓ DEPOIS a ficha", async () => {
    const ficha8 = await velha();
    const ordem: string[] = [];
    lerClienteNaStripe.mockResolvedValue({ assinaturas: ["incomplete_expired"], pagamentos: [{ id: "pi_aberto", status: "requires_payment_method" }], completo: true });
    cancelarPagamentoAberto.mockImplementation(async (id) => void ordem.push(`cancelou ${id}`));
    apagarClienteNaStripe.mockImplementation(async (id) => {
      ordem.push(`apagou ${id}`);
      // A ficha ainda existe quando a Stripe apaga: se a Stripe falhar, ela fica para a próxima hora.
      ordem.push((await ficha(ficha8.id)) ? "a ficha ainda existe" : "a ficha já sumiu");
      return "apagado";
    });
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(rodada.apagadas).toBeGreaterThanOrEqual(1);
    expect(ordem).toEqual(["cancelou pi_aberto", `apagou ${ficha8.stripeCustomerId}`, "a ficha ainda existe"]);
    expect(await ficha(ficha8.id)).toBeNull();
  });

  it("o cliente que a Stripe já não conhece: a ficha sai, sem pedir para apagar de novo", async () => {
    const ficha8 = await velha();
    lerClienteNaStripe.mockResolvedValue("nao-existe");
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(apagarClienteNaStripe).not.toHaveBeenCalledWith(ficha8.stripeCustomerId);
    expect(await ficha(ficha8.id)).toBeNull();
  });

  it("COM PAGAMENTO: nada é apagado, o alerta sai UMA vez, e a ficha é conferida de novo só depois de um dia — sem alerta de novo", async () => {
    const ficha8 = await velha();
    lerClienteNaStripe.mockImplementation(async (id) => (id === ficha8.stripeCustomerId ? { assinaturas: ["active"], pagamentos: [{ id: "pi_pago", status: "succeeded" }], completo: true } : LIMPO));
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertasDela = () => alerta.mock.calls.filter(([linha]) => String(linha).includes(ficha8.id) && String(linha).startsWith("[stripe] limpeza"));
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(rodada.comPagamento).toBeGreaterThanOrEqual(1);
    expect(apagarClienteNaStripe).not.toHaveBeenCalledWith(ficha8.stripeCustomerId);
    expect(cancelarPagamentoAberto).not.toHaveBeenCalled();
    expect((await ficha(ficha8.id))?.naoApagadaEm?.toISOString()).toBe(AGORA.toISOString());
    expect(alertasDela()).toHaveLength(1);

    // Na mesma hora (ou no mesmo dia), nem vai à Stripe.
    lerClienteNaStripe.mockClear();
    await rodadaDeQuemNaoTerminou(new Date(AGORA.getTime() + HORA));
    expect(lerClienteNaStripe).not.toHaveBeenCalledWith(ficha8.stripeCustomerId);
    // Um dia depois, confere de novo — sem outro alerta.
    await rodadaDeQuemNaoTerminou(new Date(AGORA.getTime() + DIA + HORA));
    expect(lerClienteNaStripe).toHaveBeenCalledWith(ficha8.stripeCustomerId);
    expect(alertasDela()).toHaveLength(1);
    expect(await ficha(ficha8.id)).not.toBeNull();
  });

  it("a Stripe falhou ao apagar: a ficha FICA (a próxima hora tenta), e a falha conta", async () => {
    const ficha8 = await velha();
    apagarClienteNaStripe.mockImplementation(async (id) => {
      if (id === ficha8.stripeCustomerId) throw new Error("[stripe] a exclusão do cliente falhou: api_error, status 500");
      return "apagado";
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(rodada.falhas).toBeGreaterThanOrEqual(1);
    expect(await ficha(ficha8.id)).not.toBeNull();
  });

  it("quem marcou a caixa vira lead na limpeza, se o lembrete não saiu — e a ficha some", async () => {
    const ficha8 = await novaFicha({ ultimaTentativaEm: atras(8 * DIA), nome: "Duda", novidades: true });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(await ficha(ficha8.id)).toBeNull();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { email: ficha8.email } });
    expect([lead.nome, lead.origem]).toEqual(["Duda", "CAIXA_AO_ASSINAR"]);
    // E não houve lembrete de uma tentativa de 8 dias atrás.
    expect(enviadosPara(ficha8.email)).toEqual([]);
  });

  it("o visitante voltou agora (a trava do e-mail ocupada): a ficha fica para a próxima hora", async () => {
    const ficha8 = await velha();
    let soltar!: () => void;
    let travou!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const travada = new Promise<void>((ok) => (travou = ok));
    const outro = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assinar-email:${ficha8.email}`}))`;
      travou();
      await segura;
    });
    await travada;
    try {
      const rodada = await rodadaDeQuemNaoTerminou(AGORA);
      expect(rodada.ocupadas).toBeGreaterThanOrEqual(1);
      expect(await ficha(ficha8.id)).not.toBeNull();
      expect(apagarClienteNaStripe).not.toHaveBeenCalledWith(ficha8.stripeCustomerId);
    } finally {
      soltar();
      await outro;
    }
  });

  it("a ficha de OUTRO MODO da Stripe (a de verdade com a chave de teste): não é apagada", async () => {
    const ficha8 = await velha({ livemode: true });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(rodada.outroModo).toBeGreaterThanOrEqual(1);
    expect(lerClienteNaStripe).not.toHaveBeenCalledWith(ficha8.stripeCustomerId);
    expect(await ficha(ficha8.id)).not.toBeNull();
  });

  it("a ficha que virou conta nunca é tocada, por mais velha que seja", async () => {
    const conta = await prisma.user.create({ data: { id: `conta-qnt-${S}-${++n}`, email: `dona-${n}-${S}@teste.local` } });
    const ficha8 = await velha({ userId: conta.id });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(await ficha(ficha8.id)).not.toBeNull();
    expect(lerClienteNaStripe).not.toHaveBeenCalledWith(ficha8.stripeCustomerId);
  });
});

describe("o prazo da rodada e o job", () => {
  it("sem prazo, nenhuma ficha é tocada: ficam todas para a próxima hora", async () => {
    const devida = await novaFicha();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const rodada = await rodadaDeQuemNaoTerminou(AGORA, 0);
    expect(rodada.adiadas).toBeGreaterThanOrEqual(1);
    expect(enviadosPara(devida.email)).toEqual([]);
  });

  it("o job de hora em hora roda a rodada de quem não terminou de assinar", () => {
    const job = readFileSync(new URL("../tarefas/avisos-da-cobranca.ts", import.meta.url), "utf8");
    expect(job).toContain("rodadaDeQuemNaoTerminou(");
    // A margem do job cobre a limpeza de uma ficha inteira (o tempo da transação dela): começada no fim do prazo, ela
    // termina antes dos 5 minutos do job — e o alerta único dela não se perde (P2 da revisão do passo 9).
    expect(MARGEM_DA_ULTIMA_FICHA_EM_MS).toBeGreaterThanOrEqual(PRAZO_PARA_APAGAR_EM_MS + 30_000);
  });
});

describe("o lead (registrar e descadastrar)", () => {
  const consentimento = (email: string, dados: Partial<Parameters<typeof registrarLead>[0]> = {}) => ({
    email,
    nome: null,
    origem: "CAIXA_AO_ASSINAR" as const,
    consentimentoEm: AGORA,
    confirmadoEm: null,
    acquisitionSource: null,
    acquisitionCampaign: null,
    ...dados,
  });

  it("um por e-mail, em minúsculas: o que já existe ganha o nome e a prova do e-mail que faltavam, e não perde o que tinha", async () => {
    const email = novoEmail();
    const primeiro = await registrarLead(consentimento(email.toUpperCase()));
    expect(primeiro.ativo).toBe(true);
    const depois = await registrarLead(consentimento(email, { nome: "Eva", origem: "LEMBRETE", confirmadoEm: AGORA, acquisitionSource: "youtube" }));
    expect(depois.id).toBe(primeiro.id);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { email } });
    expect([lead.nome, lead.origem, lead.confirmadoEm?.toISOString(), lead.acquisitionSource]).toEqual(["Eva", "CAIXA_AO_ASSINAR", AGORA.toISOString(), null]);
    await registrarLead(consentimento(email, { nome: "Outro Nome" }));
    expect((await prisma.lead.findUniqueOrThrow({ where: { email } })).nome).toBe("Eva");
  });

  it("descadastrar vale para o E-MAIL: o lead para de receber e a caixa da conta com o mesmo e-mail desliga; repetir não muda a data", async () => {
    const email = novoEmail();
    const { id } = await registrarLead(consentimento(email));
    await prisma.user.create({ data: { id: `conta-qnt-${S}-${++n}`, email, marketingConsent: true } });
    expect(await descadastrar(id, AGORA)).toBe(true);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id } })).descadastradoEm?.toISOString()).toBe(AGORA.toISOString());
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).marketingConsent).toBe(false);
    expect(await leadAtivo(email)).toBeNull();
    await descadastrar(id, new Date(AGORA.getTime() + HORA));
    expect((await prisma.lead.findUniqueOrThrow({ where: { id } })).descadastradoEm?.toISOString()).toBe(AGORA.toISOString());
    expect(await descadastrar(randomUUID())).toBe(false);
  });

  // P1 DA REVISÃO DE SEGURANÇA DO PASSO 9: a caixa marcada não prova a caixa de e-mail — com ela, quem soubesse o e-mail de
  // alguém que se descadastrou o poria de volta na lista. Só o clique num link que a escola mandou (confirmado) reativa.
  it("o descadastrado só volta com um consentimento DEPOIS do descadastro e que PROVE A CAIXA — a caixa marcada, nem depois, não desfaz o 'não quero mais'", async () => {
    const email = novoEmail();
    const { id } = await registrarLead(consentimento(email, { consentimentoEm: atras(2 * DIA) }));
    await descadastrar(id, atras(DIA));
    expect((await registrarLead(consentimento(email, { consentimentoEm: atras(2 * DIA) }))).ativo).toBe(false);
    expect((await registrarLead(consentimento(email, { consentimentoEm: AGORA }))).ativo).toBe(false);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id } })).descadastradoEm?.toISOString()).toBe(atras(DIA).toISOString());
    const volta = await registrarLead(consentimento(email, { origem: "LEMBRETE", consentimentoEm: AGORA, confirmadoEm: AGORA }));
    expect(volta).toEqual({ id, ativo: true });
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id } });
    expect([lead.descadastradoEm, lead.origem, lead.consentimentoEm.toISOString(), lead.confirmadoEm?.toISOString()]).toEqual([null, "LEMBRETE", AGORA.toISOString(), AGORA.toISOString()]);
  });
});

// OS ACHADOS DA REVISÃO DE SEGURANÇA DO PASSO 9 (30/10/2026): a releitura da ficha (quem voltou no meio não recebe o
// lembrete nem tem nada apagado), o prazo da limpeza, o descadastrado que marca a caixa e a limpeza atrasada.
describe("a revisão de segurança do passo 9", () => {
  const velhaDe = (dias: number) => novaFicha({ ultimaTentativaEm: atras(dias * DIA), lembreteTomadoEm: atras((dias - 1) * DIA), lembreteEnviadoEm: atras((dias - 1) * DIA) });

  it("quem VOLTOU entre a lista da rodada e o lembrete (outra tentativa) não recebe o lembrete — nem vira lead", async () => {
    const antes = await novaFicha({ ultimaTentativaEm: atras(6 * HORA) });
    const voltou = await novaFicha({ ultimaTentativaEm: atras(5 * HORA), novidades: true });
    lerClienteNaStripe.mockImplementation(async (id) => {
      if (id === antes.stripeCustomerId) await prisma.guestCheckout.update({ where: { id: voltou.id }, data: { ultimaTentativaEm: new Date() } });
      return LIMPO;
    });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(antes.email)).toHaveLength(1);
    expect(enviadosPara(voltou.email)).toEqual([]);
    expect(await prisma.lead.findUnique({ where: { email: voltou.email } })).toBeNull();
  });

  it("quem voltou entre a releitura e a marca também não recebe: a marca exige a MESMA última tentativa", async () => {
    const voltou = await novaFicha({ ultimaTentativaEm: atras(5 * HORA) });
    lerClienteNaStripe.mockImplementation(async (id) => {
      if (id === voltou.stripeCustomerId) await prisma.guestCheckout.update({ where: { id: voltou.id }, data: { ultimaTentativaEm: new Date() } });
      return LIMPO;
    });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(enviadosPara(voltou.email)).toEqual([]);
    expect((await ficha(voltou.id))?.lembreteTomadoEm).toBeNull();
  });

  it("a limpeza: quem VOLTOU entre a lista da rodada e a trava não tem nada apagado — nem a ficha, nem o cliente da Stripe", async () => {
    const antes = await velhaDe(10);
    const voltou = await velhaDe(9);
    lerClienteNaStripe.mockImplementation(async (id) => {
      if (id === antes.stripeCustomerId) await prisma.guestCheckout.update({ where: { id: voltou.id }, data: { ultimaTentativaEm: new Date() } });
      return LIMPO;
    });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect(await ficha(antes.id)).toBeNull();
    expect(await ficha(voltou.id)).not.toBeNull();
    expect(lerClienteNaStripe).not.toHaveBeenCalledWith(voltou.stripeCustomerId);
    expect(apagarClienteNaStripe).not.toHaveBeenCalledWith(voltou.stripeCustomerId);
  });

  it("a limpeza que passou do prazo dela (a Stripe lenta) NÃO apaga o cliente: fica para a próxima hora", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const lenta = await velhaDe(9);
    lerClienteNaStripe.mockImplementation(async (id) => {
      if (id === lenta.stripeCustomerId) vi.setSystemTime(Date.now() + PRAZO_PARA_APAGAR_EM_MS + 1000);
      return LIMPO;
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const rodada = await rodadaDeQuemNaoTerminou(AGORA);
    expect(rodada.adiadas).toBeGreaterThanOrEqual(1);
    expect(apagarClienteNaStripe).not.toHaveBeenCalledWith(lenta.stripeCustomerId);
    expect(await ficha(lenta.id)).not.toBeNull();
    expect(PRAZO_PARA_APAGAR_EM_MS).toBe(90_000);
  });

  it("quem se descadastrou e depois marcou a caixa NÃO volta à lista pelo lembrete: o lembrete traz o link de pedir as novidades", async () => {
    const email = novoEmail();
    const lead = await prisma.lead.create({ data: { id: randomUUID(), email, origem: "CAIXA_AO_ASSINAR", consentimentoEm: atras(3 * DIA), descadastradoEm: atras(2 * DIA) } });
    const f = await prisma.guestCheckout.create({ data: { id: randomUUID(), email, stripeCustomerId: `cus_qnt_${S}_${++n}`, livemode: false, novidades: true, ultimaTentativaEm: atras(3 * HORA) } });
    await rodadaDeQuemNaoTerminou(AGORA);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).descadastradoEm).not.toBeNull();
    const link = enviadosPara(email)[0]?.mensagem.depoisDoBotao?.find((item) => typeof item !== "string");
    expect(typeof link === "object" ? link.link : null).toBe(pt.app.email.lembrete.linkNovidades);
    expect(idDoLink("novidades", typeof link === "object" ? link.endereco.replace(`${SITE}/novidades/`, "") : "")).toBe(f.id);
  });

  it("uma vez por dia (9h no Brasil), a ficha que passou de 8 dias sem a limpeza vira alerta; fora dessa hora, não", async () => {
    const dozeHoras = new Date(AGORA);
    dozeHoras.setUTCHours(12, 30, 0, 0);
    const presa = await novaFicha({ ultimaTentativaEm: new Date(dozeHoras.getTime() - 9 * DIA), lembreteTomadoEm: new Date(dozeHoras.getTime() - 8 * DIA), lembreteEnviadoEm: new Date(dozeHoras.getTime() - 8 * DIA) });
    apagarClienteNaStripe.mockImplementation(async (id) => {
      if (id === presa.stripeCustomerId) throw new Error("[stripe] a exclusão do cliente falhou: api_error, status 500");
      return "apagado";
    });
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const avisoDeAtraso = () => alerta.mock.calls.filter(([linha]) => String(linha).includes("passaram de 8 dias sem a limpeza"));
    const r1 = await rodadaDeQuemNaoTerminou(dozeHoras);
    expect(r1.atrasadas).toBeGreaterThanOrEqual(1);
    expect(avisoDeAtraso()).toHaveLength(1);
    alerta.mockClear();
    const r2 = await rodadaDeQuemNaoTerminou(new Date(dozeHoras.getTime() + HORA));
    expect(r2.atrasadas).toBe(0);
    expect(avisoDeAtraso()).toEqual([]);
  });
});
