import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe, AssinaturaNoCheckout } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// A TELA DE DEPOIS DO PAGAMENTO PEDE CONFERÊNCIA (E2 da revisão ampla da cobrança, 29/10/2026). A Stripe na NOSSA
// fronteira (o que ela diz das assinaturas do cliente) vira dublê; a sincronia roda de verdade, contra o banco. O que
// protege: o aviso perdido é recuperado pela conferência — logado, o acesso abre; sem conta, a conta NASCE (com as
// boas-vindas) e a pergunta "já valeu?" passa a dizer sim —; só a conta da sessão (ou a ficha da tentativa); quem
// já tem acesso nem vai à Stripe; a trava ocupada NÃO é esperada; a tentativa desconhecida não diz nada; os tetos.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
}));
// Os Pix do cliente: a conferência os lê ANTES das assinaturas (o Pix pago cujo aviso se perdeu vira assinatura ali).
const listarPixDoCliente = vi.fn<(clienteId: string) => Promise<{ pagos: never[]; pendentes: never[] }>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  listarPixDoCliente: (clienteId: string) => listarPixDoCliente(clienteId),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { resumoDaTentativa } from "../lib/tentativa-do-visitante.js";
import { LIMITES, LIMITES_DO_VISITANTE, zerarLimitesDeTentativas } from "../lib/limite-de-tentativas.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_conferir_${S}_${++n}`;
const novoEmail = () => `conferir-${++n}-${S}@teste.local`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let member: string[] = [];
let memberId = "";

const viva = (id: string): AssinaturaNoCheckout => ({ id, status: "active", precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null });
const naStripe = (id: string, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({ id, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: "cus_x", userId: memberId, livemode: false, ...dados });
const conferir = (cookies: string[] = member) => request(servidor).post("/api/billing/conferir").set("Cookie", cookies).send({});
const conferirSemLogin = (tentativa: string, endereco = "192.0.2.10") => request(servidor).post("/api/billing/visitante/conferir").set("x-forwarded-for", endereco).send({ tentativa });

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

/** Roda o bloco com a assinatura de teste do member@ vencida (sem acesso), e devolve ela ao fim. */
async function semAcesso(fn: () => Promise<void>) {
  await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
  try {
    await fn();
  } finally {
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
  }
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  expect(member.length).toBeGreaterThan(0);
  memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
});
beforeEach(async () => {
  await zerarLimitesDeTentativas();
  buscarAssinatura.mockReset().mockRejectedValue(new Error("este teste não combinou o que a Stripe diz da assinatura"));
  assinaturasDoCliente.mockReset().mockResolvedValue([]);
  listarPixDoCliente.mockReset().mockResolvedValue({ pagos: [], pendentes: [] });
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "email_da_suite" });
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
});
afterEach(async () => {
  vi.restoreAllMocks();
  // Cada teste começa sem as assinaturas que o anterior gravou: senão o aluno já "tem acesso", e a conferência nem
  // vai à Stripe — o teste passaria sem provar nada (a mutação achou isso).
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `conferir_${S}` } } });
});
afterAll(async () => {
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `conferir_${S}` } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("POST /api/billing/conferir — logado", () => {
  it("sem login: 401; sem a cobrança configurada: 503 — e nada vai à Stripe", async () => {
    expect((await conferir([])).status).toBe(401);
    delete process.env.STRIPE_SECRET_KEY;
    try {
      expect((await conferir()).status).toBe(503);
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
    }
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
  });

  it("quem já tem acesso: 204, e nem vai à Stripe — mesmo com cliente na Stripe", async () => {
    await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: novoId("cus"), livemode: false } });
    expect(await temAcessoAtivo(memberId)).toBe(true);
    expect((await conferir()).status).toBe(204);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
    expect(listarPixDoCliente).not.toHaveBeenCalled();
  });

  it("sem acesso, e a Stripe diz que há uma assinatura viva (o aviso se perdeu): a conferência grava o espelho e o acesso abre", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await semAcesso(async () => {
      const cliente = novoId("cus");
      await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: cliente, livemode: false } });
      const sub = novoId("sub");
      assinaturasDoCliente.mockResolvedValue([viva(sub), { ...viva(novoId("sub")), status: "incomplete_expired" }]);
      buscarAssinatura.mockImplementation(async (id) => naStripe(id, { clienteId: cliente }));
      expect((await conferir()).status).toBe(204);
      expect(assinaturasDoCliente).toHaveBeenCalledWith(cliente);
      expect(listarPixDoCliente).toHaveBeenCalledWith(cliente);
      // A que expirou sem o primeiro pagamento não gasta ida à Stripe.
      expect(buscarAssinatura.mock.calls).toEqual([[sub]]);
      expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub } })).toMatchObject({ ownerUserId: memberId, status: "active" });
      expect(await temAcessoAtivo(memberId)).toBe(true);
    });
  });

  // C5 da revisão do grupo 1 (29/10/2026): a cancelada com dias pagos ainda dá acesso pelo gate, e o aviso dela também
  // pode ter se perdido.
  it("a Stripe diz que a assinatura foi cancelada com dias pagos (o aviso se perdeu): a conferência a sincroniza e o acesso abre até o fim dos dias pagos", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await semAcesso(async () => {
      const cliente = novoId("cus");
      await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: cliente, livemode: false } });
      const sub = novoId("sub");
      const pagoAte = new Date(Date.now() + 10 * DIA);
      // R4: a cancelada que já acabou (a pré-paga de um Pix antigo) não gasta ida à Stripe.
      const acabada = { ...viva(novoId("sub")), status: "canceled", fimDoPeriodo: new Date(Date.now() - DIA) };
      assinaturasDoCliente.mockResolvedValue([acabada, { ...viva(sub), status: "canceled", fimDoPeriodo: pagoAte }]);
      buscarAssinatura.mockImplementation(async (id) => naStripe(id, { status: "canceled", pagoAte, clienteId: cliente }));
      expect(await temAcessoAtivo(memberId)).toBe(false);
      expect((await conferir()).status).toBe(204);
      expect(buscarAssinatura.mock.calls).toEqual([[sub]]);
      expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub } })).toMatchObject({ ownerUserId: memberId, status: "canceled", currentPeriodEnd: pagoAte });
      expect(await temAcessoAtivo(memberId)).toBe(true);
    });
  });

  it("a assinatura sendo sincronizada por outro (a trava ocupada): NÃO espera — 204 na hora, e o espelho fica para quem tem a trava", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await semAcesso(async () => {
      const cliente = novoId("cus");
      await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: cliente, livemode: false } });
      const sub = novoId("sub");
      assinaturasDoCliente.mockResolvedValue([viva(sub)]);
      buscarAssinatura.mockImplementation(async (id) => naStripe(id, { clienteId: cliente }));
      let soltar!: () => void;
      const segura = new Promise<void>((ok) => (soltar = ok));
      let pegou!: () => void;
      const pegouATrava = new Promise<void>((ok) => (pegou = ok));
      const outro = prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sub}))`;
        pegou();
        await segura;
      }, { timeout: 30_000 });
      await pegouATrava;
      try {
        // Sem acesso de verdade: senão a conferência nem iria à Stripe, e o teste não provaria nada.
        expect(await temAcessoAtivo(memberId)).toBe(false);
        const inicio = Date.now();
        expect((await conferir()).status).toBe(204);
        expect(Date.now() - inicio).toBeLessThan(5_000);
        expect(assinaturasDoCliente).toHaveBeenCalledWith(cliente);
        expect(buscarAssinatura).not.toHaveBeenCalled();
        expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub } })).toBeNull();
      } finally {
        soltar();
        await outro;
      }
    });
  });

  it("o teto por conta: a tela pede no máximo 5 vezes; passou do teto, 429", async () => {
    const teto = LIMITES.conferir.conta.porJanela;
    for (let i = 0; i < teto; i++) expect((await conferir()).status).toBe(204);
    expect((await conferir()).status).toBe(429);
  });
});

describe("POST /api/billing/visitante/conferir — sem conta", () => {
  /** Uma ficha de espera, com a tentativa (o resumo dela) que a tela guardou. */
  async function fichaComTentativa(tentativa: string) {
    return prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: novoEmail(), stripeCustomerId: novoId("cus"), livemode: false, tentativa: resumoDaTentativa(tentativa) } });
  }

  it("a tentativa que não existe: 204 do mesmo jeito, e nada vai à Stripe (a resposta não diz se ela existe)", async () => {
    expect((await conferirSemLogin("tentativa-que-ninguem-fez")).status).toBe(204);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
  });

  it("pagou e o aviso se perdeu: a conta NASCE pela conferência, as boas-vindas saem, e a pergunta 'já valeu?' passa a dizer sim", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const tentativa = `tentativa-${novoId("t")}`;
    const ficha = await fichaComTentativa(tentativa);
    const sub = novoId("sub");
    assinaturasDoCliente.mockResolvedValue([viva(sub)]);
    buscarAssinatura.mockImplementation(async (id) =>
      naStripe(id, { clienteId: ficha.stripeCustomerId, userId: null, pedido: ficha.id, doVisitante: { novidades: false, origem: null, campanha: null }, resumoDaTentativa: resumoDaTentativa(tentativa) }),
    );
    expect((await request(servidor).post("/api/billing/visitante/confirmacao").set("x-forwarded-for", "192.0.2.11").send({ tentativa })).body).toEqual({ confirmada: false });

    expect((await conferirSemLogin(tentativa, "192.0.2.11")).status).toBe(204);
    const conta = await prisma.user.findUnique({ where: { email: ficha.email } });
    expect(conta).not.toBeNull();
    expect(await temAcessoAtivo(conta!.id)).toBe(true);
    expect(enviarEmail.mock.calls.some(([e]) => e.tipo === "boas-vindas" && e.para === ficha.email)).toBe(true);
    expect((await request(servidor).post("/api/billing/visitante/confirmacao").set("x-forwarded-for", "192.0.2.11").send({ tentativa })).body).toEqual({ confirmada: true });

    // Já com acesso: a conferência seguinte nem vai à Stripe.
    assinaturasDoCliente.mockClear();
    expect((await conferirSemLogin(tentativa, "192.0.2.11")).status).toBe(204);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
  });

  it("o teto por endereço: passou de 10 em 15 min, 429", async () => {
    const teto = LIMITES_DO_VISITANTE.conferir.endereco.porJanela;
    for (let i = 0; i < teto; i++) expect((await conferirSemLogin("qualquer", "192.0.2.12")).status).toBe(204);
    expect((await conferirSemLogin("qualquer", "192.0.2.12")).status).toBe(429);
  });
});

// C4 da revisão do grupo 1 (29/10/2026): a tela repete o pedido a cada minuto; com a Stripe fora do ar, um 500 e um
// alerta por pedido gastariam a cota de alertas da cópia (`monitor.ts`) e calariam os que importam.
describe("a conferência pedida pela tela, com a Stripe fora do ar", () => {
  it("204 nas duas portas, sem 500 nem alerta [api]; UM alerta a cada 15 min por cópia (o relógio que volta não o cala), o resto no registro — e nada muda", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const erro = vi.spyOn(console, "error").mockImplementation(() => {});
      const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
      const alertas = () => erro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.includes("conferência pedida pela tela"));
      const inicio = Date.now();
      vi.setSystemTime(inicio);
      const tentativa = `tentativa-${novoId("t")}`;
      const ficha = await prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: novoEmail(), stripeCustomerId: novoId("cus"), livemode: false, tentativa: resumoDaTentativa(tentativa) } });
      assinaturasDoCliente.mockRejectedValue(new Error("[stripe] a lista das assinaturas do cliente falhou: api_error, status 500"));
      await semAcesso(async () => {
        const cliente = novoId("cus");
        await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: cliente, livemode: false } });

        expect((await conferir()).status).toBe(204);
        expect(assinaturasDoCliente).toHaveBeenCalledWith(cliente);
        expect(alertas()).toHaveLength(1);
        expect(alertas()[0]).toContain(`(a conta ${memberId})`);
        expect(alertas()[0]).toContain("api_error, status 500");

        vi.setSystemTime(inicio + 14 * 60_000);
        expect((await conferirSemLogin(tentativa, "192.0.2.13")).status).toBe(204);
        expect(assinaturasDoCliente).toHaveBeenCalledWith(ficha.stripeCustomerId);
        expect(alertas()).toHaveLength(1);
        expect(registro.mock.calls.some(([texto]) => String(texto).includes(`(a ficha ${ficha.id})`))).toBe(true);

        vi.setSystemTime(inicio + 15 * 60_000);
        expect((await conferir()).status).toBe(204);
        expect(alertas()).toHaveLength(2);

        vi.setSystemTime(inicio);
        expect((await conferir()).status).toBe(204);
        expect(alertas()).toHaveLength(3);

        expect(erro.mock.calls.some(([texto]) => String(texto).startsWith("[api]"))).toBe(false);
        expect(await temAcessoAtivo(memberId)).toBe(false);
        expect(await prisma.user.findUnique({ where: { email: ficha.email } })).toBeNull();
        expect(enviarEmail).not.toHaveBeenCalled();
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
