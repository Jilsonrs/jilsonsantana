import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { DetalhesDaAssinatura, MotivoDado } from "../lib/stripe-assinatura.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. A regra (de quem é a assinatura,
// quando dá para parar e para voltar atrás), a trava e a sincronia do espelho rodam de verdade.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const pararRenovacao = vi.fn<(id: string, dado: MotivoDado) => Promise<DetalhesDaAssinatura>>();
const retomarRenovacao = vi.fn<(id: string, acabaNoFimDoPeriodo: boolean) => Promise<DetalhesDaAssinatura>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  pararRenovacao: (id: string, dado: MotivoDado) => pararRenovacao(id, dado),
  retomarRenovacao: (id: string, acabaNoFimDoPeriodo: boolean) => retomarRenovacao(id, acabaNoFimDoPeriodo),
}));
// Com a cobrança atrasada, cancelar ENCERRA a assinatura na hora.
const cancelarNaHora = vi.fn<(id: string, dado: MotivoDado) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  cancelarNaHora: (id: string, dado: MotivoDado) => cancelarNaHora(id, dado),
}));
// A troca de plano que estava marcada, ou esperando a confirmação do banco, sai antes de parar.
const soltarAgendamento = vi.fn<(agendamentoId: string) => Promise<void>>();
const anularFatura = vi.fn<(faturaId: string) => Promise<"anulada" | "paga">>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  soltarAgendamento: (agendamentoId: string) => soltarAgendamento(agendamentoId),
  anularFatura: (faturaId: string) => anularFatura(faturaId),
}));
// A busca que a SINCRONIA faz na Stripe, depois de cada operação.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// PARAR A RENOVAÇÃO E VOLTAR ATRÁS (Fase 4, etapa 4.6, sessão b). O que estes testes protegem:
//   - nada acontece sem login, e sem login a Stripe nem é chamada;
//   - a assinatura é SEMPRE a da conta da sessão: o corpo leva só o motivo, e não tem como
//     apontar a assinatura de outra pessoa;
//   - "cancelar" é PARAR A RENOVAÇÃO: quem já pagou o período continua com acesso e LOGADO;
//   - o motivo é opcional, é da lista, e o comentário nunca vai para o registro;
//   - a Stripe muda ANTES de o espelho ser acertado, e os dois com a trava da assinatura — sem
//     esperar por ela: com a assinatura ocupada, nada é feito;
//   - voltar atrás só vale para a renovação parada: a encerrada de vez não volta;
//   - a Stripe fora do ar é falha (500), nunca "assinatura cancelada".

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const EM_30_DIAS = new Date(Date.now() + 30 * DIA);
const SUB = `sub_${S}_do_member`;
const CLIENTE = `cus_${S}_do_member`;
const outro = `outra-conta-cancelar-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let member: string[] = [];
let memberId = "";

const cancelar = (cookies: string[] = [], corpo?: object) => {
  const pedido = request(servidor).post("/api/billing/minha-assinatura/cancelar").set("Cookie", cookies);
  return corpo === undefined ? pedido : pedido.send(corpo);
};
const manter = (cookies: string[] = [], corpo: object = {}) => request(servidor).post("/api/billing/minha-assinatura/manter").set("Cookie", cookies).send(corpo);
const temAcesso = async () => (await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).body as { temAcesso?: boolean };
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
const espelho = () => prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } });
const comEspelho = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { status, currentPeriodEnd } });

/** O que a Stripe diz da assinatura do member@ (os detalhes da tela e o que a sincronia lê). */
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};
const daStripe = (id: string): DetalhesDaAssinatura => ({ id, status: "active", pagoAte: EM_30_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_30_DIAS, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes });
const PARADA: Partial<DetalhesDaAssinatura> = { acabaEm: EM_30_DIAS, acabaNoFimDoPeriodo: true };

/** Segura a trava da assinatura, como faz quem a está sincronizando neste instante. */
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
  // A assinatura de mentira do seed sai de cena: a do teste é uma que a "Stripe" conhece.
  await doSeed("canceled", PASSADO);
  await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: SUB, stripeCustomerId: CLIENTE } });
  detalhes = {};
  naStripe = {};
  buscarDetalhes.mockReset().mockImplementation(async (id) => {
    if (id !== SUB) throw new AssinaturaNaoEncontrada(id);
    return daStripe(id);
  });
  // Depois de parar, a Stripe diz "marcada para acabar no fim do período"; depois de manter, não.
  pararRenovacao.mockReset().mockImplementation(async (id) => ({ ...daStripe(id), ...PARADA }));
  retomarRenovacao.mockReset().mockImplementation(async (id) => ({ ...daStripe(id), acabaEm: null, acabaNoFimDoPeriodo: false }));
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_30_DIAS, clienteId: CLIENTE, userId: memberId, livemode: false, ...naStripe }));
  soltarAgendamento.mockReset().mockResolvedValue(undefined);
  anularFatura.mockReset().mockResolvedValue("anulada");
  // Como na Stripe: encerrada, a assinatura é `canceled`, e a sincronia lê isso.
  cancelarNaHora.mockReset().mockImplementation(async () => {
    naStripe = { ...naStripe, status: "canceled" };
  });
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
  expect(pararRenovacao).not.toHaveBeenCalled();
  expect(retomarRenovacao).not.toHaveBeenCalled();
  expect(cancelarNaHora).not.toHaveBeenCalled();
};
const nadaFoiAStripe = () => {
  nadaMudouNaStripe();
  expect(buscarDetalhes).not.toHaveBeenCalled();
  expect(buscarAssinatura).not.toHaveBeenCalled();
};

describe("parar a renovação e voltar atrás — quem entra", () => {
  it("sem login: 401 nos dois pedidos, e a Stripe nem é chamada", async () => {
    expect((await cancelar([], { motivo: "caro" })).status).toBe(401);
    expect((await manter()).status).toBe(401);
    nadaFoiAStripe();
  });

  it("abrir os endereços (GET) não para nem mantém nada", async () => {
    await request(servidor).get("/api/billing/minha-assinatura/cancelar").set("Cookie", member);
    await request(servidor).get("/api/billing/minha-assinatura/manter").set("Cookie", member);
    nadaMudouNaStripe();
  });

  it("sem a chave da Stripe: 503 nos dois, sem chamar nada", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect((await cancelar(member, {})).status).toBe(503);
    expect((await manter(member)).status).toBe(503);
    nadaFoiAStripe();
  });

  it("as respostas são por conta: nada fica em cache", async () => {
    expect((await cancelar(member, {})).headers["cache-control"]).toBe("private, no-store");
    expect((await manter(member)).headers["cache-control"]).toBe("private, no-store");
  });
});

describe("POST /api/billing/minha-assinatura/cancelar — parar a renovação", () => {
  it("para a renovação da assinatura DESTA conta, com o motivo, e diz até quando há acesso", async () => {
    const res = await cancelar(member, { motivo: "caro", comentario: "  volto em janeiro  " });
    expect([res.status, res.body]).toEqual([200, { acessoAte: EM_30_DIAS.toISOString() }]);
    expect(pararRenovacao.mock.calls).toEqual([[SUB, { motivo: "caro", comentario: "volto em janeiro" }]]);
  });

  it("o motivo é OPCIONAL: sem motivo, e até sem corpo, o botão de cancelar funciona", async () => {
    expect((await cancelar(member, {})).status).toBe(200);
    expect((await cancelar(member)).status).toBe(200);
    expect(pararRenovacao.mock.calls).toEqual([
      [SUB, { motivo: undefined, comentario: undefined }],
      [SUB, { motivo: undefined, comentario: undefined }],
    ]);
  });

  it("quem já pagou o período CONTINUA com acesso e logado: parar a renovação não tranca nada", async () => {
    expect((await cancelar(member, { motivo: "sem-tempo" })).status).toBe(200);
    // O gate responde pelo espelho, que a sincronia acabou de gravar: segue ativo, pago até a data.
    expect((await temAcesso()).temAcesso).toBe(true);
    expect([(await espelho()).status, (await espelho()).currentPeriodEnd?.getTime()]).toEqual(["active", EM_30_DIAS.getTime()]);
    expect(await prisma.session.count({ where: { userId: memberId } })).toBeGreaterThan(0);
  });

  it("a Stripe muda PRIMEIRO, e o espelho é acertado em seguida pela rotina de sempre", async () => {
    await cancelar(member, {});
    expect(buscarAssinatura.mock.calls).toEqual([[SUB]]);
    expect(pararRenovacao.mock.invocationCallOrder[0]).toBeLessThan(buscarAssinatura.mock.invocationCallOrder[0] ?? 0);
  });

  it("o corpo não escolhe nada: assinatura, cliente e conta de OUTRA pessoa são ignorados", async () => {
    const alheia = `sub_${S}_alheia`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: alheia, stripeCustomerId: "cus_alheio" } });
    const res = await cancelar(member, { assinaturaId: alheia, assinatura: alheia, id: alheia, subscription: alheia, userId: outro, clienteId: "cus_alheio" });
    expect(res.status).toBe(200);
    expect(pararRenovacao.mock.calls.map(([id]) => id)).toEqual([SUB]);
    expect(buscarDetalhes.mock.calls.flat()).not.toContain(alheia);
    expect(buscarAssinatura.mock.calls.flat()).not.toContain(alheia);
  });

  it("motivo fora da lista, ou comentário longo demais: 400, e nada vai à Stripe", async () => {
    expect((await cancelar(member, { motivo: "inventado" })).status).toBe(400);
    expect((await cancelar(member, { comentario: "x".repeat(501) })).status).toBe(400);
    nadaFoiAStripe();
  });

  it("o comentário é texto livre da pessoa: NUNCA vai para o registro", async () => {
    const linhas: unknown[] = [];
    const espioes = (["info", "warn", "error", "log"] as const).map((nivel) => vi.spyOn(console, nivel).mockImplementation((...args: unknown[]) => void linhas.push(...args)));
    try {
      expect((await cancelar(member, { motivo: "outro", comentario: "meu chefe, o Paulo, cortou a verba" })).status).toBe(200);
    } finally {
      espioes.forEach((espiao) => espiao.mockRestore());
    }
    const registro = linhas.join(" ");
    expect(registro).toContain(`parar a renovação: conta ${memberId}, assinatura ${SUB}, motivo outro`);
    expect(registro).not.toContain("Paulo");
  });

  it("já estava parada: repetir dá no mesmo (e acrescenta o motivo, se veio um)", async () => {
    detalhes = PARADA;
    const res = await cancelar(member, { motivo: "ja-aprendi" });
    expect([res.status, res.body]).toEqual([200, { acessoAte: EM_30_DIAS.toISOString() }]);
    expect(pararRenovacao.mock.calls).toEqual([[SUB, { motivo: "ja-aprendi", comentario: undefined }]]);
  });

  it("quem está em dia nunca é encerrado na hora: cancelar é só parar a renovação", async () => {
    expect((await cancelar(member, {})).body).toEqual({ acessoAte: EM_30_DIAS.toISOString() });
    expect(cancelarNaHora).not.toHaveBeenCalled();
  });

  it("encerrada de vez, ainda com dias pagos: 409 — não há renovação a parar", async () => {
    await comEspelho("canceled", EM_30_DIAS);
    detalhes = { status: "canceled" };
    expect((await cancelar(member, {})).body).toEqual({ error: "SemAssinatura" });
    nadaMudouNaStripe();
  });

  it("conta sem assinatura que dê acesso: 409, e a Stripe nem é consultada", async () => {
    await comEspelho("canceled", PASSADO);
    const res = await cancelar(member, {});
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    nadaFoiAStripe();
  });

  it("a Stripe não conhece a assinatura que dá acesso: 404, nada é parado — e fica registrado", async () => {
    buscarDetalhes.mockRejectedValue(new AssinaturaNaoEncontrada(SUB));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await cancelar(member, {});
      expect([res.status, res.body]).toEqual([404, { error: "AssinaturaDesconhecida" }]);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`parar a renovação: a conta ${memberId} tem acesso por uma assinatura que a Stripe não conhece`);
    } finally {
      aviso.mockRestore();
    }
    nadaMudouNaStripe();
  });

  it("a Stripe diz que a assinatura é de OUTRA conta: ninguém cancela a assinatura dos outros por uma linha errada do espelho", async () => {
    detalhes = { userId: outro };
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(404);
      expect((await manter(member)).status).toBe(404);
    } finally {
      erro.mockRestore();
    }
    nadaMudouNaStripe();
  });

  it("a Stripe fora do ar ao parar: 500 — nunca 'assinatura cancelada' — e o espelho fica como estava", async () => {
    pararRenovacao.mockRejectedValue(new Error("[stripe] a parada da renovação falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await cancelar(member, { motivo: "caro" });
      expect([res.status, res.body]).toEqual([500, { error: "ErroInterno" }]);
    } finally {
      erro.mockRestore();
    }
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect((await espelho()).status).toBe("active");
  });

  it("a assinatura está ocupada (alguém a sincroniza agora): 409, sem esperar — e NADA foi feito na Stripe", async () => {
    await comAAssinaturaOcupada(async () => {
      const res = await cancelar(member, { motivo: "caro" });
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      nadaMudouNaStripe();
      expect(buscarAssinatura).not.toHaveBeenCalled();
    });
  });

  it("a Stripe parou e a sincronia falhou: a operação VALEU (o aviso da Stripe acerta o espelho) — é aviso, não erro", async () => {
    buscarAssinatura.mockRejectedValue(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await cancelar(member, {});
      expect([res.status, res.body]).toEqual([200, { acessoAte: EM_30_DIAS.toISOString() }]);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`a operação na assinatura ${SUB} valeu na Stripe, e a sincronia ficou para o aviso`);
    } finally {
      aviso.mockRestore();
    }
  });
});

// CANCELAR COM A COBRANÇA ATRASADA (decisão do operador, 11/10/2026): não há período pago a
// manter — a assinatura TERMINA na hora, a cobrança em aberto não é mais tentada, e a pessoa
// continua logada para ler a confirmação.
describe("POST /api/billing/minha-assinatura/cancelar — com a cobrança atrasada", () => {
  beforeEach(async () => {
    await comEspelho("past_due", PASSADO);
    detalhes = { status: "past_due", pagoAte: PASSADO, faturaEmAbertoId: "in_em_aberto" };
    naStripe = { status: "past_due", pagoAte: PASSADO };
  });

  it("ENCERRA a assinatura desta conta na hora, com o motivo, e anula a cobrança em aberto — sem 'parar a renovação'", async () => {
    const res = await cancelar(member, { motivo: "caro", comentario: "sem cartão agora" });
    expect([res.status, res.body]).toEqual([200, { acessoAte: null, terminou: true }]);
    expect(cancelarNaHora.mock.calls).toEqual([[SUB, { motivo: "caro", comentario: "sem cartão agora" }]]);
    expect(anularFatura.mock.calls).toEqual([["in_em_aberto"]]);
    expect(pararRenovacao).not.toHaveBeenCalled();
  });

  it("a ordem: ENCERRA, depois anula a cobrança — anulada com a assinatura viva, ela poderia voltar a 'em dia' sem pagar", async () => {
    await cancelar(member, {});
    const [encerrou, anulou, sincronizou] = [cancelarNaHora, anularFatura, buscarAssinatura].map((dublê) => dublê.mock.invocationCallOrder[0] ?? 0);
    expect(encerrou).toBeLessThan(anulou);
    expect(anulou).toBeLessThan(sincronizou);
  });

  it("as aulas trancam NA HORA — e a pessoa continua logada, com 'Reativar assinatura'", async () => {
    expect((await temAcesso()).temAcesso).toBe(true);
    expect((await cancelar(member, {})).status).toBe(200);
    expect((await espelho()).status).toBe("canceled");
    // O MESMO cookie continua valendo, e o gate já responde que não há acesso.
    const depois = await request(servidor).get("/api/billing/assinatura").set("Cookie", member);
    expect([depois.status, depois.body]).toEqual([200, { temAcesso: false, reativar: true }]);
    expect(await prisma.session.count({ where: { userId: memberId } })).toBeGreaterThan(0);
  });

  // A tela disse "a cobrança em aberto não será mais tentada": o que foge disso precisa de
  // gente (achado da revisão de segurança, segunda passada, 11/10/2026).
  it("a cobrança em aberto não pôde ser anulada: o cancelamento VALEU do mesmo jeito — e alguém é avisado para anular", async () => {
    anularFatura.mockRejectedValue(new Error("[stripe] a anulação da fatura da troca falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await cancelar(member, {});
      expect([res.status, res.body]).toEqual([200, { acessoAte: null, terminou: true }]);
      expect(erro.mock.calls.flat().join(" ")).toContain(`[stripe] cancelar: a assinatura ${SUB} (conta ${memberId}) foi encerrada e a cobrança em aberto NÃO foi anulada`);
    } finally {
      erro.mockRestore();
    }
  });

  it("a cobrança PASSOU no instante do cancelamento (uma tentativa da Stripe): alguém é avisado — a pessoa pagou um período que quis cancelar", async () => {
    anularFatura.mockResolvedValue("paga");
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(200);
      expect(erro.mock.calls.flat().join(" ")).toContain(`[stripe] cancelar: a cobrança em aberto da assinatura ${SUB} (conta ${memberId}) foi PAGA no instante do cancelamento`);
    } finally {
      erro.mockRestore();
    }
  });

  it("anulada como se espera: ninguém é incomodado", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(200);
      expect(erro).not.toHaveBeenCalled();
    } finally {
      erro.mockRestore();
    }
  });

  it("a Stripe fora do ar ao encerrar: 500 — nunca 'assinatura cancelada' —, nada é anulado e o acesso continua", async () => {
    cancelarNaHora.mockRejectedValue(new Error("[stripe] o encerramento da assinatura falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    expect(anularFatura).not.toHaveBeenCalled();
    expect((await temAcesso()).temAcesso).toBe(true);
  });

  it("a cobrança atrasou entre a leitura e a trava (outra aba, ou a renovação que falhou agora): vale o de AGORA — termina na hora", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => ({ ...daStripe(id), status: "active", pagoAte: EM_30_DIAS, faturaEmAbertoId: null }));
    expect((await cancelar(member, {})).body).toEqual({ acessoAte: null, terminou: true });
    expect(pararRenovacao).not.toHaveBeenCalled();
  });

  it("a tela é avisada antes: a leitura diz que cancelar aqui termina na hora", async () => {
    const res = await request(servidor).get("/api/billing/minha-assinatura").set("Cookie", member);
    expect(res.body).toMatchObject({ situacao: "atrasada", terminaAoCancelar: true, podeParar: false });
  });
});

// QUEM ESTÁ SAINDO NÃO TROCA DE PLANO (passo 10). `[FATO — medido na área restrita, 11/10/2026]`
// com uma troca marcada, a Stripe RECUSA parar a renovação direto na assinatura.
describe("POST /api/billing/minha-assinatura/cancelar — com uma troca de plano no caminho", () => {
  it("a assinatura comum: nada é solto nem anulado", async () => {
    expect((await cancelar(member, {})).status).toBe(200);
    expect(soltarAgendamento).not.toHaveBeenCalled();
    expect(anularFatura).not.toHaveBeenCalled();
  });

  it("com a troca MARCADA para o fim do período: solta o agendamento ANTES de parar a renovação", async () => {
    detalhes = { plano: "anual", agendamentoId: "sub_sched_do_teste", agendamentoNosso: true, trocaMarcada: { plano: "mensal", em: EM_30_DIAS } };
    expect((await cancelar(member, {})).status).toBe(200);
    expect(soltarAgendamento.mock.calls).toEqual([["sub_sched_do_teste"]]);
    expect(soltarAgendamento.mock.invocationCallOrder[0]).toBeLessThan(pararRenovacao.mock.invocationCallOrder[0] ?? 0);
  });

  // Cancelar é direito da pessoa: com um agendamento preso, a Stripe recusa parar a renovação
  // — então ele sai mesmo que não tenha sido a escola que o criou. Mas aí alguém fica sabendo.
  it("com um agendamento que NÃO é da escola (posto pelo painel da Stripe): é solto para a pessoa poder cancelar — e alguém é avisado", async () => {
    detalhes = { plano: "anual", agendamentoId: "sub_sched_do_painel", agendamentoNosso: false };
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(200);
      expect(soltarAgendamento.mock.calls).toEqual([["sub_sched_do_painel"]]);
      expect(erro.mock.calls.flat().join(" ")).toContain(`[stripe] cancelar: a assinatura ${SUB} (conta ${memberId}) tinha um agendamento que não é da escola`);
    } finally {
      erro.mockRestore();
    }
  });

  it("o agendamento da PRÓPRIA escola é solto sem alarme", async () => {
    detalhes = { plano: "anual", agendamentoId: "sub_sched_do_teste", agendamentoNosso: true, trocaMarcada: { plano: "mensal", em: EM_30_DIAS } };
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(200);
      expect(erro).not.toHaveBeenCalled();
    } finally {
      erro.mockRestore();
    }
  });

  it("com a troca na hora ESPERANDO a confirmação do banco: anula a fatura dela antes — senão ainda poderia ser cobrada", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca" };
    expect((await cancelar(member, {})).status).toBe(200);
    expect(anularFatura.mock.calls).toEqual([["in_da_troca"]]);
    expect(anularFatura.mock.invocationCallOrder[0]).toBeLessThan(pararRenovacao.mock.invocationCallOrder[0] ?? 0);
  });

  // DUAS ABAS (achado da revisão de segurança, 11/10/2026): o que vale é o que a Stripe diz COM
  // A TRAVA, e não o que foi lido antes dela.
  it("a troca de plano foi criada na outra aba, entre a leitura e a trava: ela é anulada do mesmo jeito", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => daStripe(id));
    detalhes = { faturaDaTrocaId: "in_da_outra_aba" };
    expect((await cancelar(member, {})).status).toBe(200);
    expect(buscarDetalhes).toHaveBeenCalledTimes(2);
    expect(anularFatura.mock.calls).toEqual([["in_da_outra_aba"]]);
  });

  it("a assinatura foi encerrada na outra aba, entre a leitura e a trava: 409 — e nada é parado", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => daStripe(id));
    detalhes = { status: "canceled" };
    const res = await cancelar(member, {});
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    expect(pararRenovacao).not.toHaveBeenCalled();
  });

  it("não deu para soltar o agendamento: 500, e a renovação NÃO é dada como parada", async () => {
    detalhes = { plano: "anual", agendamentoId: "sub_sched_do_teste", agendamentoNosso: true };
    soltarAgendamento.mockRejectedValue(new Error("[stripe] a soltura do agendamento da troca falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await cancelar(member, {})).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    expect(pararRenovacao).not.toHaveBeenCalled();
  });
});

describe("POST /api/billing/minha-assinatura/manter — voltar atrás", () => {
  it("com a renovação parada: tira a marca do fim do período, sem cobrar nada, e acerta o espelho em seguida", async () => {
    detalhes = PARADA;
    const res = await manter(member);
    expect(res.status).toBe(204);
    expect(retomarRenovacao.mock.calls).toEqual([[SUB, true]]);
    expect(buscarAssinatura.mock.calls).toEqual([[SUB]]);
    expect(retomarRenovacao.mock.invocationCallOrder[0]).toBeLessThan(buscarAssinatura.mock.invocationCallOrder[0] ?? 0);
  });

  it("marcada para acabar numa data avulsa (pelo painel da Stripe): desfaz a data, não a marca do período", async () => {
    detalhes = { acabaEm: EM_30_DIAS, acabaNoFimDoPeriodo: false };
    expect((await manter(member)).status).toBe(204);
    expect(retomarRenovacao.mock.calls).toEqual([[SUB, false]]);
  });

  it("a outra aba já voltou atrás, entre a leitura e a trava: 204, sem mexer de novo na Stripe", async () => {
    buscarDetalhes.mockImplementationOnce(async (id) => ({ ...daStripe(id), ...PARADA }));
    expect((await manter(member)).status).toBe(204);
    expect(buscarDetalhes).toHaveBeenCalledTimes(2);
    expect(retomarRenovacao).not.toHaveBeenCalled();
  });

  it("já renova (o segundo clique, a segunda aba): 204, sem mexer em nada na Stripe", async () => {
    expect((await manter(member)).status).toBe(204);
    nadaMudouNaStripe();
  });

  it("o corpo não escolhe nada: a assinatura de OUTRA pessoa nunca é tocada", async () => {
    const alheia = `sub_${S}_alheia_parada`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: alheia, stripeCustomerId: "cus_alheio" } });
    detalhes = PARADA;
    expect((await manter(member, { assinaturaId: alheia, id: alheia, userId: outro })).status).toBe(204);
    expect(retomarRenovacao.mock.calls.map(([id]) => id)).toEqual([SUB]);
    expect(buscarDetalhes.mock.calls.flat()).not.toContain(alheia);
  });

  it("encerrada de vez, ainda com dias pagos: 409 — cancelada é estado final; quem volta assina de novo", async () => {
    await comEspelho("canceled", EM_30_DIAS);
    detalhes = { status: "canceled", acabaEm: null };
    const res = await manter(member);
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    nadaMudouNaStripe();
  });

  it("com a cobrança atrasada, ou sem assinatura que dê acesso: 409, sem mexer em nada", async () => {
    await comEspelho("past_due", PASSADO);
    detalhes = { status: "past_due", pagoAte: PASSADO };
    expect((await manter(member)).status).toBe(409);
    await comEspelho("canceled", PASSADO);
    expect((await manter(member)).body).toEqual({ error: "SemAssinatura" });
    nadaMudouNaStripe();
  });

  it("a assinatura está ocupada: 409, sem esperar — e nada foi feito na Stripe", async () => {
    detalhes = PARADA;
    await comAAssinaturaOcupada(async () => {
      const res = await manter(member);
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      nadaMudouNaStripe();
    });
  });

  it("a Stripe fora do ar ao voltar atrás: 500 — nunca 'sua assinatura continua'", async () => {
    detalhes = PARADA;
    retomarRenovacao.mockRejectedValue(new Error("[stripe] a retomada da renovação falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await manter(member)).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });
});
