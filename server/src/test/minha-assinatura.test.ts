import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { DetalhesDaAssinatura } from "../lib/stripe-assinatura.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê — a busca dos detalhes da
// assinatura e a prévia da próxima cobrança. A regra (qual assinatura é a da conta, o que a tela
// recebe) roda de verdade, contra o banco.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
const buscarProximaCobranca = vi.fn<(id: string) => Promise<{ centavos: number; moeda: string } | null>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
  buscarProximaCobranca: (id: string) => buscarProximaCobranca(id),
}));

// A busca que a SINCRONIA faz na Stripe: a leitura a chama quando descobre que o espelho dá um
// acesso que a Stripe diz que acabou.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { registrarAssinaturaDesconhecida } from "../lib/minha-assinatura.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// MINHA ASSINATURA — LER (Fase 4, etapa 4.6). O que estes testes protegem:
//   - nada sai sem login, e sem login a Stripe nem é consultada;
//   - a assinatura é SEMPRE a da conta da sessão: o pedido não tem como apontar outra, e a de
//     outra conta nunca é buscada nem mostrada;
//   - nenhum código da Stripe (assinatura, cliente, preço, cartão) chega ao navegador;
//   - "tem acesso?" é a regra do gate: o que a tela diz nunca discorda do que a aula faz;
//   - a próxima cobrança é a conta da STRIPE, e só é pedida para a assinatura que renova;
//   - a Stripe fora do ar é falha (500), nunca um dado velho; a assinatura que ela não conhece é
//     404 — aviso fora de produção (é a de mentira do seed), ERRO em produção (acesso sem
//     assinatura na fonte canônica);
//   - o espelho dá acesso e a Stripe diz que acabou (o aviso do fim se perdeu): a leitura ACERTA
//     o espelho pela rotina de sempre — senão as aulas seguiriam abertas sem pagar;
//   - a Stripe diz que a assinatura é de OUTRA conta: nada dela é mostrado, e alguém é avisado.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
const EM_30_DIAS = new Date(Date.now() + 30 * DIA);
const VISA = { bandeira: "visa", final: "4242", mes: 12, ano: 2028 };
const outro = `outra-conta-${S}`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let member: string[] = [];
let memberId = "";

const ler = (cookies: string[] = []) => request(servidor).get("/api/billing/minha-assinatura").set("Cookie", cookies);
const doSeed = (status: string, currentPeriodEnd: Date | null) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });

/** O que a Stripe diz de cada assinatura, por id: a que não estiver aqui, ela não conhece. */
let naStripe: Record<string, Partial<DetalhesDaAssinatura>> = {};
const ativa = (): Partial<DetalhesDaAssinatura> => ({ status: "active", pagoAte: EM_30_DIAS, fimDoPeriodo: EM_30_DIAS });

async function entrar(): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}

beforeAll(async () => {
  member = await entrar();
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
  await prisma.user.create({ data: { id: outro, email: `${outro}@teste.local` } });
});

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  naStripe = {};
  buscarDetalhes.mockReset().mockImplementation(async (id) => {
    const dados = naStripe[id];
    if (!dados) throw new AssinaturaNaoEncontrada(id);
    return { id, status: "active", pagoAte: null, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: null, comecouEm: null, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: VISA, clienteId: "cus_da_conta", userId: null, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...dados };
  });
  buscarAssinatura.mockReset().mockRejectedValue(new Error("a sincronia não devia ter sido chamada"));
  buscarProximaCobranca.mockReset().mockResolvedValue({ centavos: 9990, moeda: "brl" });
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

describe("GET /api/billing/minha-assinatura — quem entra", () => {
  it("sem login: 401, e a Stripe nem é consultada", async () => {
    expect((await ler()).status).toBe(401);
    expect(buscarDetalhes).not.toHaveBeenCalled();
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  it("sem a chave da Stripe: 503, sem consultar nada", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await ler(member);
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "NaoConfigurado" });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("a resposta é por conta: nada fica em cache", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    expect((await ler(member)).headers["cache-control"]).toBe("private, no-store");
  });
});

describe("GET /api/billing/minha-assinatura — a conta sem acesso", () => {
  it("nunca assinou (só uma tentativa que não se completou): nenhuma — e a Stripe nem é consultada", async () => {
    await doSeed("incomplete_expired", PASSADO);
    const res = await ler(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ situacao: "nenhuma" });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("já foi assinante e o período pago venceu: terminada, com o dia em que terminou", async () => {
    await doSeed("canceled", PASSADO);
    const res = await ler(member);
    expect(res.body).toEqual({ situacao: "terminada", terminouEm: PASSADO.toISOString() });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });

  it("duas assinaturas terminadas: vale o fim mais recente; sem data nenhuma, sem data", async () => {
    const maisNova = new Date("2024-06-01T00:00:00Z");
    await doSeed("canceled", PASSADO);
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "canceled", currentPeriodEnd: maisNova, stripeSubscriptionId: `sub_${S}_velha` } });
    expect((await ler(member)).body).toEqual({ situacao: "terminada", terminouEm: maisNova.toISOString() });
    await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: `sub_${S}_velha` } });
    await doSeed("unpaid", null);
    expect((await ler(member)).body).toEqual({ situacao: "terminada", terminouEm: null });
  });
});

describe("GET /api/billing/minha-assinatura — a conta com acesso", () => {
  it("ativa e renovando: o plano, o preço, o cartão e a próxima cobrança — o valor é o que a Stripe calculou", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    // Com desconto, a renovação custa menos que o preço cheio: a tela mostra o que será cobrado.
    buscarProximaCobranca.mockResolvedValue({ centavos: 4995, moeda: "brl" });
    const res = await ler(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      situacao: "ativa",
      plano: "mensal",
      preco: { centavos: 9990, moeda: "brl" },
      proximaCobranca: { centavos: 4995, moeda: "brl", em: EM_30_DIAS.toISOString() },
      acessoAte: null,
      cartao: VISA,
      aceitaCartao: true,
      // Renova: dá para parar a renovação; não há o que desfazer.
      podeParar: true,
      podeManter: false,
      // Em dia: cancelar é parar a renovação, não terminar na hora.
      terminaAoCancelar: false,
      // Fora do prazo do reembolso (ou sem a data de início): a saída não existe.
      reembolso: null,
      // Renova e é de um dos dois planos: dá para mudar; e não há troca marcada.
      podeMudarDePlano: true,
      trocaMarcada: null,
    });
    expect(buscarProximaCobranca).toHaveBeenCalledWith(ASSINATURA_DE_TESTE);
  });

  it("nenhum código da Stripe chega ao navegador", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    const texto = JSON.stringify((await ler(member)).body);
    for (const trecho of [ASSINATURA_DE_TESTE, "sub_", "cus_", "price_", "pm_"]) expect(texto, trecho).not.toContain(trecho);
  });

  it("a renovação foi parada: vai cancelar, com acesso até a data — e a próxima cobrança nem é pedida", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), acabaEm: EM_30_DIAS };
    const res = await ler(member);
    // A renovação parada pode ser retomada: ela continua aceitando cartão novo, e a tela oferece
    // "Manter a assinatura" — parar de novo, não.
    expect(res.body).toMatchObject({ situacao: "vai-cancelar", acessoAte: EM_30_DIAS.toISOString(), proximaCobranca: null, plano: "mensal", aceitaCartao: true, podeParar: false, podeManter: true });
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  it("a assinatura já encerrou e ainda tem dias pagos: acesso até o fim deles", async () => {
    await doSeed("canceled", EM_30_DIAS);
    naStripe[ASSINATURA_DE_TESTE] = { status: "canceled", pagoAte: EM_30_DIAS, fimDoPeriodo: EM_30_DIAS };
    // Encerrada de vez: não cobra mais nada, então a tela não oferece trocar o cartão — nem
    // voltar atrás: cancelada é estado final na Stripe.
    expect((await ler(member)).body).toMatchObject({ situacao: "vai-cancelar", acessoAte: EM_30_DIAS.toISOString(), proximaCobranca: null, aceitaCartao: false, podeParar: false, podeManter: false });
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  // A COBRANÇA ATRASADA (etapa 4.6b — decisão do operador, 11/10/2026): as aulas ficam abertas
  // por 3 dias depois da cobrança que falhou. O "pago até" de uma atrasada é esse dia.
  it("a última cobrança falhou há menos de 3 dias: atrasada, com a data em que as aulas trancam — sem próxima cobrança nem data de fim", async () => {
    const falhou = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await doSeed("past_due", falhou);
    naStripe[ASSINATURA_DE_TESTE] = { status: "past_due", pagoAte: falhou, fimDoPeriodo: EM_30_DIAS };
    const tresDiasDepois = new Date(falhou.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect((await ler(member)).body).toEqual({ situacao: "atrasada", plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, proximaCobranca: null, acessoAte: null, cartao: VISA, aceitaCartao: true, podeParar: false, podeManter: false, terminaAoCancelar: true, reembolso: null, podeMudarDePlano: false, trocaMarcada: null, aulasAte: tresDiasDepois, aulasTrancadas: false });
    expect(buscarProximaCobranca).not.toHaveBeenCalled();
  });

  // Passados os 3 dias a conta fica SEM as aulas — e a assinatura continua sendo "a da conta":
  // é nela que a pessoa troca o cartão. Dizer "terminou" a mandaria assinar de novo, por cima.
  it("a cobrança falhou há mais de 3 dias: continua 'atrasada' (nunca 'terminada'), com as aulas trancadas e o cartão para trocar", async () => {
    await doSeed("past_due", PASSADO);
    naStripe[ASSINATURA_DE_TESTE] = { status: "past_due", pagoAte: PASSADO, fimDoPeriodo: EM_30_DIAS };
    const res = await ler(member);
    expect(res.body).toMatchObject({ situacao: "atrasada", aulasAte: "2020-01-04T00:00:00.000Z", aulasTrancadas: true, cartao: VISA, aceitaCartao: true, terminaAoCancelar: true });
    expect((await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).body).toMatchObject({ temAcesso: false, atrasada: true });
  });

  it("sem cartão guardado (a assinatura de cortesia): o cartão vem vazio", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), cartao: null };
    buscarProximaCobranca.mockResolvedValue({ centavos: 0, moeda: "brl" });
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa", cartao: null, proximaCobranca: { centavos: 0 } });
  });


  it("uma assinatura antiga encerrada e uma nova ativa: a tela mostra a que dá acesso", async () => {
    await doSeed("canceled", PASSADO);
    const nova = `sub_${S}_nova`;
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: nova } });
    naStripe[nova] = { ...ativa(), plano: "anual", preco: { centavos: 99500, moeda: "brl" } };
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa", plano: "anual" });
    expect(buscarDetalhes.mock.calls.map(([id]) => id)).toEqual([nova]);
  });
});

describe("GET /api/billing/minha-assinatura — a assinatura é a da conta da sessão", () => {
  it("a de OUTRA conta nunca é buscada nem mostrada, e o pedido não tem como apontá-la", async () => {
    const alheia = `sub_${S}_alheia`;
    await prisma.subscription.create({ data: { ownerUserId: outro, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: alheia } });
    naStripe[alheia] = { ...ativa(), plano: "anual" };
    await doSeed("canceled", PASSADO);
    const res = await request(servidor).get(`/api/billing/minha-assinatura?assinatura=${alheia}&userId=${outro}`).set("Cookie", member);
    expect(res.body).toEqual({ situacao: "terminada", terminouEm: PASSADO.toISOString() });
    expect(buscarDetalhes).not.toHaveBeenCalled();
  });
});

// O CONTRÁRIO do bloco de baixo (etapa 4.6b): quem está atrasado há mais de 3 dias fica sem as
// aulas pelo espelho. Se uma nova tentativa da Stripe PASSA e o aviso se perde, é alguém pagando
// e trancado fora — e a tela de assinar manda essa pessoa para cá. É aqui que se acerta.
describe("GET /api/billing/minha-assinatura — o espelho NÃO dá acesso (atrasada há mais de 3 dias) e a Stripe diz que dá", () => {
  const paga = { id: ASSINATURA_DE_TESTE, status: "active", pagoAte: EM_30_DIAS, clienteId: null, userId: null, livemode: false };
  beforeEach(async () => {
    await doSeed("past_due", PASSADO);
    naStripe[ASSINATURA_DE_TESTE] = ativa();
  });

  it("a tela diz 'ativa' E o espelho é acertado na hora: as aulas voltam, e a pessoa continua logada", async () => {
    buscarAssinatura.mockResolvedValue(paga);
    expect(await temAcessoAtivo(memberId)).toBe(false);
    const res = await ler(member);
    expect([res.status, res.body.situacao]).toEqual([200, "ativa"]);
    const espelho = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE } });
    expect([espelho.status, espelho.currentPeriodEnd?.getTime()]).toEqual(["active", EM_30_DIAS.getTime()]);
    expect(await temAcessoAtivo(memberId)).toBe(true);
    expect((await ler(member)).status).toBe(200);
  });

  it("a sincronia falha: a tela responde do mesmo jeito, o espelho fica como estava — e é ERRO no registro (alguém pagando e trancado fora)", async () => {
    buscarAssinatura.mockRejectedValue(new Error("a Stripe caiu"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await ler(member);
      expect([res.status, res.body.situacao]).toEqual([200, "ativa"]);
      expect((await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE } })).status).toBe("past_due");
      const linhas = erro.mock.calls.flat().join(" ");
      expect(linhas).toContain(`[stripe] minha assinatura: a conta ${memberId} está sem acesso pelo espelho da assinatura ${ASSINATURA_DE_TESTE}`);
      expect(linhas).toContain("trancado fora");
    } finally {
      erro.mockRestore();
    }
  });

  it("a Stripe TAMBÉM diz atrasada (ninguém pagou): nada a acertar — nenhuma sincronia, e as aulas seguem trancadas", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { status: "past_due", pagoAte: PASSADO };
    expect((await ler(member)).body).toMatchObject({ situacao: "atrasada", aulasTrancadas: true });
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(await temAcessoAtivo(memberId)).toBe(false);
  });

  // Atrasada por mais de um ciclo: a Stripe diz o começo do período NOVO, e o espelho guarda a
  // primeira falha. Quem diz se as aulas estão trancadas é o GATE — a tela não promete data.
  it("a Stripe diz atrasada com data NOVA (o ciclo virou) e o espelho guarda a primeira falha: a tela diz 'aulas trancadas', sem sincronizar", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { status: "past_due", pagoAte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    expect((await ler(member)).body).toMatchObject({ situacao: "atrasada", aulasTrancadas: true });
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(await temAcessoAtivo(memberId)).toBe(false);
  });

  it("o espelho e a Stripe de acordo, com acesso: nenhuma sincronia", async () => {
    await doSeed("active", FUTURO);
    expect((await ler(member)).body.situacao).toBe("ativa");
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });
});

// A conta com DUAS linhas: a que dá acesso vem primeiro, como sempre foi. A atrasada sem aulas
// só é "a assinatura da conta" quando não há outra (etapa 4.6b).
describe("GET /api/billing/minha-assinatura — a atrasada sem aulas não passa na frente da que dá acesso", () => {
  it("uma linha com acesso e outra, mais nova, atrasada há mais de 3 dias: a tela mostra a que dá acesso", async () => {
    const atrasada = `sub_${S}_atrasada_mais_nova`;
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "past_due", currentPeriodEnd: PASSADO, stripeSubscriptionId: atrasada } });
    naStripe[atrasada] = { status: "past_due", pagoAte: PASSADO };
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    expect((await ler(member)).body.situacao).toBe("ativa");
    expect(buscarDetalhes.mock.calls).toEqual([[ASSINATURA_DE_TESTE]]);
  });
});

describe("GET /api/billing/minha-assinatura — o espelho dá acesso e a Stripe diz que acabou", () => {
  const perdida = `sub_${S}_aviso_perdido`;
  beforeEach(async () => {
    // A de mentira do seed sai de cena: o acesso da conta vem SÓ da assinatura cujo aviso se perdeu.
    await doSeed("canceled", PASSADO);
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: perdida } });
    naStripe[perdida] = { status: "canceled", pagoAte: PASSADO };
  });

  it("a tela diz 'terminada' E o espelho é acertado pela rotina de sempre: o gate tranca e a sessão cai, como em toda perda de acesso", async () => {
    buscarAssinatura.mockResolvedValue({ id: perdida, status: "canceled", pagoAte: PASSADO, clienteId: null, userId: memberId, livemode: false });
    expect(await temAcessoAtivo(memberId)).toBe(true);
    try {
      const res = await ler(member);
      expect([res.status, res.body]).toEqual([200, { situacao: "terminada", terminouEm: PASSADO.toISOString() }]);
      const espelho = await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: perdida } });
      expect([espelho.status, espelho.currentPeriodEnd?.getTime()]).toEqual(["canceled", PASSADO.getTime()]);
      expect(await temAcessoAtivo(memberId)).toBe(false);
      // A regra de sempre (CLAUDE.md → Access Architecture): perdeu o acesso, a sessão cai.
      expect((await ler(member)).status).toBe(401);
    } finally {
      member = await entrar();
    }
  });

  it("a sincronia falha: a tela responde do mesmo jeito, o espelho fica como estava — e é ERRO no registro (alguém segue com acesso sem pagar)", async () => {
    buscarAssinatura.mockRejectedValue(new Error("[stripe] a busca da assinatura falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await ler(member);
      expect([res.status, res.body]).toEqual([200, { situacao: "terminada", terminouEm: PASSADO.toISOString() }]);
      expect((await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: perdida } })).status).toBe("active");
      expect(erro.mock.calls.flat().join(" ")).toContain(`a conta ${memberId} segue com acesso pelo espelho da assinatura ${perdida}`);
    } finally {
      erro.mockRestore();
    }
  });

  it("assinatura em dia: a leitura NÃO sincroniza nada (ler não grava)", async () => {
    naStripe[perdida] = ativa();
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa" });
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });
});

describe("GET /api/billing/minha-assinatura — a Stripe diz que a assinatura é de OUTRA conta", () => {
  it("nada dela é mostrado (404) e o registro grita: a linha do espelho está errada", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), userId: outro };
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await ler(member);
      expect([res.status, res.body]).toEqual([404, { error: "AssinaturaDesconhecida" }]);
      expect(buscarProximaCobranca).not.toHaveBeenCalled();
      expect(erro.mock.calls.flat().join(" ")).toContain(`a Stripe diz que é da conta ${outro}`);
    } finally {
      erro.mockRestore();
    }
  });

  it("a Stripe diz que é desta conta, ou não diz de quem é (vale o dono do espelho): mostra", async () => {
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), userId: memberId };
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa" });
    naStripe[ASSINATURA_DE_TESTE] = { ...ativa(), userId: null };
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa" });
  });
});

describe("GET /api/billing/minha-assinatura — quando a Stripe não ajuda", () => {
  it("a Stripe não conhece a assinatura que dá acesso (a de mentira do seed): 404, sem inventar dado — e fica registrado", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const res = await ler(member);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "AssinaturaDesconhecida" });
      expect(aviso.mock.calls.flat().join(" ")).toContain(`a conta ${memberId} tem acesso por uma assinatura que a Stripe não conhece`);
    } finally {
      aviso.mockRestore();
    }
  });

  it("o registro desse caso: AVISO fora de produção (a de mentira do seed), ERRO em produção (acesso sem assinatura de verdade)", () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      registrarAssinaturaDesconhecida("u-1", "minha assinatura", false);
      expect([aviso.mock.calls.length, erro.mock.calls.length]).toEqual([1, 0]);
      registrarAssinaturaDesconhecida("u-1", "minha assinatura", true);
      expect([aviso.mock.calls.length, erro.mock.calls.length]).toEqual([1, 1]);
      // Com a etiqueta nossa: sem ela, a linha de erro não vira alerta (CLAUDE.md → Server).
      expect(String(erro.mock.calls[0]?.[0])).toMatch(/^\[stripe\] minha assinatura: a conta u-1 /);
    } finally {
      aviso.mockRestore();
      erro.mockRestore();
    }
  });

  it("a mais nova ela não conhece, a outra sim: mostra a que ela conhece", async () => {
    const fantasma = `sub_${S}_fantasma`;
    await prisma.subscription.create({ data: { ownerUserId: memberId, status: "active", currentPeriodEnd: EM_30_DIAS, stripeSubscriptionId: fantasma } });
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    expect((await ler(member)).body).toMatchObject({ situacao: "ativa" });
    expect(buscarDetalhes.mock.calls.map(([id]) => id)).toEqual([fantasma, ASSINATURA_DE_TESTE]);
  });

  it("a Stripe fora do ar: 500, sem plano, sem cartão e sem a mensagem dela", async () => {
    buscarDetalhes.mockRejectedValue(new Error("[stripe] a busca dos detalhes da assinatura falhou: StripeConnectionError"));
    const res = await ler(member);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "ErroInterno" });
  });

  it("a prévia da próxima cobrança falha: 500 — a tela não mostra a assinatura com o valor faltando", async () => {
    naStripe[ASSINATURA_DE_TESTE] = ativa();
    buscarProximaCobranca.mockRejectedValue(new Error("[stripe] a prévia da próxima cobrança falhou: StripeAPIError"));
    expect((await ler(member)).status).toBe(500);
  });
});
