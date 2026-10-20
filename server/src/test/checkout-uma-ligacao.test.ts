import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import request from "supertest";
import type { AssinaturaNaStripe, AssinaturaNoCheckout, PrecoDoPlano } from "../lib/stripe.js";

// O CHECKOUT COM UMA LIGAÇÃO SÓ COM O BANCO (Fase 4, etapa 4.7, passo 2 — o achado P1 da revisão
// de segurança da 4.4: "quem tem a trava ainda pede uma SEGUNDA conexão para ler o gate e o
// cliente"). Neste arquivo o banco aceita UMA ligação. Se o checkout, com uma trava na mão (que
// segura a ligação), pedisse outra — para ler o gate, o cliente ou o espelho —, ela nunca viria:
// o pedido esperaria o prazo do banco e cairia em erro. É o retrato do dia ruim — com as ligações
// todas presas, o site para — em miniatura. Cobre as TRÊS transações com trava do caminho: a do
// cliente, a principal e a sincronia da assinatura viva.
// Cada arquivo de teste roda no próprio processo (o padrão do Vitest): o endereço com uma ligação
// não passa para os outros — e é devolvido no fim, de qualquer jeito.

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê.
const criarCliente = vi.fn<() => Promise<{ id: string; livemode: boolean }>>();
const assinaturasDoCliente = vi.fn<() => Promise<AssinaturaNoCheckout[]>>();
const criarAssinatura = vi.fn<() => Promise<AssinaturaNoCheckout | null>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: async () => PRECOS,
  criarCliente: () => criarCliente(),
  assinaturasDoCliente: () => assinaturasDoCliente(),
  criarAssinatura: () => criarAssinatura(),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

// UMA ligação, e o prazo curto: o pedido que esperasse uma segunda falharia em 3 s, não em 10.
// Antes de o app ser carregado — é na carga que o cliente do banco lê o endereço.
const enderecoOriginal = process.env.DATABASE_URL;
const endereco = new URL(enderecoOriginal ?? "");
endereco.searchParams.set("connection_limit", "1");
endereco.searchParams.set("pool_timeout", "3");
process.env.DATABASE_URL = endereco.toString();
const { default: servidor } = (await import("./servidor.js")) as { default: Server };
const { prisma } = await import("../lib/prisma.js");
const { ASSINATURA_DE_TESTE } = await import("../lib/assinatura-de-teste.js");

const CHAVES = { STRIPE_SECRET_KEY: "sk_test_da_suite_local", STRIPE_PUBLISHABLE_KEY: "pk_test_da_suite_local" } as const;
const antes = Object.fromEntries(Object.keys(CHAVES).map((nome) => [nome, process.env[nome]]));
const VIVA = "sub_uma_ligacao_viva";
let member: string[] = [];
let memberId = "";

beforeAll(async () => {
  Object.assign(process.env, CHAVES);
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  // Sem acesso: a assinatura de teste do member@ vencida (devolvida no fim).
  await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: VIVA } });
  await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  for (const [nome, valor] of Object.entries(antes)) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
  process.env.DATABASE_URL = enderecoOriginal;
});

describe("assinar com o banco aceitando UMA ligação", () => {
  // Sem a premissa, os outros testes daqui não provariam nada: passariam com qualquer número de ligações.
  it("a premissa: com a única ligação presa numa transação, outra consulta espera — e falha no prazo", async () => {
    let soltar!: () => void;
    let presa!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const ligacaoPresa = new Promise<void>((ok) => (presa = ok));
    const transacao = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1`;
      presa();
      await segura;
    }, { timeout: 20_000 });
    await ligacaoPresa;
    try {
      await expect(prisma.user.count()).rejects.toMatchObject({ code: "P2024" });
    } finally {
      soltar();
      await transacao;
    }
  });

  it("o cliente novo e a assinatura saem — e, de novo, com o cliente já gravado: nada pede uma segunda ligação com a trava na mão", async () => {
    let n = 0;
    criarCliente.mockImplementation(async () => ({ id: `cus_uma_ligacao_${++n}`, livemode: false }));
    const lista: AssinaturaNoCheckout[] = [];
    assinaturasDoCliente.mockImplementation(async () => lista);
    criarAssinatura.mockImplementation(async () => {
      const nova: AssinaturaNoCheckout = { id: `sub_uma_ligacao_${++n}`, status: "incomplete", precoId: "price_mensal", codigoId: null, segredoDoPagamento: "pi_uma_ligacao_secret_x", segredoDoCartao: null };
      lista.push(nova);
      return nova;
    });

    const primeiro = await request(servidor).post("/api/billing/assinatura").set("Cookie", member).send({ plano: "mensal" });
    expect([primeiro.status, primeiro.body]).toEqual([200, { estado: "pagar", segredo: "pi_uma_ligacao_secret_x", tipo: "pagamento" }]);
    // O cliente ficou gravado, na transação curta só dele.
    expect((await prisma.stripeCustomer.findUnique({ where: { userId: memberId } }))?.stripeCustomerId).toBe("cus_uma_ligacao_1");

    const segundo = await request(servidor).post("/api/billing/assinatura").set("Cookie", member).send({ plano: "mensal" });
    expect([segundo.status, segundo.body.segredo]).toEqual([200, "pi_uma_ligacao_secret_x"]);
    expect(criarCliente).toHaveBeenCalledTimes(1);
    expect(criarAssinatura).toHaveBeenCalledTimes(1);
  });

  it("a Stripe diz que há assinatura viva e o espelho não sabe: a sincronia (com a trava DA ASSINATURA) também roda numa ligação só — e responde 'já é assinante', com o espelho gravado", async () => {
    assinaturasDoCliente.mockResolvedValue([{ id: VIVA, status: "active", precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null }]);
    buscarAssinatura.mockResolvedValue({ id: VIVA, status: "active", pagoAte: new Date(Date.now() + 30 * 24 * 3600 * 1000), clienteId: "cus_uma_ligacao_1", userId: memberId, livemode: false });
    const res = await request(servidor).post("/api/billing/assinatura").set("Cookie", member).send({ plano: "mensal" });
    expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
    expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: VIVA }, select: { ownerUserId: true, status: true } })).toEqual({ ownerUserId: memberId, status: "active" });
  });
});
