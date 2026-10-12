import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { CartaoDaAssinatura } from "@jilson/core";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { CobrancaDaFatura, DetalhesDaAssinatura, PedidoDeCartao } from "../lib/stripe-assinatura.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. A regra (de quem é a assinatura,
// qual cartão vale, quando cobrar a fatura em aberto) e a sincronia do espelho rodam de verdade.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const criarPedidoDeCartao = vi.fn<(pedido: PedidoDeCartao) => Promise<string>>();
const buscarCartaoConfirmado = vi.fn<(pedido: PedidoDeCartao) => Promise<string | null>>();
const definirCartao = vi.fn<(assinaturaId: string, formaId: string) => Promise<CartaoDaAssinatura | null>>();
const soltarOutrosCartoes = vi.fn<(clienteId: string, manter: string) => Promise<number>>();
const pagarFatura = vi.fn<(faturaId: string) => Promise<CobrancaDaFatura>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  criarPedidoDeCartao: (pedido: PedidoDeCartao) => criarPedidoDeCartao(pedido),
  buscarCartaoConfirmado: (pedido: PedidoDeCartao) => buscarCartaoConfirmado(pedido),
  definirCartao: (assinaturaId: string, formaId: string) => definirCartao(assinaturaId, formaId),
  soltarOutrosCartoes: (clienteId: string, manter: string) => soltarOutrosCartoes(clienteId, manter),
  pagarFatura: (faturaId: string) => pagarFatura(faturaId),
}));
// O segredo com que o site completa a confirmação do banco da fatura em aberto (sessão b).
const segredoDaFatura = vi.fn<(faturaId: string) => Promise<string | null>>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  segredoDaFatura: (faturaId: string) => segredoDaFatura(faturaId),
}));
// A busca que a SINCRONIA faz na Stripe, depois de o cartão novo pagar a fatura em aberto.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// TROCAR O CARTÃO (Fase 4, etapa 4.6). O que estes testes protegem — é o cartão que vai ser
// cobrado, e não pode ir para a assinatura errada:
//   - nada acontece sem login, e sem login a Stripe nem é chamada;
//   - a assinatura é SEMPRE a da conta da sessão, e o cliente é o DELA: o corpo do pedido não
//     tem como apontar outra assinatura, outro cliente nem um cartão;
//   - o cartão que vai para a assinatura é o que o SERVIDOR leu na Stripe — sem cartão confirmado
//     lá, nada muda;
//   - assinatura encerrada de vez não recebe cartão;
//   - com a cobrança atrasada, o cartão novo paga a fatura em aberto e o espelho é acertado pela
//     rotina de sempre; cartão recusado não é erro: a troca valeu, e a fatura segue em aberto;
//   - o cartão antigo sai da Stripe; se não sair, a troca valeu do mesmo jeito;
//   - a Stripe fora do ar é falha (500), nunca "cartão atualizado".

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const EM_30_DIAS = new Date(Date.now() + 30 * DIA);
const SUB = `sub_${S}_do_member`;
const CLIENTE = `cus_${S}_do_member`;
const MASTER: CartaoDaAssinatura = { bandeira: "mastercard", final: "4444", mes: 1, ano: 2030 };
const outro = `outra-conta-cartao-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let member: string[] = [];
let memberId = "";

const preparar = (cookies: string[] = [], corpo: object = {}) => request(servidor).post("/api/billing/cartao").set("Cookie", cookies).send(corpo);
const aplicar = (cookies: string[] = [], corpo: object = {}) => request(servidor).post("/api/billing/cartao/aplicar").set("Cookie", cookies).send(corpo);
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
const espelho = () => prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } });
const comEspelho = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: SUB }, data: { status, currentPeriodEnd } });

/** O que a Stripe diz da assinatura do member@ (os detalhes da tela e o que a sincronia lê). */
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};

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
    return { id, status: "active", pagoAte: EM_30_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_30_DIAS, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: { bandeira: "visa", final: "4242", mes: 12, ano: 2028 }, clienteId: CLIENTE, userId: memberId, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes };
  });
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_30_DIAS, clienteId: CLIENTE, userId: memberId, livemode: false, ...naStripe }));
  criarPedidoDeCartao.mockReset().mockResolvedValue("seti_segredo_do_teste");
  buscarCartaoConfirmado.mockReset().mockResolvedValue("pm_novo");
  definirCartao.mockReset().mockResolvedValue(MASTER);
  soltarOutrosCartoes.mockReset().mockResolvedValue(1);
  pagarFatura.mockReset().mockResolvedValue("paga");
  segredoDaFatura.mockReset().mockRejectedValue(new Error("o segredo da fatura não devia ter sido pedido"));
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

const nadaFoiASStripe = () => {
  for (const dublê of [buscarDetalhes, criarPedidoDeCartao, buscarCartaoConfirmado, definirCartao, soltarOutrosCartoes, pagarFatura, buscarAssinatura]) expect(dublê).not.toHaveBeenCalled();
};

describe("trocar o cartão — quem entra", () => {
  it("sem login: 401 nos dois pedidos, e a Stripe nem é chamada", async () => {
    expect((await preparar()).status).toBe(401);
    expect((await aplicar()).status).toBe(401);
    nadaFoiASStripe();
  });

  it("abrir os endereços (GET) não prepara nem aplica nada", async () => {
    await request(servidor).get("/api/billing/cartao").set("Cookie", member);
    await request(servidor).get("/api/billing/cartao/aplicar").set("Cookie", member);
    nadaFoiASStripe();
  });

  it("sem a chave da Stripe: 503 nos dois, sem chamar nada", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect((await preparar(member)).status).toBe(503);
    expect((await aplicar(member)).status).toBe(503);
    nadaFoiASStripe();
  });

  it("as respostas são por conta: nada fica em cache", async () => {
    expect((await preparar(member)).headers["cache-control"]).toBe("private, no-store");
    expect((await aplicar(member)).headers["cache-control"]).toBe("private, no-store");
  });
});

describe("POST /api/billing/cartao — preparar", () => {
  it("abre o pedido para o cliente e a assinatura DESTA conta, e devolve só o segredo", async () => {
    const res = await preparar(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ segredo: "seti_segredo_do_teste" });
    expect(criarPedidoDeCartao.mock.calls).toEqual([[{ clienteId: CLIENTE, userId: memberId, assinaturaId: SUB }]]);
  });

  it("o corpo não escolhe nada: cliente, assinatura e conta de OUTRA pessoa são ignorados", async () => {
    const alheia = `sub_${S}_alheia`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: alheia, stripeCustomerId: "cus_alheio" } });
    const res = await preparar(member, { clienteId: "cus_alheio", assinaturaId: alheia, assinatura: alheia, userId: outro, customer: "cus_alheio" });
    expect(res.status).toBe(200);
    expect(criarPedidoDeCartao.mock.calls).toEqual([[{ clienteId: CLIENTE, userId: memberId, assinaturaId: SUB }]]);
    expect(buscarDetalhes.mock.calls.map(([id]) => id)).toEqual([SUB]);
  });

  it("conta sem assinatura que dê acesso: 409, e nenhum pedido é aberto na Stripe", async () => {
    await comEspelho("canceled", PASSADO);
    const res = await preparar(member);
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    nadaFoiASStripe();
  });

  it("assinatura encerrada de vez, ainda com dias pagos: 409 — ela não cobra mais nada", async () => {
    await comEspelho("canceled", EM_30_DIAS);
    detalhes = { status: "canceled" };
    const res = await preparar(member);
    expect([res.status, res.body]).toEqual([409, { error: "SemAssinatura" }]);
    expect(criarPedidoDeCartao).not.toHaveBeenCalled();
  });

  it("a renovação parada e a cobrança atrasada aceitam cartão novo", async () => {
    detalhes = { acabaEm: EM_30_DIAS };
    expect((await preparar(member)).status).toBe(200);
    await comEspelho("past_due", PASSADO);
    detalhes = { status: "past_due", pagoAte: PASSADO };
    expect((await preparar(member)).status).toBe(200);
  });

  it("a Stripe não conhece a assinatura que dá acesso: 404, sem abrir pedido", async () => {
    buscarDetalhes.mockRejectedValue(new AssinaturaNaoEncontrada(SUB));
    const res = await preparar(member);
    expect([res.status, res.body]).toEqual([404, { error: "AssinaturaDesconhecida" }]);
    expect(criarPedidoDeCartao).not.toHaveBeenCalled();
  });

  it("a Stripe fora do ar: 500, sem segredo", async () => {
    criarPedidoDeCartao.mockRejectedValue(new Error("[stripe] o pedido de guardar cartão falhou: StripeConnectionError"));
    const res = await preparar(member);
    expect([res.status, res.body]).toEqual([500, { error: "ErroInterno" }]);
  });
});

describe("POST /api/billing/cartao/aplicar — o cartão novo vai para a assinatura", () => {
  it("o cartão é o que o SERVIDOR leu na Stripe para o pedido desta conta; a resposta só tem o que a tela mostra", async () => {
    const res = await aplicar(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cartao: MASTER, pagou: false, confirmar: null });
    expect(buscarCartaoConfirmado.mock.calls).toEqual([[{ clienteId: CLIENTE, userId: memberId, assinaturaId: SUB }]]);
    expect(definirCartao.mock.calls).toEqual([[SUB, "pm_novo"]]);
    const texto = JSON.stringify(res.body);
    for (const trecho of ["pm_", "seti_", "cus_", "sub_"]) expect(texto, trecho).not.toContain(trecho);
  });

  it("o corpo não escolhe o cartão nem a assinatura: o que vier é ignorado", async () => {
    const res = await aplicar(member, { formaId: "pm_do_atacante", paymentMethod: "pm_do_atacante", assinaturaId: "sub_alheia", clienteId: "cus_alheio" });
    expect(res.status).toBe(200);
    expect(definirCartao.mock.calls).toEqual([[SUB, "pm_novo"]]);
  });

  it("a Stripe não tem cartão confirmado para este pedido: 409, e a assinatura fica como estava", async () => {
    buscarCartaoConfirmado.mockResolvedValue(null);
    const res = await aplicar(member);
    expect([res.status, res.body]).toEqual([409, { error: "CartaoNaoConfirmado" }]);
    expect(definirCartao).not.toHaveBeenCalled();
    expect(soltarOutrosCartoes).not.toHaveBeenCalled();
    expect(pagarFatura).not.toHaveBeenCalled();
  });

  it("conta sem assinatura, ou com ela encerrada de vez: 409, sem nem procurar cartão", async () => {
    await comEspelho("canceled", EM_30_DIAS);
    detalhes = { status: "canceled" };
    expect((await aplicar(member)).body).toEqual({ error: "SemAssinatura" });
    await comEspelho("canceled", PASSADO);
    expect((await aplicar(member)).body).toEqual({ error: "SemAssinatura" });
    expect(buscarCartaoConfirmado).not.toHaveBeenCalled();
    expect(definirCartao).not.toHaveBeenCalled();
  });

  // TODOS os outros cartões do cliente saem (abertura do passo 7): quem diz quais é a Stripe,
  // em `soltarOutrosCartoes` (teste em `stripe-assinatura-rede.test.ts`). Aqui: de QUEM, qual
  // FICA, e que só acontece depois de o novo estar na assinatura.
  it("os outros cartões do cliente DESTA assinatura saem da Stripe, menos o novo — depois de ele estar na assinatura", async () => {
    await aplicar(member);
    expect(soltarOutrosCartoes.mock.calls).toEqual([[CLIENTE, "pm_novo"]]);
    expect(definirCartao.mock.invocationCallOrder[0]).toBeLessThan(soltarOutrosCartoes.mock.invocationCallOrder[0] ?? 0);
  });

  it("aplicar de novo: o cartão que fica é sempre o que a Stripe confirmou, nunca outro", async () => {
    await aplicar(member);
    await aplicar(member);
    expect(soltarOutrosCartoes.mock.calls).toEqual([[CLIENTE, "pm_novo"], [CLIENTE, "pm_novo"]]);
  });

  it("um cartão antigo não saiu (a Stripe falhou): a troca valeu do mesmo jeito, e fica o aviso", async () => {
    soltarOutrosCartoes.mockRejectedValue(new Error("[stripe] a remoção de um cartão antigo falhou: StripeAPIError"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await aplicar(member);
      expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: false, confirmar: null }]);
      expect(aviso.mock.calls.flat().join(" ")).toContain(`um cartão antigo do cliente da assinatura ${SUB} continuou guardado`);
    } finally {
      aviso.mockRestore();
    }
  });

  it("a Stripe não conhece a assinatura que dá acesso: 404 nos dois pedidos, sem procurar cartão — e fica registrado", async () => {
    buscarDetalhes.mockRejectedValue(new AssinaturaNaoEncontrada(SUB));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await aplicar(member);
      expect([res.status, res.body]).toEqual([404, { error: "AssinaturaDesconhecida" }]);
      expect(buscarCartaoConfirmado).not.toHaveBeenCalled();
      expect(definirCartao).not.toHaveBeenCalled();
      expect(aviso.mock.calls.flat().join(" ")).toContain(`trocar cartão: a conta ${memberId} tem acesso por uma assinatura que a Stripe não conhece`);
    } finally {
      aviso.mockRestore();
    }
  });

  it("a Stripe diz que a assinatura é de OUTRA conta: ninguém troca o cartão dela por uma linha errada do espelho", async () => {
    detalhes = { userId: outro };
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await preparar(member)).status).toBe(404);
      expect((await aplicar(member)).status).toBe(404);
      expect(criarPedidoDeCartao).not.toHaveBeenCalled();
      expect(definirCartao).not.toHaveBeenCalled();
      expect(soltarOutrosCartoes).not.toHaveBeenCalled();
    } finally {
      erro.mockRestore();
    }
  });

  it("a Stripe fora do ar ao pôr o cartão: 500 — nunca 'cartão atualizado' — e o antigo fica onde está", async () => {
    definirCartao.mockRejectedValue(new Error("[stripe] a troca do cartão da assinatura falhou: StripeConnectionError"));
    const res = await aplicar(member);
    expect([res.status, res.body]).toEqual([500, { error: "ErroInterno" }]);
    expect(soltarOutrosCartoes).not.toHaveBeenCalled();
    expect(pagarFatura).not.toHaveBeenCalled();
  });
});

describe("POST /api/billing/cartao/aplicar — com a cobrança atrasada", () => {
  beforeEach(async () => {
    await comEspelho("past_due", PASSADO);
    detalhes = { status: "past_due", pagoAte: PASSADO, faturaEmAbertoId: "in_em_aberto" };
  });

  it("o cartão novo paga a fatura em aberto, e o espelho é acertado pela rotina de sempre", async () => {
    naStripe = { status: "active", pagoAte: EM_30_DIAS };
    const res = await aplicar(member);
    expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: true, confirmar: null }]);
    expect(pagarFatura.mock.calls).toEqual([["in_em_aberto"]]);
    // Só cobra depois de o cartão novo estar na assinatura: senão cobraria o cartão que falhou.
    expect(definirCartao.mock.invocationCallOrder[0]).toBeLessThan(pagarFatura.mock.invocationCallOrder[0] ?? 0);
    const depois = await espelho();
    expect([depois.status, depois.currentPeriodEnd?.getTime()]).toEqual(["active", EM_30_DIAS.getTime()]);
  });

  it("o banco pede uma confirmação que só a pessoa dá: a troca valeu, sem 'pagou', e a resposta leva o segredo DA FATURA EM ABERTO para o site completar", async () => {
    pagarFatura.mockResolvedValue("pede-confirmacao");
    segredoDaFatura.mockReset().mockResolvedValue("pi_3_secret_da_fatura");
    naStripe = { status: "past_due", pagoAte: PASSADO };
    const linhas: unknown[] = [];
    const espioes = (["info", "warn", "error", "log"] as const).map((nivel) => vi.spyOn(console, nivel).mockImplementation((...args: unknown[]) => void linhas.push(...args)));
    try {
      const res = await aplicar(member);
      expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: false, confirmar: "pi_3_secret_da_fatura" }]);
      expect(segredoDaFatura.mock.calls).toEqual([["in_em_aberto"]]);
    } finally {
      espioes.forEach((espiao) => espiao.mockRestore());
    }
    // O segredo vai SÓ na resposta — nunca para o registro.
    expect(linhas.join(" ")).not.toContain("pi_3_secret_da_fatura");
  });

  it("a cobrança paga, ou recusada: nenhum segredo é pedido nem devolvido", async () => {
    expect((await aplicar(member)).body).toMatchObject({ pagou: true, confirmar: null });
    pagarFatura.mockResolvedValue("recusada");
    expect((await aplicar(member)).body).toMatchObject({ pagou: false, confirmar: null });
    expect(segredoDaFatura).not.toHaveBeenCalled();
  });

  it("o banco pede confirmação e o segredo não veio: a troca valeu do mesmo jeito — e fica registrado, com a conta e a assinatura", async () => {
    pagarFatura.mockResolvedValue("pede-confirmacao");
    segredoDaFatura.mockReset().mockResolvedValue(null);
    naStripe = { status: "past_due", pagoAte: PASSADO };
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await aplicar(member);
      expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: false, confirmar: null }]);
      const linhas = aviso.mock.calls.flat().join(" ");
      expect(linhas).toContain("pede confirmação do banco");
      expect(linhas).toContain(SUB);
      expect(linhas).toContain(memberId);
    } finally {
      aviso.mockRestore();
    }
  });

  it("outro já está sincronizando esta assinatura: a troca NÃO espera a trava (esperar seguraria conexão do banco) — e vale", async () => {
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
    const alarme = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await aplicar(member);
      expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: true, confirmar: null }]);
      // Não entrou na fila: a Stripe nem foi consultada pela sincronia, e o espelho fica para quem tem a trava (e para o aviso).
      expect(buscarAssinatura).not.toHaveBeenCalled();
      expect((await espelho()).status).toBe("past_due");
      // Trava ocupada não é alarme: quem a tem está acertando o espelho.
      expect(alarme).not.toHaveBeenCalled();
    } finally {
      alarme.mockRestore();
      soltar();
      await segurando;
    }
  });

  it("o cartão novo também foi recusado: não é erro — a troca valeu, e o espelho continua atrasado", async () => {
    pagarFatura.mockResolvedValue("recusada");
    naStripe = { status: "past_due", pagoAte: PASSADO };
    const res = await aplicar(member);
    expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: false, confirmar: null }]);
    expect((await espelho()).status).toBe("past_due");
  });

  // Com a cobrança atrasada há mais de 3 dias a conta está SEM as aulas (etapa 4.6b): pagou e a
  // sincronia falhou é alguém pagando e trancado fora até o aviso chegar — precisa de gente.
  it("a sincronia falhou depois de pagar: a troca valeu — e, com a conta ainda sem aulas, é ERRO no registro (pagou e está trancado fora)", async () => {
    buscarAssinatura.mockRejectedValue(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const alarme = vi.spyOn(console, "error").mockImplementation(() => {});
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await aplicar(member);
      expect([res.status, res.body]).toEqual([200, { cartao: MASTER, pagou: true, confirmar: null }]);
      expect((await espelho()).status).toBe("past_due");
      const linhas = alarme.mock.calls.flat().join(" ");
      expect(linhas).toContain(`[stripe] trocar cartão: a conta ${memberId} pagou a fatura em aberto da assinatura ${SUB}`);
      expect(linhas).toContain("trancado fora");
    } finally {
      alarme.mockRestore();
      aviso.mockRestore();
    }
  });

  it("a sincronia falhou depois de pagar, mas a conta TEM as aulas (ainda nos 3 dias): só o aviso — ninguém está trancado", async () => {
    await comEspelho("past_due", new Date(Date.now() - 24 * 60 * 60 * 1000));
    buscarAssinatura.mockRejectedValue(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const alarme = vi.spyOn(console, "error").mockImplementation(() => {});
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await aplicar(member)).body).toMatchObject({ pagou: true });
      expect(aviso.mock.calls.flat().join(" ")).toContain("ficou para o aviso");
      expect(alarme).not.toHaveBeenCalled();
    } finally {
      alarme.mockRestore();
      aviso.mockRestore();
    }
  });

  it("o cartão novo foi recusado e a sincronia falhou: ninguém pagou — só o aviso, sem alarme", async () => {
    pagarFatura.mockResolvedValue("recusada");
    buscarAssinatura.mockRejectedValue(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const alarme = vi.spyOn(console, "error").mockImplementation(() => {});
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect((await aplicar(member)).body).toMatchObject({ pagou: false });
      expect(alarme).not.toHaveBeenCalled();
    } finally {
      alarme.mockRestore();
      aviso.mockRestore();
    }
  });

  it("a cobrança da fatura falhou por outro motivo (a Stripe fora do ar): 500, e não 'pagamento confirmado'", async () => {
    pagarFatura.mockRejectedValue(new Error("[stripe] a cobrança da fatura em aberto falhou: StripeAPIError"));
    expect((await aplicar(member)).status).toBe(500);
  });
});

describe("POST /api/billing/cartao/aplicar — sem cobrança atrasada, nada é cobrado", () => {
  it("assinatura em dia: a troca do cartão não cobra nada nem mexe no espelho", async () => {
    await aplicar(member);
    expect(pagarFatura).not.toHaveBeenCalled();
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("em dia com a fatura da renovação ainda aberta (a Stripe está cobrando): não cobra por cima", async () => {
    detalhes = { faturaEmAbertoId: "in_da_renovacao" };
    await aplicar(member);
    expect(pagarFatura).not.toHaveBeenCalled();
  });
});
