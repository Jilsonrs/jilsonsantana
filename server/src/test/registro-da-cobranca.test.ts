import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import type { FichaDaCobranca, OQueAconteceu } from "@jilson/core";
import type { AssinaturaNaStripe, AvisoDaStripe } from "../lib/stripe.js";
import type { Desfecho } from "../lib/assinaturas.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";
import type { ClienteNaStripe } from "../lib/stripe-ficha.js";

// O REGISTRO DA COBRANÇA (etapa 4.7b, passo 1f). Na NOSSA fronteira: a busca da assinatura, o balcão de e-mail e a
// leitura da ficha na Stripe. O aviso (pela rota de verdade, assinado), a sincronia e o registro rodam contra o banco.
// O que protege:
//   - cada aviso processado vira UMA linha — de quem (a Stripe), o quê, em quem (a conta), o resumo —, e a reentrega
//     não repete; a assinatura atualizada SEM mudança não ganha linha; o cancelamento marcado ganha, com o motivo, e o
//     motivo vai ao espelho;
//   - falhar ao gravar o registro NÃO derruba o aviso (ele já foi processado);
//   - "o que aconteceu" é só do admin, da mais nova para a mais velha, com os motivos contados; e a ficha traz o
//     registro da pessoa.
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
const lerClienteNaStripe = vi.fn<(clienteId: string) => Promise<ClienteNaStripe>>();
vi.mock("../lib/stripe-ficha.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-ficha.js")>()),
  lerClienteNaStripe: (clienteId: string) => lerClienteNaStripe(clienteId),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { resumoDoAviso } from "../lib/registro-da-cobranca.js";

const S = `${Date.now()}`;
const SEGREDO = "whsec_da_suite_do_registro";
const DIA = 24 * 60 * 60 * 1000;
const aluna = `registro-${S}`;
const SUB = `sub_${S}_registro`;
const CLIENTE = `cus_${S}_registro`;
let n = 0;
const novoEvento = () => `evt_${S}_${++n}`;
let admin: string[] = [];
let member: string[] = [];

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
function enviar(id: string, type: string) {
  const corpo = JSON.stringify({ object: "event", id, type, data: { object: { id: SUB, object: "subscription" } } }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", cabecalho).send(corpo);
}
const naStripe = (dados: Partial<AssinaturaNaStripe> = {}) =>
  buscarAssinatura.mockResolvedValue({ id: SUB, status: "active", pagoAte: new Date(Date.now() + 30 * DIA), clienteId: CLIENTE, userId: aluna, livemode: false, planoAtual: "mensal", ...dados });
const linhas = () => prisma.billingLog.findMany({ where: { stripeSubscriptionId: SUB }, orderBy: { id: "asc" } });

beforeAll(async () => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local`, name: "Rita Registro" } });
});

beforeEach(() => {
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
  lerClienteNaStripe.mockReset().mockResolvedValue({ cliente: null, cobrancas: [], maisCobrancas: false, contestacoes: new Map(), pixEsperando: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await prisma.billingLog.deleteMany({ where: { OR: [{ stripeSubscriptionId: { contains: S } }, { userId: aluna }] } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: S } } });
  await prisma.user.deleteMany({ where: { id: aluna } });
});

describe("o aviso da Stripe vira uma linha do registro", () => {
  it("a assinatura criada: de quem, o quê, em quem e o resumo — e a reentrega não repete", async () => {
    naStripe();
    const evento = novoEvento();
    expect((await enviar(evento, "customer.subscription.created")).status).toBe(200);
    expect((await enviar(evento, "customer.subscription.created")).status).toBe(200);
    const gravadas = await linhas();
    expect(gravadas).toHaveLength(1);
    expect(gravadas[0]).toMatchObject({ who: "STRIPE", action: "customer.subscription.created", stripeEventId: evento, userId: aluna, stripeCustomerId: CLIENTE, detail: "active" });
  });

  it("atualizada sem mudança não ganha linha; o cancelamento marcado ganha, com o motivo — e o motivo vai ao espelho", async () => {
    naStripe();
    expect((await enviar(novoEvento(), "customer.subscription.updated")).status).toBe(200);
    expect(await linhas()).toHaveLength(1);
    naStripe({ acabaEm: new Date(Date.now() + 30 * DIA), motivoDoCancelamento: "caro" });
    expect((await enviar(novoEvento(), "customer.subscription.updated")).status).toBe(200);
    const gravadas = await linhas();
    expect(gravadas.map((l) => l.detail)).toEqual(["active", "active · vai-cancelar · motivo:caro"]);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } })).cancelReason).toBe("caro");
  });

  it("falhar ao gravar o registro não derruba o aviso — e o que ele tinha de fazer foi feito", async () => {
    naStripe({ status: "past_due", pagoAte: new Date(Date.now() - DIA) });
    vi.spyOn(prisma.billingLog, "createMany").mockRejectedValue(new Error("o banco recusou"));
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await enviar(novoEvento(), "customer.subscription.updated")).status).toBe(200);
    expect(aviso.mock.calls.some(([linha]) => String(linha).includes("não entrou no registro da cobrança"))).toBe(true);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { stripeSubscriptionId: SUB } })).status).toBe("past_due");
  });
});

describe("o resumo do aviso (sem dado pessoal)", () => {
  const assinatura = (extra: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({ id: "sub_1", status: "active", pagoAte: null, clienteId: "cus_1", userId: null, livemode: false, ...extra });
  const aviso = (extra: Partial<AvisoDaStripe> = {}): AvisoDaStripe => ({ id: "evt_1", tipo: "customer.subscription.updated", assinatura: "sub_1", ...extra });
  it("a contestação (com o valor), o aviso de fraude e a devolução que falhou", () => {
    expect(resumoDoAviso(aviso({ contestacao: { id: "du_1", motivo: "fraudulent", centavos: 9990, prazo: null, pagamento: null, fase: "aberta" } }), { resultado: "sem-assinatura" })).toEqual({ detalhe: "aberta · fraudulent", centavos: 9990 });
    expect(resumoDoAviso(aviso({ avisoDeFraude: { id: "issfr_1", cobranca: "ch_1", pagamento: null, tipo: "made_with_stolen_card" } }), { resultado: "sem-assinatura" }).detalhe).toBe("made_with_stolen_card");
    expect(resumoDoAviso(aviso({ devolucaoFalhou: true }), { resultado: "sem-assinatura" }).detalhe).toBe("devolucao-falhou");
  });

  it("a pré-paga do Pix (sempre com data de fim) não é 'vai cancelar'; perder o acesso e a conta que nasceu entram", () => {
    const fim = new Date(Date.now() + DIA);
    expect(resumoDoAviso(aviso(), { resultado: "atualizada", assinatura: assinatura({ acabaEm: fim, pixPaymentIntentId: "pi_1" }), perdeuAcesso: false, contaNova: null } as Desfecho).detalhe).toBe("active");
    expect(resumoDoAviso(aviso(), { resultado: "atualizada", assinatura: assinatura({ status: "canceled" }), perdeuAcesso: true, contaNova: "u-novo" } as Desfecho).detalhe).toBe("canceled · perdeu-acesso · conta-nasceu");
  });
});

describe("o que aconteceu — a tela do admin e a ficha", () => {
  it("só admin; a página fora do formato: 400", async () => {
    expect((await request(servidor).get("/api/admin/cobranca/o-que-aconteceu")).status).toBe(401);
    expect((await request(servidor).get("/api/admin/cobranca/o-que-aconteceu").set("Cookie", member)).status).toBe(403);
    expect((await request(servidor).get("/api/admin/cobranca/o-que-aconteceu").query({ pagina: "0" }).set("Cookie", admin)).status).toBe(400);
  });

  it("a escola inteira, da mais nova para a mais velha, com quem é o aluno — e os motivos contados", async () => {
    const antes = ((await request(servidor).get("/api/admin/cobranca/o-que-aconteceu").set("Cookie", admin)).body as OQueAconteceu).motivos;
    await prisma.subscription.create({ data: { ownerUserId: aluna, status: "canceled", stripeSubscriptionId: `sub_${S}_motivo`, cancelReason: "sem-tempo" } });
    const res = await request(servidor).get("/api/admin/cobranca/o-que-aconteceu").set("Cookie", admin);
    expect(res.status).toBe(200);
    const corpo = res.body as OQueAconteceu;
    const minhas = corpo.linhas.filter((l) => l.aluno?.id === aluna);
    expect(minhas.length).toBeGreaterThanOrEqual(2);
    expect(minhas[0]?.aluno).toEqual({ id: aluna, nome: "Rita Registro", email: `${aluna}@teste.local` });
    expect(minhas.map((l) => l.em)).toEqual([...minhas.map((l) => l.em)].sort().reverse());
    const total = (lista: OQueAconteceu["motivos"], motivo: string) => lista.find((m) => m.motivo === motivo)?.total ?? 0;
    expect(total(corpo.motivos, "sem-tempo") - total(antes, "sem-tempo")).toBe(1);
    expect(corpo.motivos.map((m) => m.motivo)).toEqual(["caro", "sem-tempo", "ja-aprendi", "sem-conteudo", "outro"]);
  });

  it("a ficha traz o registro da pessoa", async () => {
    const res = await request(servidor).get("/api/admin/cobranca/ficha").query({ conta: aluna }).set("Cookie", admin);
    const ficha = res.body as FichaDaCobranca;
    expect(ficha.registro.map((l) => l.acao)).toContain("customer.subscription.created");
    expect(ficha.registro.every((l) => l.aluno?.id === aluna)).toBe(true);
  });
});
