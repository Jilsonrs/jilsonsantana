import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";
import type { AssinaturaNaStripe, AssinaturaNoCheckout } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê — a busca de uma assinatura e a lista
// das assinaturas de um cliente. A verificação do aviso roda de verdade, com avisos assinados pela
// própria biblioteca da Stripe, e a rotina do espelho (a trava, a conta que nasce) roda contra o banco.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { sincronizarAssinatura } from "../lib/assinaturas.js";

// A CONTA QUE NASCE NO PAGAMENTO (Fase 4, etapa 4.7, passo 4 — billing.md → *Assinar sem conta*).
// Quem assina sem conta deixa uma ficha de espera; a conta só nasce quando a Stripe diz que o
// pagamento passou. O que estes testes protegem — é a fronteira de dinheiro, e o aviso não tem tela:
//   - a tentativa PAGA faz a conta nascer: o e-mail da ficha (em minúsculas, senão o login nunca a
//     acharia), papel de aluno, SEM senha, com as novidades e a origem da tentativa paga; o cliente
//     da Stripe passa a ser o da conta; a ficha fica marcada; o espelho nasce com dono; o gate libera;
//   - a tentativa NÃO paga não cria conta — e não alerta ninguém (é o normal de toda tentativa);
//   - o aviso repetido, outro aviso da mesma assinatura, ou outra assinatura da mesma ficha: UMA conta;
//   - o e-mail que ganhou conta entre a ficha e o pagamento NÃO é ligado à conta de outra pessoa, e a
//     ficha que não existe ou é de outro cliente não ganha conta — os três gritam no registro, porque
//     há alguém pagando sem acesso;
//   - TUDO OU NADA: falha no meio não deixa conta pela metade, e a reentrega da Stripe dá certo;
//   - o aviso que se perdeu: o "Conferir na Stripe" do admin, com o e-mail da ficha, faz a conta nascer.

const SEGREDO = "whsec_teste_da_suite_local";
const ANTES = process.env.STRIPE_SECRET_KEY;
const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_${S}_${++n}`;
/** Um e-mail de visitante só deste teste (o sufixo junta tudo para a limpeza). */
const novoEmail = () => `visitante-${++n}-${S}@teste.local`;

type Aviso = { id: string; type: string; data: { object: Record<string, unknown> } };
const avisoDaAssinatura = (subId: string, type = "customer.subscription.updated"): Aviso => ({
  id: novoId("evt"),
  type,
  data: { object: { id: subId, object: "subscription" } },
});

/** Envia o aviso como a Stripe: corpo formatado, assinado com o segredo. */
function enviar(aviso: Aviso) {
  const corpo = JSON.stringify({ object: "event", ...aviso }, null, 2);
  const cabecalho = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: SEGREDO });
  return request(servidor).post("/api/stripe/webhook").set("Content-Type", "application/json").set("Stripe-Signature", cabecalho).send(corpo);
}

/** Uma ficha de espera, como a rota do visitante grava (etapa 4.7, passo 4). */
async function novaFicha(email = novoEmail()) {
  return prisma.guestCheckout.create({ data: { id: novoId("pedido"), email, stripeCustomerId: novoId("cus"), livemode: false } });
}

/** A assinatura de um visitante como a Stripe diria agora: sem conta, com a ficha e a escolha dele. */
const doVisitante = (sub: string, ficha: { id: string; stripeCustomerId: string }, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
  id: sub,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId: ficha.stripeCustomerId,
  userId: null,
  pedido: ficha.id,
  doVisitante: { novidades: true, origem: "youtube", campanha: "video-excel" },
  livemode: false,
  ...dados,
});

const espelho = (sub: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub } });
const contaDoEmail = (email: string) => prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { accounts: true, stripeCustomer: true } });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SEGREDO;
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
});

beforeEach(() => {
  buscarAssinatura.mockReset();
  assinaturasDoCliente.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: S } } });
  // Apagar a conta leva junto a ligação com a Stripe e a ficha dela (cascade).
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { id: { contains: S } } });
});

describe("a conta nasce no pagamento", () => {
  it("a tentativa PAGA: a conta nasce com o e-mail da ficha em minúsculas, papel de aluno, sem senha, com as novidades e a origem — e o gate libera", async () => {
    // A rota grava o e-mail já em minúsculas; a conta confere de novo, porque com outra grafia o
    // login (que busca em minúsculas) nunca a acharia.
    const ficha = await novaFicha(`Visitante-Maiusculo-${S}@teste.local`);
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha));

    expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.created"))).status).toBe(200);

    const conta = await contaDoEmail(ficha.email);
    expect(conta).not.toBeNull();
    if (!conta) return;
    expect(conta.email).toBe(ficha.email.toLowerCase());
    expect([conta.role, conta.name, conta.emailVerified]).toEqual(["member", null, false]);
    expect([conta.marketingConsent, conta.acquisitionSource, conta.acquisitionCampaign]).toEqual([true, "youtube", "video-excel"]);
    // Sem senha: nenhuma conta de login — ela só nasce quando a pessoa cria a senha (passo 5).
    expect(conta.accounts).toEqual([]);
    expect(conta.stripeCustomer?.stripeCustomerId).toBe(ficha.stripeCustomerId);
    expect((await prisma.guestCheckout.findUnique({ where: { id: ficha.id } }))?.userId).toBe(conta.id);
    expect((await espelho(sub))?.ownerUserId).toBe(conta.id);
    expect(await temAcessoAtivo(conta.id)).toBe(true);
    // E não há como entrar sem a senha: a mesma resposta de uma senha errada.
    const login = await request(servidor).post("/api/auth/sign-in/email").send({ email: conta.email, password: "qualquer-senha-123" });
    expect(login.status).toBe(401);
  });

  // O NOME (etapa 4.7, passo 9 — revê a P83): vem da FICHA (a última tentativa), nunca da Stripe — o nome não
  // vai para lá (a fatura anulada guarda o que for, e não se apaga).
  it("a conta nasce com o NOME da ficha; a ficha sem nome (a aba de antes do passo 9) dá conta sem nome", async () => {
    const comNome = await prisma.guestCheckout.create({ data: { id: novoId("pedido"), email: novoEmail(), stripeCustomerId: novoId("cus"), livemode: false, nome: "Nome da Ficha" } });
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, comNome));
    expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.created"))).status).toBe(200);
    expect((await contaDoEmail(comNome.email))?.name).toBe("Nome da Ficha");

    const semNome = await novaFicha();
    const outra = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(outra, semNome));
    expect((await enviar(avisoDaAssinatura(outra, "customer.subscription.created"))).status).toBe(200);
    const conta = await contaDoEmail(semNome.email);
    expect(conta).not.toBeNull();
    expect(conta?.name).toBeNull();
  });

  it("quem NÃO marcou novidades nasce sem consentimento, e sem origem quando não veio nenhuma", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha, { doVisitante: { novidades: false, origem: null, campanha: null } }));
    await enviar(avisoDaAssinatura(sub, "customer.subscription.created"));
    const conta = await contaDoEmail(ficha.email);
    expect([conta?.marketingConsent, conta?.acquisitionSource, conta?.acquisitionCampaign]).toEqual([false, null, null]);
  });

  it("a tentativa NÃO paga (incompleta): nenhuma conta, nenhum espelho, nenhum alerta — e o pagamento que vem depois faz a conta nascer", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha, { status: "incomplete", pagoAte: new Date(Date.now() - DIA) }));
    const alerta = vi.spyOn(console, "error");
    const aviso = vi.spyOn(console, "warn");

    const criada = avisoDaAssinatura(sub, "customer.subscription.created");
    expect((await enviar(criada)).status).toBe(200);
    expect(await contaDoEmail(ficha.email)).toBeNull();
    expect(await espelho(sub)).toBeNull();
    expect((await prisma.guestCheckout.findUnique({ where: { id: ficha.id } }))?.userId).toBeNull();
    expect(await prisma.stripeEvent.findUnique({ where: { id: criada.id } })).not.toBeNull();
    expect(alerta).not.toHaveBeenCalled();
    expect(aviso).not.toHaveBeenCalled();

    // A expirada também não (o primeiro pagamento nunca aconteceu).
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha, { status: "incomplete_expired", pagoAte: new Date(Date.now() - DIA) }));
    await enviar(avisoDaAssinatura(sub));
    expect(await contaDoEmail(ficha.email)).toBeNull();

    // Pagou numa nova tentativa — outra assinatura, a mesma ficha: agora nasce.
    const paga = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(paga, ficha));
    await enviar(avisoDaAssinatura(paga, "customer.subscription.created"));
    const nascida = await contaDoEmail(ficha.email);
    expect(nascida).not.toBeNull();
    expect((await espelho(paga))?.ownerUserId).toBe(nascida?.id);
  });

  it("o aviso repetido e os outros avisos da mesma assinatura: UMA conta só", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha));
    const criada = avisoDaAssinatura(sub, "customer.subscription.created");
    await enviar(criada);
    const conta = await contaDoEmail(ficha.email);

    expect((await enviar(criada)).status).toBe(200);
    const fatura: Aviso = {
      id: novoId("evt"),
      type: "invoice.paid",
      data: { object: { id: novoId("in"), object: "invoice", parent: { type: "subscription_details", subscription_details: { subscription: sub } } } },
    };
    expect((await enviar(fatura)).status).toBe(200);
    expect(await prisma.user.count({ where: { email: ficha.email } })).toBe(1);
    expect((await espelho(sub))?.ownerUserId).toBe(conta?.id);
  });

  it("a sincronia diz QUAL conta nasceu, e só na vez em que ela nasce (é por isso que o passo 5 manda o e-mail de criar a senha)", async () => {
    const ficha = await novaFicha();
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha));
    const primeira = await sincronizarAssinatura(sub);
    const conta = await contaDoEmail(ficha.email);
    expect(conta).not.toBeNull();
    expect(primeira).toMatchObject({ resultado: "atualizada", contaNova: conta?.id });
    expect(await sincronizarAssinatura(sub)).toMatchObject({ resultado: "atualizada", contaNova: null });
  });

  it("outra assinatura da MESMA ficha, com a conta já nascida: liga à mesma conta, sem nascer outra", async () => {
    const ficha = await novaFicha();
    const primeira = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(primeira, ficha));
    await enviar(avisoDaAssinatura(primeira, "customer.subscription.created"));
    const conta = await contaDoEmail(ficha.email);

    const segunda = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(segunda, ficha));
    const info = vi.spyOn(console, "info");
    await enviar(avisoDaAssinatura(segunda, "customer.subscription.created"));
    expect((await espelho(segunda))?.ownerUserId).toBe(conta?.id);
    expect(await prisma.user.count({ where: { email: ficha.email } })).toBe(1);
    // Só a primeira registrou "nasceu".
    expect(info.mock.calls.some(([linha]) => String(linha).includes("nasceu"))).toBe(false);
  });
});

describe("a conta NÃO nasce — e o registro grita, porque há alguém pagando sem acesso", () => {
  it("o e-mail ganhou conta entre a ficha e o pagamento: não nasce outra, e o pagamento não vai para a conta que existe", async () => {
    const ficha = await novaFicha();
    const existente = await prisma.user.create({ data: { id: novoId("conta"), email: ficha.email } });
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha));
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.created"))).status).toBe(200);
    expect(await espelho(sub)).toBeNull();
    expect(await prisma.subscription.count({ where: { ownerUserId: existente.id } })).toBe(0);
    expect(await prisma.stripeCustomer.findUnique({ where: { userId: existente.id } })).toBeNull();
    expect((await prisma.guestCheckout.findUnique({ where: { id: ficha.id } }))?.userId).toBeNull();
    expect(alerta.mock.calls.some(([linha]) => String(linha).includes("o e-mail já tem conta") && String(linha).includes("trancado fora"))).toBe(true);
  });

  it("a ficha que não existe, ou a assinatura de OUTRO cliente da Stripe: sem conta, sem espelho, e o alerta", async () => {
    const ficha = await novaFicha();
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const casos: [Partial<AssinaturaNaStripe>, string][] = [
      [{ pedido: `nao-existe-${S}` }, "pedido inexistente"],
      [{ clienteId: novoId("cus_de_outro") }, "pedido de outro cliente"],
    ];
    for (const [dados, motivo] of casos) {
      const sub = novoId("sub");
      buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha, dados));
      expect((await enviar(avisoDaAssinatura(sub, "customer.subscription.created"))).status).toBe(200);
      expect(await espelho(sub)).toBeNull();
      expect(alerta.mock.calls.some(([linha]) => String(linha).includes(motivo) && String(linha).includes("trancado fora"))).toBe(true);
    }
    expect(await contaDoEmail(ficha.email)).toBeNull();
  });
});

describe("tudo ou nada", () => {
  it("falha no meio (a ligação com a Stripe não grava): nem conta, nem ficha marcada, nem espelho — e a reentrega dá certo", async () => {
    const ficha = await novaFicha();
    // Um estado impossível pelo caminho normal: o cliente da ficha já ligado a OUTRA conta. A conta
    // nasce, a ligação esbarra, e a transação inteira tem que voltar.
    const outra = await prisma.user.create({ data: { id: novoId("conta"), email: novoEmail() } });
    await prisma.stripeCustomer.create({ data: { userId: outra.id, stripeCustomerId: ficha.stripeCustomerId, livemode: false } });
    const sub = novoId("sub");
    buscarAssinatura.mockResolvedValue(doVisitante(sub, ficha));
    const aviso = avisoDaAssinatura(sub, "customer.subscription.created");
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await enviar(aviso)).status).toBe(500);
    expect(await contaDoEmail(ficha.email)).toBeNull();
    expect((await prisma.guestCheckout.findUnique({ where: { id: ficha.id } }))?.userId).toBeNull();
    expect(await espelho(sub)).toBeNull();
    expect(await prisma.stripeEvent.findUnique({ where: { id: aviso.id } })).toBeNull();

    // Desfeito o estado impossível, a Stripe entrega o MESMO aviso de novo — e a conta nasce.
    await prisma.stripeCustomer.delete({ where: { userId: outra.id } });
    expect((await enviar(aviso)).status).toBe(200);
    const conta = await contaDoEmail(ficha.email);
    expect(conta).not.toBeNull();
    expect((await espelho(sub))?.ownerUserId).toBe(conta?.id);
  });
});

describe("o aviso que se perdeu — o admin confere a ficha", () => {
  const listada = (id: string): AssinaturaNoCheckout => ({ id, status: "active", precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null });
  const conferir = (email: string, cookies: string[]) => request(servidor).post("/api/admin/assinaturas/sincronizar").set("Cookie", cookies).send({ email });

  it("o e-mail de quem pagou e ficou sem conta: a conta nasce na conferência, com acesso; sem pagamento, continua não existindo conta", async () => {
    const admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
    expect(admin.length).toBeGreaterThan(0);

    const naoPagou = await novaFicha();
    const pendente = novoId("sub");
    assinaturasDoCliente.mockResolvedValue([listada(pendente)]);
    buscarAssinatura.mockResolvedValue(doVisitante(pendente, naoPagou, { status: "incomplete", pagoAte: null }));
    const semConta = await conferir(naoPagou.email, admin);
    expect([semConta.status, semConta.body]).toEqual([404, { error: "ContaNaoEncontrada" }]);
    expect(await contaDoEmail(naoPagou.email)).toBeNull();

    const pagou = await novaFicha();
    const sub = novoId("sub");
    assinaturasDoCliente.mockResolvedValue([listada(sub)]);
    buscarAssinatura.mockResolvedValue(doVisitante(sub, pagou));
    // O admin digita com maiúsculas: a ficha se acha ao pé da letra, em minúsculas, como a conta.
    const res = await conferir(pagou.email.toUpperCase(), admin);
    expect(res.status).toBe(200);
    expect(res.body.temAcesso).toBe(true);
    expect(assinaturasDoCliente).toHaveBeenCalledWith(pagou.stripeCustomerId);
    const conta = await contaDoEmail(pagou.email);
    expect(conta).not.toBeNull();
    expect((await espelho(sub))?.ownerUserId).toBe(conta?.id);
  });

  it("e-mail sem conta e sem ficha: 404 — e a Stripe nem é consultada", async () => {
    const admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
    const res = await conferir(novoEmail(), admin);
    expect([res.status, res.body]).toEqual([404, { error: "ContaNaoEncontrada" }]);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });
});
