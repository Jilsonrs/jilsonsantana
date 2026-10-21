import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// Na NOSSA fronteira: a busca da assinatura (a rede da Stripe) e o balcão de e-mail. O aviso, a
// sincronia, a conta que nasce e a marca das boas-vindas rodam de verdade, contra o banco.
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

// O E-MAIL DE BOAS-VINDAS de quem assinou sem conta (Fase 4, etapa 4.7, passo 5 — decisão do
// operador, 21/10/2026). O que estes testes protegem:
//   - a conta nasce no aviso da Stripe → as boas-vindas saem UMA vez, para o e-mail da conta, com a
//     chave da conta e o botão de entrar;
//   - outro aviso da mesma assinatura não manda de novo;
//   - o envio que falhou volta a tentar no aviso seguinte — inclusive no aviso REPETIDO;
//   - quem assinou logado (sem ficha de espera) e a assinatura sem acesso não recebem;
//   - uma falha nas boas-vindas nunca derruba o 200 do aviso;
//   - o botão: em produção, só https.

const SEGREDO = "whsec_teste_da_suite_local";
const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;
const novoEmail = () => `boas-vindas-${++n}-${S}@teste.local`;

type Aviso = { id: string; type: string; data: { object: Record<string, unknown> } };
const avisoDaAssinatura = (subId: string, type = "customer.subscription.updated"): Aviso => ({ id: novoId("evt"), type, data: { object: { id: subId, object: "subscription" } } });
function enviar(aviso: Aviso) {
  const corpo = JSON.stringify({ object: "event", ...aviso }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", cabecalho).send(corpo);
}

async function novaFicha() {
  return prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: novoEmail(), stripeCustomerId: novoId("cus"), livemode: false } });
}
const paga = (sub: string, ficha: { id: string; stripeCustomerId: string }, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
  id: sub,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId: ficha.stripeCustomerId,
  userId: null,
  pedido: ficha.id,
  doVisitante: { novidades: false, origem: null, campanha: null },
  livemode: false,
  ...dados,
});
const boasVindas = () => enviarEmail.mock.calls.map(([p]) => p).filter((p) => p.tipo === "boas-vindas");
const marca = async (fichaId: string) => (await prisma.guestCheckout.findUnique({ where: { id: fichaId } }))?.boasVindasEnviadaEm ?? null;

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
  await prisma.guestCheckout.deleteMany({ where: { id: { contains: S } } });
});

describe("as boas-vindas de quem assinou sem conta", () => {
  it("a conta nasce no aviso: as boas-vindas saem UMA vez, para o e-mail da conta, com a chave dela e o botão de entrar", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(paga(sub, ficha));
    expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.created"))).status).toBe(200);

    const conta = await prisma.user.findUnique({ where: { email: ficha.email } });
    expect(conta).not.toBeNull();
    const enviados = boasVindas();
    expect(enviados).toHaveLength(1);
    const [pedido] = enviados;
    expect([pedido?.para, pedido?.chave]).toEqual([ficha.email, `boas-vindas/${conta?.id}`]);
    expect(pedido?.referencia).toBe(`conta:${conta?.id} ficha:${ficha.id}`);
    expect(pedido?.mensagem.botao?.endereco).toMatch(/\/login$/);
    expect(await marca(ficha.id)).not.toBeNull();

    // Outro aviso da mesma assinatura: não sai de novo.
    await enviar(avisoDaAssinatura(sub));
    expect(boasVindas()).toHaveLength(1);
  });

  it("o envio falhou: a marca volta a vazio, e o aviso seguinte manda", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(paga(sub, ficha));
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "falhou" });
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    expect(await marca(ficha.id)).toBeNull();

    await enviar(avisoDaAssinatura(sub));
    expect(boasVindas()).toHaveLength(2);
    expect(await marca(ficha.id)).not.toBeNull();
  });

  it("o aviso REPETIDO também tenta: a conta nasceu, o envio falhou, e a Stripe entregou o mesmo aviso de novo", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(paga(sub, ficha));
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "falhou" });
    const aviso = avisoDaAssinatura(sub, "customer.subscription.created");
    await enviar(aviso);
    expect(await marca(ficha.id)).toBeNull();

    expect((await enviar(aviso)).status).toBe(200);
    expect(boasVindas()).toHaveLength(2);
    expect(await marca(ficha.id)).not.toBeNull();
  });

  it("'duplicado' (outro envio com a mesma chave saindo agora): a marca fica — não tenta de novo", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(paga(sub, ficha));
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "duplicado" });
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    expect(await marca(ficha.id)).not.toBeNull();
    await enviar(avisoDaAssinatura(sub));
    expect(boasVindas()).toHaveLength(1);
  });

  it("quem assinou LOGADO (sem ficha de espera) e a assinatura sem acesso: nenhuma boas-vindas", async () => {
    const logado = await prisma.user.create({ data: { id: novoId("conta"), email: novoEmail() } });
    const subDoLogado = novoId("sub");
    buscarAssinatura.mockResolvedValue({ ...paga(subDoLogado, { id: "", stripeCustomerId: "cus_x" }), pedido: null, userId: logado.id });
    await enviar(avisoDaAssinatura(subDoLogado, "customer.subscription.created"));

    // A conta nasceu, e a assinatura acabou antes de as boas-vindas saírem (a primeira falhou).
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(paga(sub, ficha));
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "falhou" });
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    buscarAssinatura.mockResolvedValue(paga(sub, ficha, { status: "canceled", pagoAte: new Date(Date.now() - DIA) }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.deleted"));

    // Só a tentativa que falhou — nenhuma para o logado, nenhuma depois de acabar.
    expect(boasVindas()).toHaveLength(1);
    expect(boasVindas()[0]?.para).toBe(ficha.email);
  });

  it("uma falha nas boas-vindas nunca derruba o aviso: 200, e o alerta", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(paga(sub, ficha));
    enviarEmail.mockRejectedValueOnce(new Error("o balcão quebrou o contrato"));
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.created"))).status).toBe(200);
    expect(alerta.mock.calls.some(([linha]) => String(linha).includes("[email] as boas-vindas"))).toBe(true);
  });
});

describe("o endereço do botão", () => {
  it("em produção, só https; fora dela, http também; sem a base, nenhum botão", () => {
    expect(enderecoDoSite("/login", { NODE_ENV: "production", BETTER_AUTH_URL: "https://www.exemplo.com" })).toBe("https://www.exemplo.com/login");
    for (const base of ["http://www.exemplo.com", "www.exemplo.com", "javascript:alert(1)", ""]) {
      expect(enderecoDoSite("/login", { NODE_ENV: "production", BETTER_AUTH_URL: base }), base).toBeNull();
    }
    expect(enderecoDoSite("/login", { NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:3000" })).toBe("http://localhost:3000/login");
    expect(enderecoDoSite("/login", { NODE_ENV: "development", BETTER_AUTH_URL: "javascript:alert(1)" })).toBeNull();
    expect(enderecoDoSite("/login", { NODE_ENV: "production" })).toBeNull();
  });
});
