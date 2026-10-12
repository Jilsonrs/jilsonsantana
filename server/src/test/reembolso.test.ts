import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { DetalhesDaAssinatura, MotivoDado } from "../lib/stripe-assinatura.js";
import type { DonoDaDevolucao, OQueFoiPago, Pagamento } from "../lib/stripe-reembolso.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. A regra (de quem é a assinatura,
// o prazo, quanto volta, a ordem de encerrar e devolver), a trava e a sincronia do espelho rodam
// de verdade, contra o banco.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const buscarProximaCobranca = vi.fn<(id: string) => Promise<{ centavos: number; moeda: string } | null>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  buscarProximaCobranca: (id: string) => buscarProximaCobranca(id),
}));
const buscarOQueFoiPago = vi.fn<(id: string) => Promise<OQueFoiPago>>();
const cancelarNaHora = vi.fn<(id: string, dado: MotivoDado) => Promise<void>>();
const devolver = vi.fn<(pagamento: Pagamento, dono: DonoDaDevolucao) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  buscarOQueFoiPago: (id: string) => buscarOQueFoiPago(id),
  cancelarNaHora: (id: string, dado: MotivoDado) => cancelarNaHora(id, dado),
  devolver: (pagamento: Pagamento, dono: DonoDaDevolucao) => devolver(pagamento, dono),
}));
// A troca de plano que ficou esperando a confirmação do banco é anulada antes de encerrar.
const anularFatura = vi.fn<(faturaId: string) => Promise<"anulada" | "paga">>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  anularFatura: (faturaId: string) => anularFatura(faturaId),
}));
// A busca que a SINCRONIA faz na Stripe, depois da operação.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { noPrazoDoReembolso, prazoDoReembolso } from "../lib/minha-assinatura.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// O REEMBOLSO (Fase 4, etapa 4.6, sessão b — billing.md → Reembolso). É DINHEIRO SAINDO e acesso
// sendo cortado. O que estes testes protegem:
//   - nada acontece sem login; a assinatura é SEMPRE a da conta da sessão, e o corpo leva só o
//     motivo: quanto devolver e de qual assinatura, quem sabe é o servidor;
//   - só DENTRO DO PRAZO, contado do primeiro dia da assinatura e conferido no servidor na hora
//     da ação — de novo com a trava;
//   - devolve TUDO o que foi pago naquela assinatura (as duas cobranças de quem trocou de plano),
//     e só o que FALTA voltar; a cortesia não tem o que devolver;
//   - o acesso termina NA HORA, e a pessoa CONTINUA LOGADA (decisão do operador, 11/10/2026);
//   - a ordem é encerrar e depois devolver; se a devolução falha, alguém é avisado, a pessoa
//     segue com o acesso do que pagou e pode repetir;
//   - a Stripe fora do ar é falha, nunca "dinheiro devolvido".

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const EM_28_DIAS = new Date(Date.now() + 28 * DIA);
const HA_2_DIAS = new Date(Date.now() - 2 * DIA);
const HA_8_DIAS = new Date(Date.now() - 8 * DIA);
const SUB = `sub_${S}_do_member`;
const CLIENTE = `cus_${S}_do_member`;
const outro = `outra-conta-reembolso-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let member: string[] = [];
let memberId = "";

const reembolsar = (cookies: string[] = [], corpo?: object) => {
  const pedido = request(servidor).post("/api/billing/minha-assinatura/reembolso").set("Cookie", cookies);
  return corpo === undefined ? pedido : pedido.send(corpo);
};
const ler = () => request(servidor).get("/api/billing/minha-assinatura").set("Cookie", member);
const situacao = () => request(servidor).get("/api/billing/assinatura").set("Cookie", member);
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
const espelho = () => prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } });
const comEspelho = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { status, currentPeriodEnd } });

/** O que a "Stripe" diz: os detalhes da assinatura, o que a sincronia lê e o que foi pago. */
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};
let pago: OQueFoiPago = { moeda: null, pagamentos: [] };
const UMA_COBRANCA = (): OQueFoiPago => ({ moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }] });
/**
 * Como na Stripe e no `faturaDevolvida` DE VERDADE: o período deixa de contar quando a cobrança da
 * ÚLTIMA fatura volta por inteiro — e não quando tudo voltou (achado da revisão de segurança,
 * 11/10/2026: o dublê antigo era mais bonzinho que o código). As cobranças vêm da mais antiga
 * para a mais nova, como `buscarOQueFoiPago` as entrega: a última da lista é a da última fatura.
 */
const aUltimaVoltou = () => {
  const ultima = pago.pagamentos[pago.pagamentos.length - 1];
  return ultima !== undefined && ultima.devolvido >= ultima.centavos;
};
async function entrar(): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}

async function comAAssinaturaOcupada(enquanto: () => Promise<void>): Promise<void> {
  let soltar: () => void = () => {};
  let travou: () => void = () => {};
  const comATrava = new Promise<void>((resolve) => (travou = resolve));
  const segurando = prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SUB}))`;
      travou();
      await new Promise<void>((resolve) => (soltar = resolve));
    },
    { timeout: 20_000 },
  );
  await comATrava;
  try {
    await enquanto();
  } finally {
    soltar();
    await segurando;
  }
}

beforeAll(async () => {
  member = await entrar();
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
  await prisma.user.create({ data: { id: outro, email: `${outro}@teste.local` } });
});

beforeEach(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  // A assinatura de mentira do seed sai de cena: a do teste é uma que a "Stripe" conhece —
  // mensal, começada há 2 dias (dentro do prazo), com uma cobrança de R$ 99,90.
  await doSeed("canceled", PASSADO);
  await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_28_DIAS, stripeSubscriptionId: SUB, stripeCustomerId: CLIENTE } });
  detalhes = {};
  naStripe = {};
  pago = UMA_COBRANCA();
  buscarDetalhes.mockReset().mockImplementation(async (id) => {
    if (id !== SUB) throw new AssinaturaNaoEncontrada(id);
    return { id, status: "active", pagoAte: EM_28_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_28_DIAS, comecouEm: HA_2_DIAS, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes };
  });
  buscarProximaCobranca.mockReset().mockResolvedValue({ centavos: 9990, moeda: "brl" });
  buscarOQueFoiPago.mockReset().mockImplementation(async () => ({ moeda: pago.moeda, pagamentos: pago.pagamentos.map((p) => ({ ...p })) }));
  // Como na Stripe: encerrada, a assinatura é `canceled`; devolvido TUDO, o período deixa de estar pago.
  cancelarNaHora.mockReset().mockImplementation(async () => {
    detalhes = { ...detalhes, status: "canceled" };
    naStripe = { ...naStripe, status: "canceled" };
  });
  devolver.mockReset().mockImplementation(async (pagamento) => {
    for (const p of pago.pagamentos) if (p.pagamentoId === pagamento.pagamentoId) p.devolvido = p.centavos;
    if (aUltimaVoltou()) naStripe = { ...naStripe, pagoAte: HA_2_DIAS };
  });
  anularFatura.mockReset().mockResolvedValue("anulada");
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_28_DIAS, clienteId: CLIENTE, userId: memberId, livemode: false, ...naStripe }));
});

afterEach(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await doSeed("active", FUTURO);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: outro } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

const nadaMudouNaStripe = () => {
  expect(cancelarNaHora).not.toHaveBeenCalled();
  expect(devolver).not.toHaveBeenCalled();
};

describe("o prazo do reembolso", () => {
  const inicio = new Date("2026-10-01T12:00:00Z");

  it("conta do PRIMEIRO DIA da assinatura: 7 dias, com o último instante ainda valendo", () => {
    expect(prazoDoReembolso({ comecouEm: inicio })?.toISOString()).toBe("2026-10-08T12:00:00.000Z");
    expect(noPrazoDoReembolso({ comecouEm: inicio }, new Date("2026-10-08T12:00:00Z"))).toBe(true);
    expect(noPrazoDoReembolso({ comecouEm: inicio }, new Date("2026-10-08T12:00:01Z"))).toBe(false);
    expect(noPrazoDoReembolso({ comecouEm: inicio }, new Date("2026-10-01T12:00:00Z"))).toBe(true);
  });

  it("sem a data de início: fora do prazo — na dúvida, o dinheiro não sai", () => {
    expect(prazoDoReembolso({ comecouEm: null })).toBeNull();
    expect(noPrazoDoReembolso({ comecouEm: null })).toBe(false);
  });
});

describe("POST /api/billing/minha-assinatura/reembolso — quem entra", () => {
  it("sem login: 401, e a Stripe nem é chamada", async () => {
    expect((await reembolsar([], {})).status).toBe(401);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  it("abrir o endereço (GET) não devolve nada", async () => {
    await request(servidor).get("/api/billing/minha-assinatura/reembolso").set("Cookie", member);
    nadaMudouNaStripe();
  });

  it("sem a chave da Stripe: 503, sem chamar nada; e a resposta nunca fica em cache", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await reembolsar(member, {});
    expect([res.status, res.headers["cache-control"]]).toEqual([503, "private, no-store"]);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  it("motivo fora da lista: 400, e nada vai à Stripe", async () => {
    expect((await reembolsar(member, { motivo: "inventado" })).status).toBe(400);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });
});

describe("POST /api/billing/minha-assinatura/reembolso — dentro do prazo", () => {
  it("encerra a assinatura DESTA conta na hora, devolve o que foi pago e responde quanto voltou", async () => {
    const res = await reembolsar(member, { motivo: "caro", comentario: " não era o que eu esperava " });
    expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl" }]);
    expect(cancelarNaHora.mock.calls).toEqual([[SUB, { motivo: "caro", comentario: "não era o que eu esperava" }]]);
    expect(devolver.mock.calls).toEqual([[{ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, { userId: memberId, assinaturaId: SUB }]]);
  });

  it("a ordem: ENCERRA, depois DEVOLVE, e só então o espelho é acertado", async () => {
    await reembolsar(member, {});
    const [encerrou, devolveu, sincronizou] = [cancelarNaHora, devolver, buscarAssinatura].map((dublê) => dublê.mock.invocationCallOrder[0] ?? 0);
    expect(encerrou).toBeLessThan(devolveu);
    expect(devolveu).toBeLessThan(sincronizou);
  });

  it("o acesso termina NA HORA — e a pessoa CONTINUA LOGADA, com 'Reativar assinatura'", async () => {
    expect((await situacao()).body).toMatchObject({ temAcesso: true });
    expect((await reembolsar(member, {})).status).toBe(200);
    // O período devolvido deixou de contar: o espelho está encerrado e pago só até o começo.
    expect([(await espelho()).status, (await espelho()).currentPeriodEnd?.getTime()]).toEqual(["canceled", HA_2_DIAS.getTime()]);
    // O MESMO cookie continua valendo (a sessão não caiu), e o gate já responde que não há acesso.
    const depois = await situacao();
    expect([depois.status, depois.body]).toEqual([200, { temAcesso: false, reativar: true, atrasada: false }]);
    expect(await prisma.session.count({ where: { userId: memberId } })).toBeGreaterThan(0);
  });

  it("o corpo não escolhe nada: valor, assinatura e pagamento de OUTRA pessoa são ignorados", async () => {
    const alheia = `sub_${S}_alheia`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_28_DIAS, stripeSubscriptionId: alheia, stripeCustomerId: "cus_alheio" } });
    const res = await reembolsar(member, { centavos: 99999999, amount: 99999999, assinaturaId: alheia, id: alheia, pagamentoId: "pi_alheio", payment_intent: "pi_alheio", userId: outro });
    expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl" }]);
    expect(cancelarNaHora.mock.calls.map(([id]) => id)).toEqual([SUB]);
    expect(devolver.mock.calls.map(([pagamento, dono]) => [pagamento.pagamentoId, dono.assinaturaId, dono.userId])).toEqual([["pi_1", SUB, memberId]]);
    expect(buscarOQueFoiPago.mock.calls.flat()).not.toContain(alheia);
  });

  it("quem trocou de plano no prazo recebe as DUAS cobranças, da mais antiga para a mais nova — e a resposta é a soma", async () => {
    pago = { moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 0 }, { pagamentoId: "pi_da_troca", centavos: 89800, devolvido: 0 }] };
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([200, { centavos: 99790, moeda: "brl" }]);
    expect(devolver.mock.calls.map(([pagamento]) => pagamento.pagamentoId)).toEqual(["pi_1", "pi_da_troca"]);
    expect((await situacao()).body).toMatchObject({ temAcesso: false });
  });

  it("com uma troca de plano esperando a confirmação do banco: a fatura dela é ANULADA antes de encerrar — não pode ser paga depois do reembolso", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca" };
    expect((await reembolsar(member, {})).status).toBe(200);
    expect(anularFatura.mock.calls).toEqual([["in_da_troca"]]);
    const [anulou, leuOPago, encerrou] = [anularFatura, buscarOQueFoiPago, cancelarNaHora].map((dublê) => dublê.mock.invocationCallOrder[0] ?? 0);
    expect(anulou).toBeLessThan(encerrou);
    // O que foi pago se lê DEPOIS de anular: se a troca se completou no mesmo instante, a cobrança dela entra na devolução.
    expect(anulou).toBeLessThan(leuOPago);
  });

  it("a assinatura comum (sem troca pendente): nenhuma fatura é anulada", async () => {
    expect((await reembolsar(member, {})).status).toBe(200);
    expect(anularFatura).not.toHaveBeenCalled();
  });

  it("parte já tinha voltado: a resposta é só o que FALTAVA", async () => {
    pago = { moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 1000 }] };
    const res = await reembolsar(member, {});
    expect(res.body).toEqual({ centavos: 8990, moeda: "brl" });
    expect(devolver.mock.calls[0]?.[0]).toEqual({ pagamentoId: "pi_1", centavos: 9990, devolvido: 1000 });
  });

  it("com a renovação já parada: o reembolso continua valendo, e encerra na hora", async () => {
    detalhes = { acabaEm: EM_28_DIAS, acabaNoFimDoPeriodo: true };
    expect((await reembolsar(member, {})).status).toBe(200);
    expect(cancelarNaHora).toHaveBeenCalledTimes(1);
    expect((await situacao()).body).toMatchObject({ temAcesso: false });
  });

  it("o comentário é texto livre da pessoa: NUNCA vai para o registro", async () => {
    const linhas: unknown[] = [];
    const espioes = (["info", "warn", "error", "log"] as const).map((nivel) => vi.spyOn(console, nivel).mockImplementation((...args: unknown[]) => void linhas.push(...args)));
    try {
      expect((await reembolsar(member, { motivo: "outro", comentario: "a Marina, minha sócia, não aprovou" })).status).toBe(200);
    } finally {
      espioes.forEach((espiao) => espiao.mockRestore());
    }
    const registro = linhas.join(" ");
    expect(registro).toContain(`reembolso: conta ${memberId}, assinatura ${SUB}, 9990 centavos (brl) devolvidos, motivo outro`);
    expect(registro).not.toContain("Marina");
  });
});

describe("POST /api/billing/minha-assinatura/reembolso — quando não devolve", () => {
  it("fora do prazo (a assinatura começou há 8 dias): 409, nada é encerrado nem devolvido — e fica o aviso", async () => {
    detalhes = { comecouEm: HA_8_DIAS };
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([409, { error: "ForaDoPrazo" }]);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`reembolso recusado: a assinatura ${SUB} (conta ${memberId}) está fora do prazo`);
    } finally {
      aviso.mockRestore();
    }
    expect(buscarOQueFoiPago).not.toHaveBeenCalled();
    nadaMudouNaStripe();
    expect((await situacao()).body).toMatchObject({ temAcesso: true });
  });

  it("o prazo venceu entre o clique e a trava: vale o de AGORA — 409, nada é encerrado", async () => {
    // A primeira leitura (achar a assinatura da conta) ainda está no prazo; a segunda, com a trava, não.
    buscarDetalhes.mockImplementationOnce(async (id) => ({ id, status: "active", pagoAte: EM_28_DIAS, plano: "mensal", preco: null, fimDoPeriodo: EM_28_DIAS, comecouEm: HA_2_DIAS, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null }));
    detalhes = { comecouEm: HA_8_DIAS };
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([409, { error: "ForaDoPrazo" }]);
    expect(buscarDetalhes).toHaveBeenCalledTimes(2);
    nadaMudouNaStripe();
  });

  it("sem a data de início: fora do prazo (na dúvida, o dinheiro não sai)", async () => {
    detalhes = { comecouEm: null };
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await reembolsar(member, {})).body).toEqual({ error: "ForaDoPrazo" });
    } finally {
      aviso.mockRestore();
    }
    nadaMudouNaStripe();
  });

  it("assinatura de cortesia (nada foi pago): 409 — e a assinatura NÃO é encerrada", async () => {
    pago = { moeda: null, pagamentos: [] };
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([409, { error: "NadaADevolver" }]);
    nadaMudouNaStripe();
    expect((await situacao()).body).toMatchObject({ temAcesso: true });
  });

  it("tudo já voltou: 409, sem encerrar nem devolver de novo", async () => {
    pago = { moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 9990 }] };
    expect((await reembolsar(member, {})).body).toEqual({ error: "NadaADevolver" });
    nadaMudouNaStripe();
  });

  it("a tentativa de assinar que nunca se completou: 409 — ela nem é olhada na Stripe (só as ENCERRADAS são)", async () => {
    await comEspelho("incomplete_expired", PASSADO);
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    // A encerrada de mentira do seed é olhada (e a Stripe não a conhece); a incompleta, não.
    expect(buscarDetalhes.mock.calls.flat()).toEqual([ASSINATURA_DE_TESTE]);
    nadaMudouNaStripe();
  });

  it("sem acesso, só se olham as ENCERRADAS mais recentes — três, no máximo", async () => {
    await comEspelho("canceled", PASSADO);
    for (const n of [1, 2, 3]) await prisma.subscription.create({ data: { ownerUserId: memberId, status: "canceled", currentPeriodEnd: PASSADO, stripeSubscriptionId: `sub_${S}_velha_${n}`, stripeCustomerId: CLIENTE } });
    expect((await reembolsar(member, {})).body).toEqual({ error: "SemAssinatura" });
    // As três mais novas (as recém-criadas); a do teste e a do seed, mais antigas, ficam de fora.
    expect(buscarDetalhes.mock.calls.flat()).toEqual([`sub_${S}_velha_3`, `sub_${S}_velha_2`, `sub_${S}_velha_1`]);
    nadaMudouNaStripe();
  });

  it("assinatura encerrada, sem acesso e FORA do prazo (quem saiu há tempo): 409 — nada é devolvido", async () => {
    await comEspelho("canceled", PASSADO);
    detalhes = { status: "canceled", pagoAte: PASSADO, comecouEm: HA_8_DIAS };
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    expect(buscarOQueFoiPago).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  it("a encerrada que a Stripe diz ser de OUTRA conta nunca é reembolsada por uma linha errada do espelho — e alguém é avisado", async () => {
    await comEspelho("canceled", PASSADO);
    detalhes = { status: "canceled", pagoAte: PASSADO, userId: outro };
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await reembolsar(member, {})).body).toEqual({ error: "SemAssinatura" });
      expect(erro.mock.calls.flat().join(" ")).toContain(`reembolso: o espelho diz que a assinatura ${SUB} é da conta ${memberId}, e a Stripe diz que é da conta ${outro}`);
    } finally {
      erro.mockRestore();
    }
    nadaMudouNaStripe();
  });

  it("nada a devolver, e a Stripe diz que o acesso ACABOU (encerrada e devolvida pelo painel, o aviso não chegou): a sessão CAI — só o reembolso que saiu a mantém", async () => {
    pago = { moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 9990 }] };
    naStripe = { status: "canceled", pagoAte: HA_2_DIAS };
    try {
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([409, { error: "NadaADevolver" }]);
      expect((await espelho()).status).toBe("canceled");
      expect((await situacao()).status).toBe(401);
      expect(await prisma.session.count({ where: { userId: memberId } })).toBe(0);
    } finally {
      member = await entrar();
    }
  });

  it("a Stripe não conhece a assinatura, ou diz que ela é de OUTRA conta: 404, e ninguém recebe o dinheiro dos outros", async () => {
    const [aviso, erro] = [vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
    try {
      detalhes = { userId: outro };
      expect((await reembolsar(member, {})).status).toBe(404);
      buscarDetalhes.mockRejectedValue(new AssinaturaNaoEncontrada(SUB));
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([404, { error: "AssinaturaDesconhecida" }]);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`reembolso: a conta ${memberId} tem acesso por uma assinatura que a Stripe não conhece`);
    } finally {
      aviso.mockRestore();
      erro.mockRestore();
    }
    expect(buscarOQueFoiPago).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  it("a assinatura está ocupada: 409, sem esperar — e NADA foi encerrado nem devolvido", async () => {
    await comAAssinaturaOcupada(async () => {
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      nadaMudouNaStripe();
    });
  });
});

describe("POST /api/billing/minha-assinatura/reembolso — quando a Stripe falha", () => {
  it("fora do ar ao ENCERRAR: 500 — nunca 'dinheiro devolvido' —, nada é devolvido e o acesso continua", async () => {
    cancelarNaHora.mockRejectedValue(new Error("[stripe] o encerramento da assinatura falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([500, { error: "ErroInterno" }]);
    } finally {
      erro.mockRestore();
    }
    expect(devolver).not.toHaveBeenCalled();
    expect((await situacao()).body).toMatchObject({ temAcesso: true });
  });

  it("encerrou e a DEVOLUÇÃO falhou: 502 com nome próprio, alguém é avisado — e a pessoa segue logada, com o acesso do que pagou", async () => {
    devolver.mockRejectedValue(new Error("[stripe] a devolução do pagamento falhou: StripeAPIError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await reembolsar(member, { motivo: "caro" });
      expect([res.status, res.body]).toEqual([502, { error: "DevolucaoFalhou" }]);
      const registro = erro.mock.calls.flat().join(" ");
      expect(registro).toContain(`[stripe] reembolso: a assinatura ${SUB} (conta ${memberId}) foi ENCERRADA e a devolução falhou`);
    } finally {
      erro.mockRestore();
    }
    // Encerrada, paga e NÃO devolvida: o período continua contando — e ninguém foi deslogado.
    expect([(await espelho()).status, (await espelho()).currentPeriodEnd?.getTime()]).toEqual(["canceled", EM_28_DIAS.getTime()]);
    expect((await situacao()).body).toMatchObject({ temAcesso: true });
  });

  // Achado da revisão de segurança (segunda passada, 11/10/2026): se, encerrada, a assinatura
  // já não dá acesso (a última fatura era a de uma troca de plano que não se completou), a
  // pessoa perdia a sessão junto — e nunca lia que o dinheiro não tinha voltado.
  it("encerrou, a devolução falhou E o acesso acabou: a pessoa CONTINUA LOGADA, para ler que o dinheiro não voltou", async () => {
    cancelarNaHora.mockImplementation(async () => {
      detalhes = { ...detalhes, status: "canceled" };
      naStripe = { ...naStripe, status: "canceled", pagoAte: PASSADO };
    });
    devolver.mockRejectedValue(new Error("[stripe] a devolução do pagamento falhou: StripeAPIError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await reembolsar(member, {})).body).toEqual({ error: "DevolucaoFalhou" });
    } finally {
      erro.mockRestore();
    }
    // O MESMO cookie continua valendo — e o gate já responde que não há acesso.
    const depois = await situacao();
    expect([depois.status, depois.body]).toEqual([200, { temAcesso: false, reativar: true, atrasada: false }]);
    expect(await prisma.session.count({ where: { userId: memberId } })).toBeGreaterThan(0);
  });

  it("repetir depois da falha: a assinatura já está encerrada — NÃO encerra de novo, devolve, e aí o acesso termina", async () => {
    devolver.mockRejectedValueOnce(new Error("[stripe] a devolução do pagamento falhou: StripeAPIError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await reembolsar(member, {})).status).toBe(502);
    } finally {
      erro.mockRestore();
    }
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl" }]);
    expect(cancelarNaHora).toHaveBeenCalledTimes(1);
    expect(devolver).toHaveBeenCalledTimes(2);
    expect((await situacao()).body).toEqual({ temAcesso: false, reativar: true, atrasada: false });
  });

  // O CASO DA REVISÃO DE SEGURANÇA (11/10/2026): encerrada, SEM acesso (a última fatura era a de
  // uma troca de plano que não se completou), com a devolução falhada e dentro do prazo. Sem
  // achar essa assinatura, a pessoa ficaria sem acesso, sem o dinheiro e sem poder repetir.
  it("encerrada e já SEM acesso, dentro do prazo e com dinheiro por receber: repetir DEVOLVE — sem encerrar de novo", async () => {
    await comEspelho("canceled", PASSADO);
    detalhes = { status: "canceled", pagoAte: PASSADO };
    naStripe = { status: "canceled", pagoAte: PASSADO };
    expect((await situacao()).body).toMatchObject({ temAcesso: false });
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl" }]);
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect(devolver.mock.calls.map(([pagamento, dono]) => [pagamento.pagamentoId, dono.assinaturaId, dono.userId])).toEqual([["pi_1", SUB, memberId]]);
  });

  it("o dinheiro voltou e a sincronia falhou: tenta acertar o espelho mais uma vez — e acerta", async () => {
    buscarAssinatura.mockRejectedValueOnce(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl" }]);
    } finally {
      aviso.mockRestore();
    }
    expect(buscarAssinatura).toHaveBeenCalledTimes(2);
    expect((await espelho()).status).toBe("canceled");
    // Reembolsada: sem acesso, e ainda logada.
    expect((await situacao()).body).toEqual({ temAcesso: false, reativar: true, atrasada: false });
  });

  it("o dinheiro voltou e o espelho NÃO pôde ser acertado: a resposta continua sendo o reembolso, e alguém é avisado — ela pode seguir com acesso", async () => {
    buscarAssinatura.mockRejectedValue(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const [aviso, erro] = [vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
    try {
      const res = await reembolsar(member, {});
      expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl" }]);
      expect(erro.mock.calls.flat().join(" ")).toContain(`[stripe] reembolso: a conta ${memberId} recebeu o dinheiro de volta e o espelho da assinatura ${SUB} NÃO foi acertado`);
    } finally {
      aviso.mockRestore();
      erro.mockRestore();
    }
  });

  it("duas cobranças, a segunda falha: a primeira voltou, a resposta é a falha — e repetir devolve só a que faltou", async () => {
    pago = { moeda: "brl", pagamentos: [{ pagamentoId: "pi_a", centavos: 5000, devolvido: 0 }, { pagamentoId: "pi_b", centavos: 4990, devolvido: 0 }] };
    const real = devolver.getMockImplementation();
    devolver.mockImplementation(async (pagamento, dono) => {
      if (pagamento.pagamentoId === "pi_b" && devolver.mock.calls.length <= 2) throw new Error("[stripe] a devolução do pagamento falhou: StripeAPIError");
      await real?.(pagamento, dono);
    });
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await reembolsar(member, {})).status).toBe(502);
    } finally {
      erro.mockRestore();
    }
    // A mais NOVA não voltou: o período continua contando, e a pessoa segue com acesso para repetir.
    expect((await situacao()).body).toMatchObject({ temAcesso: true });
    const res = await reembolsar(member, {});
    expect([res.status, res.body]).toEqual([200, { centavos: 4990, moeda: "brl" }]);
    expect((await situacao()).body).toMatchObject({ temAcesso: false });
  });
});

describe("GET /api/billing/minha-assinatura — a saída do reembolso", () => {
  it("dentro do prazo e com dinheiro pago: quanto volta e até quando dá para pedir", async () => {
    const res = await ler();
    expect(res.status).toBe(200);
    expect(res.body.reembolso).toEqual({ centavos: 9990, moeda: "brl", ate: new Date(HA_2_DIAS.getTime() + 7 * DIA).toISOString() });
  });

  it("fora do prazo: a saída não existe — e o que foi pago nem é consultado", async () => {
    detalhes = { comecouEm: HA_8_DIAS };
    expect((await ler()).body).toMatchObject({ situacao: "ativa", reembolso: null });
    expect(buscarOQueFoiPago).not.toHaveBeenCalled();
  });

  it("assinatura de cortesia (nada pago): a tela não mostra a saída do reembolso", async () => {
    pago = { moeda: null, pagamentos: [] };
    expect((await ler()).body).toMatchObject({ situacao: "ativa", reembolso: null });
  });

  it("o valor mostrado é o que FALTA voltar — o mesmo que a operação devolve", async () => {
    pago = { moeda: "brl", pagamentos: [{ pagamentoId: "pi_1", centavos: 9990, devolvido: 1000 }] };
    expect((await ler()).body.reembolso).toMatchObject({ centavos: 8990 });
  });

  it("nenhum código da Stripe chega ao navegador", async () => {
    const texto = JSON.stringify((await ler()).body);
    for (const trecho of [SUB, "sub_", "cus_", "pi_"]) expect(texto, trecho).not.toContain(trecho);
  });
});
