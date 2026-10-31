import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type Stripe from "stripe";
import type { FichaDaCobranca, ListaDeTentativas, TentativaDaLista } from "@jilson/core";
import type { ClienteNaStripe } from "../lib/stripe-ficha.js";

// AS TENTATIVAS QUE NÃO TERMINARAM (etapa 4.7b, passo 1e). Só a leitura na Stripe vira dublê; a lista e a ficha
// rodam de verdade, contra o banco. O que protege:
//   - SÓ ADMIN;
//   - a lista traz o visitante cuja ficha ainda não virou conta (com o lembrete e quando a ficha some) e a conta com a
//     assinatura esperando ou que expirou sem o primeiro pagamento — dos últimos 30 dias; nunca a ficha que já virou
//     conta, nem a assinatura sem dono; da mais recente para a mais antiga;
//   - a ficha do visitante mostra o que aconteceu: o cartão recusado com o motivo e o Pix gerado e não pago;
//   - o código do cliente do visitante leva à ficha dele.
const lerClienteNaStripe = vi.fn<(clienteId: string) => Promise<ClienteNaStripe>>();
vi.mock("../lib/stripe-ficha.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-ficha.js")>()),
  lerClienteNaStripe: (clienteId: string) => lerClienteNaStripe(clienteId),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const agora = Date.now();
const conta = `tentativa-${S}`;
const VISITANTE = `tentativa-visitante-${S}`;
const VIROU_CONTA = `tentativa-virou-${S}`;
const CLIENTE_DO_VISITANTE = `cus_${S}_visitante`;
let admin: string[] = [];
let member: string[] = [];
const ids: Record<string, number> = {};

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const get = (endereco: string, consulta: Record<string, string> = {}, cookies: string[] = admin) => request(servidor).get(endereco).query(consulta).set("Cookie", cookies);
const minhas = (lista: ListaDeTentativas): TentativaDaLista[] =>
  lista.tentativas.filter((t) => (t.tipo === "visitante" ? t.visitante.id.includes(S) : t.conta.id === conta));

beforeAll(async () => {
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  await prisma.user.create({ data: { id: conta, email: `${conta}@teste.local`, name: "Tiago Tentativa" } });
  await prisma.guestCheckout.create({ data: { id: VISITANTE, email: `${VISITANTE}@teste.local`, stripeCustomerId: CLIENTE_DO_VISITANTE, livemode: false, nome: "Vera Visitante", novidades: true, ultimaTentativaEm: new Date(agora - 2 * DIA), lembreteEnviadoEm: new Date(agora - 2 * DIA + 2 * 3600_000) } });
  await prisma.guestCheckout.create({ data: { id: VIROU_CONTA, email: `${VIROU_CONTA}@teste.local`, stripeCustomerId: `cus_${S}_virou`, livemode: false, userId: conta, ultimaTentativaEm: new Date(agora - DIA) } });
  const criar = async (nome: string, dados: { ownerUserId: string | null; status: string; criada: number }) => {
    const linha = await prisma.subscription.create({ data: { ownerUserId: dados.ownerUserId, status: dados.status, stripeSubscriptionId: `sub_${S}_${nome}`, createdAt: new Date(dados.criada) } });
    ids[nome] = linha.id;
  };
  await criar("aguardando", { ownerUserId: conta, status: "incomplete", criada: agora - 3600_000 });
  await criar("expirou", { ownerUserId: conta, status: "incomplete_expired", criada: agora - 5 * DIA });
  await criar("antiga", { ownerUserId: conta, status: "incomplete_expired", criada: agora - 40 * DIA });
  await criar("semdono", { ownerUserId: null, status: "incomplete", criada: agora - 3600_000 });
});

beforeEach(() => {
  lerClienteNaStripe.mockReset().mockResolvedValue({
    cliente: null,
    cobrancas: [{ id: "ch_recusada", created: Math.floor(agora / 1000), amount: 9990, currency: "brl", status: "failed", disputed: false, refunded: false, amount_refunded: 0, outcome: { reason: "expired_card" }, failure_code: "card_declined", receipt_url: null, payment_method_details: { type: "card", card: { brand: "visa", last4: "0069" } } } as unknown as Stripe.Charge],
    maisCobrancas: false,
    contestacoes: new Map(),
    pixEsperando: [{ id: "pi_qr", created: Math.floor(agora / 1000), amount: 9990, currency: "brl" } as unknown as Stripe.PaymentIntent],
  });
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.guestCheckout.deleteMany({ where: { id: { in: [VISITANTE, VIROU_CONTA] } } });
  await prisma.user.deleteMany({ where: { id: conta } });
});

describe("as tentativas que não terminaram", () => {
  it("sem login 401; aluno 403", async () => {
    expect((await get("/api/admin/cobranca/tentativas", {}, [])).status).toBe(401);
    expect((await get("/api/admin/cobranca/tentativas", {}, member)).status).toBe(403);
  });

  it("o visitante sem conta e as assinaturas da conta esperando ou expiradas há menos de 30 dias — da mais recente para a mais antiga", async () => {
    const res = await get("/api/admin/cobranca/tentativas");
    expect(res.status).toBe(200);
    const lista = minhas(res.body as ListaDeTentativas);
    expect(lista.map((t) => (t.tipo === "visitante" ? t.visitante.id : `${t.situacao}:${t.assinatura}`))).toEqual([`aguardando:${ids.aguardando}`, VISITANTE, `expirou:${ids.expirou}`]);
    const visitante = lista.find((t) => t.tipo === "visitante");
    expect(visitante?.tipo === "visitante" && visitante.visitante).toMatchObject({ nome: "Vera Visitante", novidades: true, naoApagada: false, lembreteEm: new Date(agora - 2 * DIA + 2 * 3600_000).toISOString(), someEm: new Date(agora - 2 * DIA + 7 * DIA).toISOString() });
  });
});

describe("a ficha do visitante", () => {
  it("mostra o que aconteceu: o cartão recusado com o motivo e o Pix gerado e não pago — sem conta e sem acesso", async () => {
    const res = await get("/api/admin/cobranca/ficha", { visitante: VISITANTE });
    expect(res.status).toBe(200);
    const ficha = res.body as FichaDaCobranca;
    expect(ficha.conta).toBeNull();
    expect(ficha.temAcesso).toBe(false);
    expect(ficha.visitante).toMatchObject({ id: VISITANTE, email: `${VISITANTE}@teste.local` });
    expect(ficha.cobrancas.map((c) => [c.situacao, c.motivoDaFalha])).toEqual([["falhou", "expired_card"]]);
    expect(ficha.pixEsperando.map((p) => p.id)).toEqual(["pi_qr"]);
    expect(lerClienteNaStripe.mock.calls).toEqual([[CLIENTE_DO_VISITANTE]]);
  });

  it("a ficha de espera que já virou conta leva à ficha da conta; a que não existe, 404", async () => {
    expect(((await get("/api/admin/cobranca/ficha", { visitante: VIROU_CONTA })).body as FichaDaCobranca).conta?.id).toBe(conta);
    expect((await get("/api/admin/cobranca/ficha", { visitante: `nao-existe-${S}` })).status).toBe(404);
  });

  it("o código do cliente do visitante leva à ficha dele", async () => {
    expect((await get("/api/admin/cobranca/achar", { codigo: CLIENTE_DO_VISITANTE })).body).toEqual({ conta: null, assinatura: null, visitante: VISITANTE });
  });
});
