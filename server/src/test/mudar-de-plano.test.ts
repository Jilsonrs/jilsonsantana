import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe, PrecoDoPlano } from "../lib/stripe.js";
import type { DetalhesDaAssinatura } from "../lib/stripe-assinatura.js";
import type { DesfechoDaTroca, TrocaNaHora } from "../lib/stripe-plano.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. A regra (de quem é a assinatura,
// para qual plano dá para ir, se a conta mostrada ainda vale), a trava e a sincronia do espelho
// rodam de verdade, contra o banco.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const buscarProximaCobranca = vi.fn<(id: string) => Promise<{ centavos: number; moeda: string } | null>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  buscarProximaCobranca: (id: string) => buscarProximaCobranca(id),
}));
const calcularTroca = vi.fn<(troca: TrocaNaHora) => Promise<{ centavosHoje: number; moeda: string; proximaEm: Date | null }>>();
const trocarAgora = vi.fn<(troca: TrocaNaHora) => Promise<DesfechoDaTroca>>();
const anularFatura = vi.fn<(faturaId: string) => Promise<"anulada" | "paga">>();
const agendarTroca = vi.fn<(assinaturaId: string, precoNovoId: string) => Promise<Date>>();
const soltarAgendamento = vi.fn<(agendamentoId: string) => Promise<void>>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  calcularTroca: (troca: TrocaNaHora) => calcularTroca(troca),
  trocarAgora: (troca: TrocaNaHora) => trocarAgora(troca),
  anularFatura: (faturaId: string) => anularFatura(faturaId),
  agendarTroca: (assinaturaId: string, precoNovoId: string) => agendarTroca(assinaturaId, precoNovoId),
  soltarAgendamento: (agendamentoId: string) => soltarAgendamento(agendamentoId),
}));
// Os preços dos dois planos (lidos da Stripe pela lookup key) e a busca que a SINCRONIA faz.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b). É COBRANÇA. O que estes testes protegem:
//   - nada acontece sem login; a assinatura é SEMPRE a da conta da sessão, e o site diz só PARA
//     QUAL plano: o preço é o que o SERVIDOR acha, e o valor é a conta da Stripe;
//   - o valor mostrado é o cobrado: o servidor REFAZ a conta com a trava, logo antes de trocar,
//     e só troca se ela ainda for o valor que a tela mostrou — o valor que vem do site nunca é o
//     que se cobra, só pode impedir a troca;
//   - o ano do anual começa no dia da troca (a forma do pedido tem teste em `stripe-plano.test.ts`);
//   - mensal → anual vale na hora; anual → mensal é só MARCADO para o fim do período pago;
//   - o cartão recusado não deixa nada para ser cobrado depois; o banco pedindo confirmação
//     devolve o segredo, e a troca só vale depois;
//   - quem não renova (parou, atrasou) não troca; e dá para desistir da troca marcada.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const EM_20_DIAS = new Date(Date.now() + 20 * DIA);
const EM_UM_ANO = new Date(Date.now() + 365 * DIA);
const SUB = `sub_${S}_do_member`;
const CLIENTE = `cus_${S}_do_member`;
const outro = `outra-conta-plano-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
const PRECOS: PrecoDoPlano[] = [{ plano: "mensal", precoId: "price_mensal_do_teste", centavos: 9990, moeda: "brl" }, { plano: "anual", precoId: "price_anual_do_teste", centavos: 99500, moeda: "brl" }];
/** O que a conta da "Stripe" dá hoje (o dublê de `calcularTroca`) — e, por isso, o que a tela mostrou. */
const MOSTRADO = 92840;
let member: string[] = [];
let memberId = "";

const oferta = (cookies: string[] = []) => request(servidor).get("/api/billing/minha-assinatura/plano").set("Cookie", cookies);
const mudar = (cookies: string[] = [], corpo: object = {}) => request(servidor).post("/api/billing/minha-assinatura/plano").set("Cookie", cookies).send(corpo);
const desistir = (cookies: string[] = [], corpo: object = {}) => request(servidor).post("/api/billing/minha-assinatura/plano/desistir").set("Cookie", cookies).send(corpo);
const ler = () => request(servidor).get("/api/billing/minha-assinatura").set("Cookie", member);
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
const espelho = () => prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } });
const comEspelho = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { status, currentPeriodEnd } });

/** O que a "Stripe" diz da assinatura do member@: os detalhes e o que a sincronia lê. */
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};
const ANUAL: Partial<DetalhesDaAssinatura> = { plano: "anual", preco: { centavos: 99500, moeda: "brl" }, pagoAte: EM_UM_ANO, fimDoPeriodo: EM_UM_ANO };
const MARCADA: Partial<DetalhesDaAssinatura> = { ...ANUAL, agendamentoId: "sub_sched_do_teste", agendamentoNosso: true, trocaMarcada: { plano: "mensal", em: EM_UM_ANO } };

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
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(member.length).toBeGreaterThan(0);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
  await prisma.user.create({ data: { id: outro, email: `${outro}@teste.local` } });
});

beforeEach(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  // A assinatura de mentira do seed sai de cena: a do teste é MENSAL, em dia, que a "Stripe" conhece.
  await doSeed("canceled", PASSADO);
  await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_20_DIAS, stripeSubscriptionId: SUB, stripeCustomerId: CLIENTE } });
  detalhes = {};
  naStripe = {};
  buscarDetalhes.mockReset().mockImplementation(async (id) => {
    if (id !== SUB) throw new AssinaturaNaoEncontrada(id);
    return { id, status: "active", pagoAte: EM_20_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_20_DIAS, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_member", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes };
  });
  buscarProximaCobranca.mockReset().mockResolvedValue({ centavos: 9990, moeda: "brl" });
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  calcularTroca.mockReset().mockResolvedValue({ centavosHoje: 92840, moeda: "brl", proximaEm: EM_UM_ANO });
  trocarAgora.mockReset().mockResolvedValue({ estado: "trocado" });
  anularFatura.mockReset().mockResolvedValue("anulada");
  agendarTroca.mockReset().mockResolvedValue(EM_UM_ANO);
  soltarAgendamento.mockReset().mockResolvedValue(undefined);
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_20_DIAS, clienteId: CLIENTE, userId: memberId, livemode: false, ...naStripe }));
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
  for (const dublê of [trocarAgora, agendarTroca, soltarAgendamento, anularFatura]) expect(dublê).not.toHaveBeenCalled();
};

describe("mudar de plano — quem entra", () => {
  it("sem login: 401 nos três pedidos, e a Stripe nem é chamada", async () => {
    expect((await oferta()).status).toBe(401);
    expect((await mudar([], { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(401);
    expect((await desistir()).status).toBe(401);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  it("sem a chave da Stripe: 503 nos três, sem chamar nada; e as respostas nunca ficam em cache", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const respostas = [await oferta(member), await mudar(member, { plano: "anual", valorMostrado: MOSTRADO }), await desistir(member)];
    expect(respostas.map((r) => [r.status, r.headers["cache-control"]])).toEqual([[503, "private, no-store"], [503, "private, no-store"], [503, "private, no-store"]]);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  // A SEGUNDA TRAVA contra o pedido forjado em outro site (achado da revisão de segurança,
  // 11/10/2026): o cookie já não viaja nesses pedidos; se viajasse, o servidor recusa pelo que o
  // navegador diz da origem. Vale para tudo o que MUDA alguma coisa em /api/billing.
  it("pedido que muda alguma coisa, vindo de OUTRO SITE: 403 antes de tudo — do mesmo site, sem o cabeçalho, e a leitura passam", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const deFora = (caminho: string) => request(servidor).post(`/api/billing/minha-assinatura${caminho}`).set("Cookie", member).set("Sec-Fetch-Site", "cross-site").send({ plano: "anual", valorMostrado: MOSTRADO });
      for (const caminho of ["/plano", "/plano/desistir", "/cancelar", "/manter", "/reembolso"]) {
        const res = await deFora(caminho);
        expect([res.status, res.body], caminho).toEqual([403, { error: "OutroSite" }]);
      }
      expect(aviso.mock.calls.flat().join(" ")).toContain("[api] POST /api/billing/minha-assinatura/reembolso recusado: o pedido veio de outro site");
    } finally {
      aviso.mockRestore();
    }
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
    for (const origem of ["same-origin", "same-site", "none"]) {
      trocarAgora.mockClear();
      const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO }).set("Sec-Fetch-Site", origem);
      expect([res.status, trocarAgora.mock.calls.length], origem).toEqual([200, 1]);
    }
    expect((await oferta(member).set("Sec-Fetch-Site", "cross-site")).status).toBe(200);
  });

  it("plano que não existe: 400, e nada vai à Stripe", async () => {
    expect((await mudar(member, { plano: "vitalicio", valorMostrado: MOSTRADO })).status).toBe(400);
    expect((await mudar(member, {})).status).toBe(400);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });
});

describe("GET /api/billing/minha-assinatura/plano — a troca que a conta pode fazer", () => {
  it("quem é MENSAL: para o anual, na hora — quanto paga hoje (a conta da Stripe), a cobrança seguinte e o instante da conta", async () => {
    const res = await oferta(member);
    expect([res.status, res.body]).toEqual([200, { troca: { para: "anual", quando: "agora", preco: { centavos: 99500, moeda: "brl" }, hoje: { centavos: MOSTRADO, moeda: "brl" }, proximaEm: EM_UM_ANO.toISOString() } }]);
    // A conta foi feita para a assinatura e o item DESTA conta, com o preço que o SERVIDOR achou.
    expect(calcularTroca.mock.calls).toEqual([[{ assinaturaId: SUB, itemId: "si_do_member", precoId: "price_anual_do_teste" }]]);
  });

  it("quem é ANUAL: para o mensal, no fim do período já pago — sem conta nenhuma a fazer", async () => {
    detalhes = ANUAL;
    const res = await oferta(member);
    expect(res.body).toEqual({ troca: { para: "mensal", quando: "fim-do-periodo", preco: { centavos: 9990, moeda: "brl" }, em: EM_UM_ANO.toISOString() } });
    expect(calcularTroca).not.toHaveBeenCalled();
  });

  it("quem não renova, está atrasado, já tem troca marcada, ou tem um preço que não é de plano nenhum: nenhuma troca", async () => {
    for (const caso of [{ acabaEm: EM_20_DIAS, acabaNoFimDoPeriodo: true }, { status: "past_due" }, MARCADA, { plano: null, preco: null }] as Partial<DetalhesDaAssinatura>[]) {
      detalhes = caso;
      if (caso.status === "past_due") await comEspelho("past_due", PASSADO);
      expect((await oferta(member)).body, JSON.stringify(caso)).toEqual({ troca: null });
    }
    expect(calcularTroca).not.toHaveBeenCalled();
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("sem assinatura que dê acesso: 409; a que a Stripe não conhece: 404 — e fica registrado", async () => {
    await comEspelho("canceled", PASSADO);
    expect([(await oferta(member)).status, (await oferta(member)).body]).toEqual([409, { error: "SemAssinatura" }]);
    await comEspelho("active", EM_20_DIAS);
    buscarDetalhes.mockRejectedValue(new AssinaturaNaoEncontrada(SUB));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await oferta(member)).status).toBe(404);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`mudar de plano: a conta ${memberId} tem acesso por uma assinatura que a Stripe não conhece`);
    } finally {
      aviso.mockRestore();
    }
  });

  it("nenhum código da Stripe chega ao navegador", async () => {
    const texto = JSON.stringify((await oferta(member)).body);
    for (const trecho of [SUB, "sub_", "cus_", "price_", "si_"]) expect(texto, trecho).not.toContain(trecho);
  });
});

describe("POST /api/billing/minha-assinatura/plano — para o ANUAL, na hora", () => {
  it("troca a assinatura DESTA conta, com o preço que o servidor achou — e a conta é REFEITA com a trava, logo antes de trocar", async () => {
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
    expect([res.status, res.body]).toEqual([200, { estado: "trocado" }]);
    const troca = { assinaturaId: SUB, itemId: "si_do_member", precoId: "price_anual_do_teste" };
    expect(trocarAgora.mock.calls).toEqual([[troca]]);
    expect(calcularTroca.mock.calls).toEqual([[troca]]);
    const [releu, conferiu, trocou] = [buscarDetalhes.mock.invocationCallOrder[1] ?? 0, calcularTroca.mock.invocationCallOrder[0] ?? 0, trocarAgora.mock.invocationCallOrder[0] ?? 0];
    expect(releu).toBeLessThan(conferiu);
    expect(conferiu).toBeLessThan(trocou);
  });

  it("a Stripe muda PRIMEIRO, e o espelho é acertado em seguida: o novo 'pago até' é o do ano", async () => {
    naStripe = { pagoAte: EM_UM_ANO };
    await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
    expect(trocarAgora.mock.invocationCallOrder[0]).toBeLessThan(buscarAssinatura.mock.invocationCallOrder[0] ?? 0);
    expect((await espelho()).currentPeriodEnd?.getTime()).toBe(EM_UM_ANO.getTime());
  });

  it("o corpo não escolhe nada: preço, valor, item e assinatura de OUTRA pessoa são ignorados", async () => {
    const alheia = `sub_${S}_alheia`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_20_DIAS, stripeSubscriptionId: alheia, stripeCustomerId: "cus_alheio" } });
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO, precoId: "price_de_um_centavo", price: "price_de_um_centavo", centavos: 1, hoje: 1, itemId: "si_alheio", assinaturaId: alheia, userId: outro });
    expect(res.status).toBe(200);
    // À Stripe vão só a assinatura, o item e o preço que o SERVIDOR achou: valor nenhum.
    expect(trocarAgora.mock.calls).toEqual([[{ assinaturaId: SUB, itemId: "si_do_member", precoId: "price_anual_do_teste" }]]);
    expect(buscarDetalhes.mock.calls.flat()).not.toContain(alheia);
  });

  // O VALOR QUE VEM DO SITE SÓ PODE IMPEDIR A TROCA. Um centavo a menos (a tela ficou aberta e o
  // que sobra do mês diminuiu), um centavo a mais, um valor inventado, zero ou nada: 409 — e
  // quem diz quanto se paga continua sendo a conta da Stripe.
  it("o valor que a tela mostrou já não é o da conta de AGORA, ou não veio: 409 — a tela pede outra, e NADA é trocado", async () => {
    for (const valorMostrado of [MOSTRADO - 1, MOSTRADO + 1, 1, 0, undefined]) {
      const res = await mudar(member, { plano: "anual", valorMostrado });
      expect([res.status, res.body], String(valorMostrado)).toEqual([409, { error: "PreviaVencida" }]);
    }
    nadaMudouNaStripe();
  });

  it("valor quebrado ou negativo: 400, e nada vai à Stripe", async () => {
    for (const valorMostrado of [-1, 928.4, "92840"]) expect((await mudar(member, { plano: "anual", valorMostrado })).status, String(valorMostrado)).toBe(400);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });

  it("a conta mudou enquanto a tela estava aberta: recusa com o valor velho, e com o valor NOVO (que a tela busca de novo) a troca passa", async () => {
    calcularTroca.mockResolvedValue({ centavosHoje: MOSTRADO + 1, moeda: "brl", proximaEm: EM_UM_ANO });
    expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).body).toEqual({ error: "PreviaVencida" });
    expect(trocarAgora).not.toHaveBeenCalled();
    expect((await oferta(member)).body.troca.hoje).toEqual({ centavos: MOSTRADO + 1, moeda: "brl" });
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO + 1 });
    expect([res.status, res.body]).toEqual([200, { estado: "trocado" }]);
    expect(trocarAgora).toHaveBeenCalledTimes(1);
  });

  it("a Stripe fora do ar ao refazer a conta: 500 — sem a conferência, nada é trocado", async () => {
    calcularTroca.mockRejectedValue(new Error("[stripe] a prévia da troca de plano falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    expect(trocarAgora).not.toHaveBeenCalled();
  });

  it("o banco pede confirmação: a resposta leva o segredo para o site completar — a fatura NÃO é anulada, e o segredo não vai ao registro", async () => {
    trocarAgora.mockResolvedValue({ estado: "confirmar", segredo: "pi_7_secret_da_troca", faturaId: "in_da_troca" });
    const linhas: unknown[] = [];
    const espioes = (["info", "warn", "error", "log"] as const).map((nivel) => vi.spyOn(console, nivel).mockImplementation((...args: unknown[]) => void linhas.push(...args)));
    try {
      const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
      expect([res.status, res.body]).toEqual([200, { estado: "confirmar", segredo: "pi_7_secret_da_troca" }]);
    } finally {
      espioes.forEach((espiao) => espiao.mockRestore());
    }
    expect(anularFatura).not.toHaveBeenCalled();
    expect(linhas.join(" ")).not.toContain("pi_7_secret_da_troca");
    expect(linhas.join(" ")).not.toContain("in_da_troca");
  });

  it("cartão RECUSADO: 402, e a fatura da troca é ANULADA na hora — nada fica para ser cobrado depois", async () => {
    trocarAgora.mockResolvedValue({ estado: "recusado", faturaId: "in_da_troca" });
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
      expect([res.status, res.body]).toEqual([402, { error: "CartaoRecusado" }]);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`o cartão da assinatura ${SUB} (conta ${memberId}) foi recusado; o plano continua o mesmo`);
    } finally {
      aviso.mockRestore();
    }
    expect(anularFatura.mock.calls).toEqual([["in_da_troca"]]);
  });

  it("recusado e a fatura NÃO pôde ser anulada: alguém é avisado (ela ainda pode ser cobrada) — e a resposta continua sendo a recusa", async () => {
    trocarAgora.mockResolvedValue({ estado: "recusado", faturaId: "in_da_troca" });
    anularFatura.mockRejectedValue(new Error("[stripe] a anulação da fatura da troca falhou: StripeConnectionError"));
    const [aviso, erro] = [vi.spyOn(console, "warn").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
    try {
      expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(402);
      expect(erro.mock.calls.flat().join(" ")).toContain(`[stripe] mudar de plano: o cartão da assinatura ${SUB} (conta ${memberId}) foi recusado e a fatura da troca continuou em aberto`);
    } finally {
      aviso.mockRestore();
      erro.mockRestore();
    }
  });

  it("recusado sem fatura (a recusa veio como erro da Stripe): 402, sem nada a anular", async () => {
    trocarAgora.mockResolvedValue({ estado: "recusado", faturaId: null });
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(402);
    } finally {
      aviso.mockRestore();
    }
    expect(anularFatura).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar: 500 — nunca 'plano trocado'; a assinatura ocupada: 409, sem esperar e sem trocar", async () => {
    trocarAgora.mockRejectedValue(new Error("[stripe] a troca de plano falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    trocarAgora.mockClear();
    await comAAssinaturaOcupada(async () => {
      const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      expect(trocarAgora).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/billing/minha-assinatura/plano — quando a troca não cabe", () => {
  it("pedir o plano que já tem: 409, e nada muda", async () => {
    expect((await mudar(member, { plano: "mensal" })).body).toEqual({ error: "TrocaIndisponivel" });
    detalhes = ANUAL;
    expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).body).toEqual({ error: "TrocaIndisponivel" });
    nadaMudouNaStripe();
  });

  it("quem parou a renovação, está com a cobrança atrasada, ou já tem troca marcada: 409 — nada é cobrado nem marcado", async () => {
    detalhes = { acabaEm: EM_20_DIAS, acabaNoFimDoPeriodo: true };
    expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(409);
    detalhes = MARCADA;
    expect((await mudar(member, { plano: "mensal" })).body).toEqual({ error: "TrocaIndisponivel" });
    await comEspelho("past_due", PASSADO);
    detalhes = { status: "past_due", pagoAte: PASSADO };
    expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).body).toEqual({ error: "TrocaIndisponivel" });
    nadaMudouNaStripe();
  });

  // DUAS ABAS (achado da revisão de segurança, 11/10/2026): vale o que a Stripe diz COM A TRAVA.
  it("o plano já mudou na outra aba, entre a leitura e a trava: 409 — nada é cobrado de novo", async () => {
    const lidoAntes = { id: SUB, status: "active", pagoAte: EM_20_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_20_DIAS, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_member", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null } satisfies DetalhesDaAssinatura;
    buscarDetalhes.mockImplementationOnce(async () => lidoAntes);
    detalhes = ANUAL;
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
    expect([res.status, res.body]).toEqual([409, { error: "TrocaIndisponivel" }]);
    expect(buscarDetalhes).toHaveBeenCalledTimes(2);
    expect(trocarAgora).not.toHaveBeenCalled();
  });

  it("a troca já foi marcada na outra aba, entre a leitura e a trava: 409 — não marca duas vezes", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => ({ id, status: "active", pagoAte: EM_UM_ANO, plano: "anual", preco: { centavos: 99500, moeda: "brl" }, fimDoPeriodo: EM_UM_ANO, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_member", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null }));
    detalhes = MARCADA;
    expect((await mudar(member, { plano: "mensal" })).body).toEqual({ error: "TrocaIndisponivel" });
    expect(agendarTroca).not.toHaveBeenCalled();
  });

  // DEPOIS DA VIRADA para o mensal (medido com o relógio de teste, 11/10/2026): o agendamento
  // antigo fica preso à assinatura por mais um mês, já sem troca nenhuma. Ele não pode impedir a
  // pessoa de mudar de plano — e sai antes da mudança.
  it("com o agendamento de uma troca que JÁ aconteceu (sem troca marcada): dá para mudar, e ele é solto ANTES", async () => {
    detalhes = { agendamentoId: "sub_sched_que_ja_virou", agendamentoNosso: true, trocaMarcada: null };
    expect((await oferta(member)).body.troca).toMatchObject({ para: "anual", quando: "agora" });
    expect((await ler()).body).toMatchObject({ podeMudarDePlano: true, trocaMarcada: null });
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
    expect([res.status, res.body]).toEqual([200, { estado: "trocado" }]);
    expect(soltarAgendamento.mock.calls).toEqual([["sub_sched_que_ja_virou"]]);
    expect(soltarAgendamento.mock.invocationCallOrder[0]).toBeLessThan(trocarAgora.mock.invocationCallOrder[0] ?? 0);
  });

  it("o mesmo para marcar o mensal: o agendamento velho sai antes de o novo ser criado", async () => {
    detalhes = { ...ANUAL, agendamentoId: "sub_sched_que_ja_virou", agendamentoNosso: true, trocaMarcada: null };
    expect((await mudar(member, { plano: "mensal" })).body).toEqual({ estado: "marcado", em: EM_UM_ANO.toISOString() });
    expect(soltarAgendamento.mock.calls).toEqual([["sub_sched_que_ja_virou"]]);
    expect(soltarAgendamento.mock.invocationCallOrder[0]).toBeLessThan(agendarTroca.mock.invocationCallOrder[0] ?? 0);
  });

  // Achado da revisão de segurança (segunda passada, 11/10/2026): o agendamento que NÃO foi a
  // escola que criou (posto pelo painel da Stripe) nunca é solto porque o aluno mudou de plano.
  it("com um agendamento que não é da escola: não há troca a oferecer nem a fazer — e ele NÃO é solto", async () => {
    for (const caso of [{ agendamentoId: "sub_sched_do_painel", agendamentoNosso: false }, { ...ANUAL, agendamentoId: "sub_sched_do_painel", agendamentoNosso: false }] as Partial<DetalhesDaAssinatura>[]) {
      detalhes = caso;
      expect((await oferta(member)).body, JSON.stringify(caso)).toEqual({ troca: null });
      expect((await ler()).body).toMatchObject({ podeMudarDePlano: false });
      const pedido = caso.plano === "anual" ? { plano: "mensal" } : { plano: "anual", valorMostrado: MOSTRADO };
      expect((await mudar(member, pedido)).body, JSON.stringify(caso)).toEqual({ error: "TrocaIndisponivel" });
    }
    nadaMudouNaStripe();
  });

  // A troca anterior ficou ESPERANDO a confirmação do banco (a aba foi fechada no meio): pedir
  // de novo não pode deixar duas cobranças do plano novo em aberto.
  it("com uma troca anterior ainda esperando o banco: a fatura dela é ANULADA antes de pedir a nova", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca_velha" };
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
    expect([res.status, res.body]).toEqual([200, { estado: "trocado" }]);
    expect(anularFatura.mock.calls).toEqual([["in_da_troca_velha"]]);
    expect(anularFatura.mock.invocationCallOrder[0]).toBeLessThan(trocarAgora.mock.invocationCallOrder[0] ?? 0);
  });

  it("…e se a anterior foi PAGA no mesmo instante: o plano já mudou — nada é cobrado de novo", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca_velha" };
    anularFatura.mockResolvedValue("paga");
    const res = await mudar(member, { plano: "anual", valorMostrado: MOSTRADO });
    expect([res.status, res.body]).toEqual([200, { estado: "trocado" }]);
    expect(trocarAgora).not.toHaveBeenCalled();
  });

  it("a assinatura comum (sem agendamento): nada é solto", async () => {
    expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).status).toBe(200);
    expect(soltarAgendamento).not.toHaveBeenCalled();
  });

  it("sem assinatura que dê acesso: 409, e a Stripe nem é consultada", async () => {
    await comEspelho("canceled", PASSADO);
    expect((await mudar(member, { plano: "anual", valorMostrado: MOSTRADO })).body).toEqual({ error: "SemAssinatura" });
    expect(buscarDetalhes).not.toHaveBeenCalled();
    nadaMudouNaStripe();
  });
});

describe("POST /api/billing/minha-assinatura/plano — para o MENSAL, no fim do período pago", () => {
  beforeEach(() => {
    detalhes = ANUAL;
  });

  it("só MARCA a troca: nada é cobrado nem trocado agora, e a resposta diz quando vale", async () => {
    const res = await mudar(member, { plano: "mensal" });
    expect([res.status, res.body]).toEqual([200, { estado: "marcado", em: EM_UM_ANO.toISOString() }]);
    expect(agendarTroca.mock.calls).toEqual([[SUB, "price_mensal_do_teste"]]);
    expect(trocarAgora).not.toHaveBeenCalled();
  });

  it("o corpo não escolhe o preço nem a assinatura", async () => {
    await mudar(member, { plano: "mensal", precoId: "price_de_um_centavo", assinaturaId: `sub_${S}_alheia` });
    expect(agendarTroca.mock.calls).toEqual([[SUB, "price_mensal_do_teste"]]);
  });

  it("a Stripe fora do ar ao marcar: 500 — nunca 'seu plano muda em…'", async () => {
    agendarTroca.mockRejectedValue(new Error("[stripe] o agendamento da troca falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await mudar(member, { plano: "mensal" })).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
  });

  it("marcada, a tela passa a dizer para qual plano e quando — e não oferece mudar de novo", async () => {
    detalhes = MARCADA;
    expect((await ler()).body).toMatchObject({ situacao: "ativa", plano: "anual", podeMudarDePlano: false, trocaMarcada: { plano: "mensal", em: EM_UM_ANO.toISOString() } });
  });
});

describe("POST /api/billing/minha-assinatura/plano/desistir", () => {
  it("com a troca MARCADA: solta o agendamento desta conta — a assinatura segue no plano de hoje", async () => {
    detalhes = MARCADA;
    const res = await desistir(member, { agendamentoId: "sub_sched_alheio", assinaturaId: `sub_${S}_alheia` });
    expect([res.status, res.body]).toEqual([200, { trocado: false, plano: "anual" }]);
    expect(soltarAgendamento.mock.calls).toEqual([["sub_sched_do_teste"]]);
    expect(anularFatura).not.toHaveBeenCalled();
  });

  it("com a troca na hora ESPERANDO a confirmação do banco: anula a fatura dela — nada mais é cobrado", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca" };
    const res = await desistir(member);
    expect([res.status, res.body]).toEqual([200, { trocado: false, plano: "mensal" }]);
    expect(anularFatura.mock.calls).toEqual([["in_da_troca"]]);
  });

  // A RESPOSTA DIZ O PLANO DE AGORA (achado da revisão de segurança, segunda passada,
  // 11/10/2026): a janela do banco pode dar erro DEPOIS de o pagamento ter passado. Aí não há
  // mais nada pendente a desfazer — e a tela só pode dizer "nada foi cobrado" se o plano
  // continua o mesmo. Quem diz é o servidor, relendo.
  it("o pagamento PASSOU e só a resposta do banco se perdeu: nada a desfazer — e a resposta diz que o plano JÁ É o anual", async () => {
    detalhes = ANUAL;
    const res = await desistir(member);
    expect([res.status, res.body]).toEqual([200, { trocado: false, plano: "anual" }]);
    nadaMudouNaStripe();
  });

  it("o plano dito é o de DEPOIS de desfazer, relido — e não o de antes", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca" };
    anularFatura.mockImplementation(async () => {
      // A Stripe aplicou a troca no mesmo instante: a leitura seguinte já diz "anual".
      detalhes = ANUAL;
      return "paga";
    });
    expect((await desistir(member)).body).toEqual({ trocado: true, plano: "anual" });
  });

  // Com a troca pendente, a RENOVAÇÃO pode falhar: anular qualquer fatura com a assinatura
  // atrasada e viva a devolveria a "em dia", sem pagar.
  it("com a cobrança ATRASADA, desistir não anula fatura nenhuma", async () => {
    await comEspelho("past_due", PASSADO);
    detalhes = { status: "past_due", pagoAte: PASSADO, faturaDaTrocaId: "in_qualquer", faturaEmAbertoId: "in_qualquer" };
    naStripe = { status: "past_due", pagoAte: PASSADO };
    const res = await desistir(member);
    expect([res.status, res.body]).toEqual([200, { trocado: false, plano: "mensal" }]);
    expect(anularFatura).not.toHaveBeenCalled();
  });

  it("o agendamento que NÃO é da escola (posto pelo painel da Stripe) não é solto por quem desiste", async () => {
    detalhes = { ...ANUAL, agendamentoId: "sub_sched_do_painel", agendamentoNosso: false };
    const res = await desistir(member);
    expect([res.status, res.body]).toEqual([200, { trocado: false, plano: "anual" }]);
    nadaMudouNaStripe();
  });

  it("a pessoa completou a confirmação no mesmo instante: não deu para desistir — a resposta diz que o plano MUDOU", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca" };
    anularFatura.mockResolvedValue("paga");
    expect((await desistir(member)).body).toEqual({ trocado: true, plano: "mensal" });
  });

  it("a outra aba já desistiu, entre a leitura e a trava: 200, sem soltar de novo (soltar o que já foi solto viraria erro)", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => ({ id, status: "active", pagoAte: EM_UM_ANO, plano: "anual", preco: { centavos: 99500, moeda: "brl" }, fimDoPeriodo: EM_UM_ANO, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_member", agendamentoId: "sub_sched_do_teste", agendamentoNosso: true, trocaMarcada: { plano: "mensal", em: EM_UM_ANO }, faturaDaTrocaId: null }));
    detalhes = ANUAL;
    const res = await desistir(member);
    expect([res.status, res.body]).toEqual([200, { trocado: false, plano: "anual" }]);
    expect(soltarAgendamento).not.toHaveBeenCalled();
  });

  it("sem troca nenhuma: 200, sem mexer em nada (repetir não faz mal)", async () => {
    expect((await desistir(member)).body).toEqual({ trocado: false, plano: "mensal" });
    nadaMudouNaStripe();
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar: 500 — nunca 'você continua no anual'; a assinatura ocupada: 409, sem soltar nada", async () => {
    detalhes = MARCADA;
    soltarAgendamento.mockRejectedValue(new Error("[stripe] a soltura do agendamento da troca falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await desistir(member)).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    soltarAgendamento.mockClear();
    await comAAssinaturaOcupada(async () => {
      expect((await desistir(member)).body).toEqual({ error: "Ocupada" });
      expect(soltarAgendamento).not.toHaveBeenCalled();
    });
  });
});
