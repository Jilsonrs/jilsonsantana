import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { DetalhesDaAssinatura, MotivoDado } from "../lib/stripe-assinatura.js";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { CobrancaParaDevolver, DonoDaDevolucao, OQueFoiPago, Pagamento } from "../lib/stripe-reembolso.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";
import type { PrePagaDoPix } from "../lib/stripe-pix.js";

// AS DEVOLUÇÕES DO PAINEL (etapa 4.7b, bloco 4, passo 4a — decisões do operador P114 e P139). Só a rede da Stripe e o
// balcão de e-mail viram dublê; as operações (a do reembolso do aluno, sem o prazo), a trava, a sincronia, os casos e o
// registro rodam de verdade, contra o banco. O que protege:
//   - SÓ ADMIN, e o corpo no formato;
//   - "Cancelar e devolver": a prévia diz quanto volta; com o valor mostrado, encerra e devolve TUDO o que falta — fora do
//     prazo dos 7 dias também —, a sincronia corta o acesso e DERRUBA a sessão (é o operador, não a pessoa); com outro
//     valor, nada é feito; a devolução que falha abre o caso; a pré-paga devolve o Pix;
//   - "Devolver um pagamento": só uma cobrança de um cliente DA PESSOA da ficha, no máximo o que falta voltar; a parte vai
//     com a trava e a sincronia da assinatura (a regra do "pago até" decide o acesso); sem assinatura, sem sincronia; com o
//     que JÁ TINHA VOLTADO como a tela mostrou, relido com a trava — o pedido repetido não devolve duas vezes; o encerramento
//     cuja devolução falha abre o caso, com o valor (revisão de segurança do bloco 4);
//   - "Devolver de novo": o caso da devolução que falhou — a do reembolso, inteira; a de uma cobrança, EXATAMENTE o valor que
//     falhou —, e o caso fecha; o caso antigo, sem o valor, não se repete por aqui;
//   - o registro guarda quem fez e o valor.
const buscarDetalhes = vi.fn<(id: string) => Promise<DetalhesDaAssinatura>>();
vi.mock("../lib/stripe-assinatura.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-assinatura.js")>()),
  buscarDetalhes: (id: string) => buscarDetalhes(id),
}));
const cancelarNaHora = vi.fn<(id: string, dado: MotivoDado) => Promise<void>>();
const devolver = vi.fn<(pagamento: Pagamento, dono: DonoDaDevolucao) => Promise<void>>();
const buscarOQueFoiPago = vi.fn<(id: string) => Promise<OQueFoiPago>>();
const buscarOQueFoiPagoNoPix = vi.fn<(id: string) => Promise<OQueFoiPago>>();
const assinaturaDoPagamento = vi.fn<(pagamento: string) => Promise<string | null>>();
const lerCobranca = vi.fn<(id: string) => Promise<CobrancaParaDevolver | null>>();
const devolverParte = vi.fn<(cobranca: CobrancaParaDevolver, centavos: number, dono: { userId: string | null; assinaturaId: string | null; operador: string }) => Promise<void>>();
vi.mock("../lib/stripe-reembolso.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-reembolso.js")>()),
  cancelarNaHora: (id: string, dado: MotivoDado) => cancelarNaHora(id, dado),
  devolver: (pagamento: Pagamento, dono: DonoDaDevolucao) => devolver(pagamento, dono),
  buscarOQueFoiPago: (id: string) => buscarOQueFoiPago(id),
  buscarOQueFoiPagoNoPix: (id: string) => buscarOQueFoiPagoNoPix(id),
  assinaturaDoPagamento: (pagamento: string) => assinaturaDoPagamento(pagamento),
  lerCobranca: (id: string) => lerCobranca(id),
  devolverParte: (cobranca: CobrancaParaDevolver, centavos: number, dono: { userId: string | null; assinaturaId: string | null; operador: string }) => devolverParte(cobranca, centavos, dono),
}));
const cobrancaDoPagamento = vi.fn<(pagamento: string) => Promise<{ centavos: number; devolvido: number }>>();
vi.mock("../lib/stripe-devolucao.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-devolucao.js")>()),
  cobrancaDoPagamento: (pagamento: string) => cobrancaDoPagamento(pagamento),
}));
const anularFatura = vi.fn<(id: string) => Promise<"anulada" | "paga">>();
vi.mock("../lib/stripe-plano.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-plano.js")>()),
  anularFatura: (id: string) => anularFatura(id),
}));
const assinaturasDoPix = vi.fn<(cliente: string, pagamento: string) => Promise<PrePagaDoPix[]>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  assinaturasDoPix: (cliente: string, pagamento: string) => assinaturasDoPix(cliente, pagamento),
}));
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
import { prisma, TipoDeCaso } from "../lib/prisma.js";
import { abrirCaso } from "../lib/casos.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const EM_20_DIAS = new Date(Date.now() + 20 * DIA);
const HA_30_DIAS = new Date(Date.now() - 30 * DIA);
const aluna = `devolucoes-${S}`;
const SUB = `sub_${S}_devolucoes`;
const CLIENTE = `cus_${S}_devolucoes`;
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];
let adminId = "";
let espelhoId = 0;
let detalhes: Partial<DetalhesDaAssinatura> = {};
let naStripe: Partial<AssinaturaNaStripe> = {};
const daStripe = (id: string): DetalhesDaAssinatura => ({ id, status: "active", pagoAte: EM_20_DIAS, plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, fimDoPeriodo: EM_20_DIAS, comecouEm: HA_30_DIAS, acabaEm: null, acabaNoFimDoPeriodo: false, cartao: null, clienteId: CLIENTE, userId: aluna, pixPaymentIntentId: null, faturaEmAbertoId: null, itemId: "si_do_teste", agendamentoId: null, pagoPorFora: false, agendamentoNosso: false, trocaMarcada: null, faturaDaTrocaId: null, ...detalhes });
const pagos = (...pagamentos: Pagamento[]): OQueFoiPago => ({ moeda: "brl", pagamentos });
const cobranca = (extra: Partial<CobrancaParaDevolver> = {}): CobrancaParaDevolver => ({ id: `ch_${S}_1`, cliente: CLIENTE, pagamentoId: `pi_${S}_1`, centavos: 9990, devolvido: 0, moeda: "brl", paga: true, ...extra });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(cookies.length).toBeGreaterThan(0);
  return cookies;
}
const acao = (nome: string, corpo: object, cookies: string[] = admin) => request(servidor).post(`/api/admin/cobranca/acoes/${nome}`).set("Cookie", cookies).send(corpo);
const resolver = (casoId: number) => request(servidor).post(`/api/admin/cobranca/casos/${casoId}/resolver`).set("Cookie", admin).send({ acao: "devolver-de-novo" });
const ultimaDoRegistro = (acaoDoRegistro: string) => prisma.billingLog.findFirst({ where: { action: acaoDoRegistro, actorUserId: adminId }, orderBy: { id: "desc" } });
const comSessao = () => prisma.session.create({ data: { id: `sessao-${S}-${Math.random()}`, token: `token-${S}-${Math.random()}`, userId: aluna, expiresAt: new Date(Date.now() + 7 * DIA) } });
const espelhoAtivo = () => prisma.subscription.update({ where: { id: espelhoId }, data: { status: "active", currentPeriodEnd: EM_20_DIAS } });

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
  await prisma.user.create({ data: { id: aluna, email: `${aluna}@teste.local` } });
  await prisma.stripeCustomer.create({ data: { userId: aluna, stripeCustomerId: CLIENTE, livemode: false } });
  espelhoId = (await prisma.subscription.create({ data: { ownerUserId: aluna, status: "active", currentPeriodEnd: EM_20_DIAS, stripeSubscriptionId: SUB, stripeCustomerId: CLIENTE } })).id;
});

beforeEach(async () => {
  detalhes = {};
  naStripe = {};
  await espelhoAtivo();
  await prisma.session.deleteMany({ where: { userId: aluna } });
  buscarDetalhes.mockReset().mockImplementation(async (id) => daStripe(id));
  cancelarNaHora.mockReset().mockImplementation(async () => {
    naStripe = { status: "canceled", pagoAte: new Date(Date.now() - DIA) };
  });
  devolver.mockReset().mockResolvedValue(undefined);
  buscarOQueFoiPago.mockReset().mockResolvedValue(pagos({ pagamentoId: `pi_${S}_1`, centavos: 9990, devolvido: 0 }, { pagamentoId: `pi_${S}_2`, centavos: 9990, devolvido: 9990 }));
  buscarOQueFoiPagoNoPix.mockReset().mockResolvedValue(pagos({ pagamentoId: `pi_${S}_pix`, centavos: 9990, devolvido: 0 }));
  assinaturaDoPagamento.mockReset().mockResolvedValue(SUB);
  lerCobranca.mockReset().mockResolvedValue(cobranca());
  devolverParte.mockReset().mockResolvedValue(undefined);
  cobrancaDoPagamento.mockReset().mockResolvedValue({ centavos: 9990, devolvido: 0 });
  assinaturasDoPix.mockReset().mockResolvedValue([]);
  anularFatura.mockReset().mockResolvedValue("anulada");
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "active", pagoAte: EM_20_DIAS, clienteId: CLIENTE, userId: aluna, livemode: false, ...naStripe }));
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { OR: [{ userId: aluna }, { stripeSubscriptionId: SUB }] } });
  await prisma.billingCase.deleteMany({ where: { OR: [{ key: { contains: S } }, { stripeSubscriptionId: SUB }] } });
  await prisma.session.deleteMany({ where: { userId: aluna } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: aluna } });
  await prisma.user.deleteMany({ where: { id: aluna } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("as devoluções — quem entra", () => {
  it("sem login 401; aluno 403 — e nada vai à Stripe", async () => {
    const pedidos: [string, object][] = [
      ["devolver-tudo/previa", { assinatura: espelhoId }],
      ["devolver-tudo", { assinatura: espelhoId, centavos: 9990 }],
      ["devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100, devolvido: 0 }],
    ];
    for (const [nome, corpo] of pedidos) {
      expect((await acao(nome, corpo, [])).status).toBe(401);
      expect((await acao(nome, corpo, member)).status).toBe(403);
    }
    expect([buscarDetalhes, lerCobranca, devolver, devolverParte].map((d) => d.mock.calls.length)).toEqual([0, 0, 0, 0]);
  });

  it("o corpo fora do formato: 400 (sem valor, valor zero, a cobrança que não é cobrança, sem o que já tinha voltado)", async () => {
    expect((await acao("devolver-tudo", { assinatura: espelhoId })).status).toBe(400);
    expect((await acao("devolver-tudo", { assinatura: espelhoId, centavos: 0 })).status).toBe(400);
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: "pi_1", centavos: 100, devolvido: 0 })).status).toBe(400);
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 1.5, devolvido: 0 })).status).toBe(400);
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100 })).status).toBe(400);
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100, devolvido: -1 })).status).toBe(400);
  });
});

describe("cancelar e devolver o dinheiro", () => {
  it("a prévia: o que FALTA voltar, e de quantos pagamentos", async () => {
    const res = await acao("devolver-tudo/previa", { assinatura: espelhoId });
    expect([res.status, res.body]).toEqual([200, { centavos: 9990, moeda: "brl", pagamentos: 1 }]);
  });

  it("com o valor mostrado: encerra, devolve tudo (fora dos 7 dias também), corta o acesso e DERRUBA a sessão — e o registro guarda o valor", async () => {
    await comSessao();
    const res = await acao("devolver-tudo", { assinatura: espelhoId, centavos: 9990 });
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s99,90 devolvidos; a assinatura acabou agora$/);
    expect(cancelarNaHora.mock.calls).toEqual([[SUB, {}]]);
    expect(devolver.mock.calls.map(([p, dono]) => [p.pagamentoId, dono.userId, dono.assinaturaId])).toEqual([[`pi_${S}_1`, aluna, SUB], [`pi_${S}_2`, aluna, SUB]]);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: espelhoId } })).status).toBe("canceled");
    expect(await prisma.session.count({ where: { userId: aluna } })).toBe(0);
    expect(await ultimaDoRegistro("devolver-tudo")).toMatchObject({ who: "OPERADOR", userId: aluna, stripeSubscriptionId: SUB, amount: 9990 });
  });

  it("o valor mudou desde a prévia: nada é feito — nem encerra, nem devolve", async () => {
    const res = await acao("devolver-tudo", { assinatura: espelhoId, centavos: 5000 });
    expect([res.status, res.body]).toEqual([409, { error: "ValorMudou" }]);
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect(devolver).not.toHaveBeenCalled();
  });

  it("nada a devolver: 409, e nada é encerrado", async () => {
    buscarOQueFoiPago.mockResolvedValue(pagos({ pagamentoId: `pi_${S}_1`, centavos: 9990, devolvido: 9990 }));
    expect((await acao("devolver-tudo", { assinatura: espelhoId, centavos: 9990 })).body).toEqual({ error: "NadaAFazer" });
    expect(cancelarNaHora).not.toHaveBeenCalled();
  });

  it("a devolução falhou: 502 — a assinatura já acabou, e o caso URGENTE abre", async () => {
    devolver.mockRejectedValue(new Error("[stripe] a devolução do pagamento falhou: StripeAPIError"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await acao("devolver-tudo", { assinatura: espelhoId, centavos: 9990 });
    expect([res.status, res.body]).toEqual([502, { error: "DevolucaoFalhou" }]);
    expect(cancelarNaHora).toHaveBeenCalledTimes(1);
    expect(await prisma.billingCase.findUnique({ where: { kind_key: { kind: TipoDeCaso.DEVOLUCAO_FALHOU, key: `sub:${SUB}` } } })).toMatchObject({ open: true, urgent: true, amount: 9990 });
    await prisma.billingCase.deleteMany({ where: { key: `sub:${SUB}` } });
    vi.restoreAllMocks();
  });

  // A revisão de segurança do bloco 4 (P2): o "valor mudou" anulava ANTES a troca de plano que a pessoa estava confirmando no
  // banco — a resposta dizia "nada é feito", e a troca já tinha sido desfeita.
  it("com uma troca de plano pendente: o valor mudou NÃO anula a troca; com o valor certo, ela é anulada antes de encerrar", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca" };
    expect((await acao("devolver-tudo", { assinatura: espelhoId, centavos: 5000 })).body).toEqual({ error: "ValorMudou" });
    expect(anularFatura).not.toHaveBeenCalled();
    expect((await acao("devolver-tudo", { assinatura: espelhoId, centavos: 9990 })).status).toBe(200);
    expect(anularFatura.mock.calls).toEqual([["in_da_troca"]]);
    expect(anularFatura.mock.invocationCallOrder[0] ?? 0).toBeLessThan(cancelarNaHora.mock.invocationCallOrder[0] ?? 0);
  });

  it("a troca pendente foi PAGA no instante de anular: o valor mudou — nada é encerrado nem devolvido", async () => {
    detalhes = { faturaDaTrocaId: "in_da_troca_paga" };
    anularFatura.mockResolvedValue("paga");
    expect((await acao("devolver-tudo", { assinatura: espelhoId, centavos: 9990 })).body).toEqual({ error: "ValorMudou" });
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect(devolver).not.toHaveBeenCalled();
  });

  it("a pré-paga do Pix: devolve o Pix de que ela nasceu", async () => {
    detalhes = { pixPaymentIntentId: `pi_${S}_pix` };
    expect((await acao("devolver-tudo", { assinatura: espelhoId, centavos: 9990 })).status).toBe(200);
    expect(devolver.mock.calls.map(([p]) => p.pagamentoId)).toEqual([`pi_${S}_pix`]);
  });
});

describe("devolver um pagamento", () => {
  it("uma PARTE: devolve só o valor, com a trava e a sincronia da assinatura — e o acesso continua", async () => {
    const res = await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 1000, devolvido: 0 });
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s10,00 devolvidos desta cobrança; com acesso às aulas$/);
    expect(devolverParte.mock.calls).toEqual([[cobranca(), 1000, { userId: aluna, assinaturaId: SUB, operador: adminId }]]);
    expect(buscarAssinatura).toHaveBeenCalledWith(SUB);
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect(await ultimaDoRegistro("devolver-pagamento")).toMatchObject({ who: "OPERADOR", userId: aluna, stripeSubscriptionId: SUB, amount: 1000 });
  });

  // A decisão do operador de 31/10/2026 (à pergunta do passo 4a): só devolver não mexe no acesso — a regra das aulas libera
  // a assinatura ativa sem olhar o pagamento —; com "e encerrar a assinatura agora", ela acaba ANTES de devolver.
  it("com 'e encerrar': ENCERRA antes de devolver, o acesso acaba e a sessão cai — e o registro diz isso", async () => {
    await comSessao();
    const res = await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 9990, devolvido: 0, encerrar: true });
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s99,90 devolvidos desta cobrança; a assinatura acabou agora; sem acesso às aulas$/);
    expect(cancelarNaHora.mock.calls).toEqual([[SUB, {}]]);
    expect(cancelarNaHora.mock.invocationCallOrder[0] ?? 0).toBeLessThan(devolverParte.mock.invocationCallOrder[0] ?? 0);
    expect(await prisma.session.count({ where: { userId: aluna } })).toBe(0);
    expect(await ultimaDoRegistro("devolver-pagamento-e-encerrar")).toMatchObject({ amount: 9990, stripeSubscriptionId: SUB });
  });

  it("com 'e encerrar' na assinatura já encerrada: só devolve; sem assinatura: devolve e diz que não havia o que encerrar", async () => {
    detalhes = { status: "canceled" };
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100, devolvido: 0, encerrar: true })).status).toBe(200);
    expect(cancelarNaHora).not.toHaveBeenCalled();
    assinaturaDoPagamento.mockResolvedValue(null);
    lerCobranca.mockResolvedValue(cobranca({ pagamentoId: `pi_${S}_solto_2` }));
    const res = await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100, devolvido: 0, encerrar: true });
    expect((res.body as { detalhe: string }).detalhe).toContain("a cobrança não é de uma assinatura, nada a encerrar");
    expect(cancelarNaHora).not.toHaveBeenCalled();
  });

  it("acima do que falta voltar: 409, e nada é devolvido", async () => {
    lerCobranca.mockResolvedValue(cobranca({ devolvido: 9000 }));
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 991, devolvido: 9000 })).body).toEqual({ error: "ValorAcimaDoQueFalta" });
    expect(devolverParte).not.toHaveBeenCalled();
  });

  it("a cobrança de OUTRO cliente, a que a Stripe não conhece e a que não foi paga: 404 — nada é devolvido", async () => {
    lerCobranca.mockResolvedValueOnce(cobranca({ cliente: "cus_de_outra_pessoa" })).mockResolvedValueOnce(null).mockResolvedValueOnce(cobranca({ paga: false }));
    for (let i = 0; i < 3; i++) expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100, devolvido: 0 })).status).toBe(404);
    expect(devolverParte).not.toHaveBeenCalled();
  });

  it("o dinheiro sem assinatura (um Pix que não virou assinatura): devolve, sem sincronia", async () => {
    assinaturaDoPagamento.mockResolvedValue(null);
    lerCobranca.mockResolvedValue(cobranca({ pagamentoId: `pi_${S}_solto` }));
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 9990, devolvido: 0 })).status).toBe(200);
    expect(devolverParte.mock.calls[0]?.[2]).toEqual({ userId: aluna, assinaturaId: null, operador: adminId });
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  // A revisão de segurança do bloco 4 (P1): a chave de repetição levava o que JÁ TINHA VOLTADO lido na hora — depois da
  // primeira devolução, o mesmo pedido repetido virava outro, e devolvia a mesma parte de novo.
  it("o MESMO pedido repetido (outra aba, o Confirmar depois de uma falha de rede): 409 na segunda, e uma devolução só", async () => {
    const pedido = { conta: aluna, cobranca: `ch_${S}_1`, centavos: 2000, devolvido: 0 };
    expect((await acao("devolver-pagamento", pedido)).status).toBe(200);
    lerCobranca.mockResolvedValue(cobranca({ devolvido: 2000 }));
    expect((await acao("devolver-pagamento", pedido)).body).toEqual({ error: "ValorMudou" });
    expect(devolverParte).toHaveBeenCalledTimes(1);
  });

  it("o que já tinha voltado mudou ENTRE a conferência e a trava: 409, e nada é encerrado nem devolvido", async () => {
    lerCobranca.mockResolvedValueOnce(cobranca()).mockResolvedValue(cobranca({ devolvido: 500 }));
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 1000, devolvido: 0, encerrar: true })).body).toEqual({ error: "ValorMudou" });
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect(devolverParte).not.toHaveBeenCalled();
  });

  // A revisão de segurança do bloco 4 (P2): o encerramento que valeu com a devolução que falhou deixava a pessoa sem acesso e
  // sem o dinheiro, só com um aviso — agora é como no "Cancelar e devolver": alerta, caso urgente com a cobrança e o valor, e o
  // registro do encerramento.
  it("com 'e encerrar', a assinatura acabou e a devolução FALHOU: 502, o caso urgente com a cobrança e o valor, e o registro", async () => {
    devolverParte.mockRejectedValue(new Error("[stripe] a devolução da cobrança falhou: StripeAPIError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 3000, devolvido: 0, encerrar: true });
    expect([res.status, res.body]).toEqual([502, { error: "DevolucaoFalhou" }]);
    expect(cancelarNaHora).toHaveBeenCalledTimes(1);
    expect(erro.mock.calls.some(([linha]) => String(linha).startsWith(`[stripe] painel: a assinatura ${SUB}`))).toBe(true);
    expect(await prisma.billingCase.findUnique({ where: { kind_key: { kind: TipoDeCaso.DEVOLUCAO_FALHOU, key: `cobranca:ch_${S}_1` } } })).toMatchObject({ open: true, urgent: true, amount: 3000, stripeObjectId: `ch_${S}_1`, stripeSubscriptionId: SUB });
    expect(await ultimaDoRegistro("devolver-pagamento-e-encerrar")).toMatchObject({ detail: "a assinatura acabou agora e a devolução falhou", stripeSubscriptionId: SUB });
    await prisma.billingCase.deleteMany({ where: { key: `cobranca:ch_${S}_1` } });
    vi.restoreAllMocks();
  });

  // A revisão de segurança do bloco 4 (P2): a cobrança de um Pix cuja pré-paga o espelho ainda não tem (o aviso atrasou) dizia
  // "não é de uma assinatura" e devolvia sem encerrar.
  it("com 'e encerrar', a pré-paga do Pix que o espelho ainda não tem: achada na Stripe, encerrada antes de devolver", async () => {
    assinaturaDoPagamento.mockResolvedValue(null);
    lerCobranca.mockResolvedValue(cobranca({ pagamentoId: `pi_${S}_pix_sem_espelho` }));
    assinaturasDoPix.mockResolvedValue([{ id: SUB, status: "active", faturaPaga: true }]);
    const res = await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 9990, devolvido: 0, encerrar: true });
    expect(res.status).toBe(200);
    expect(assinaturasDoPix).toHaveBeenCalledWith(CLIENTE, `pi_${S}_pix_sem_espelho`);
    expect(cancelarNaHora.mock.calls).toEqual([[SUB, {}]]);
    expect((res.body as { detalhe: string }).detalhe).toContain("a assinatura acabou agora");
  });

  it("a devolução não saiu: 502, e nada vai ao registro", async () => {
    devolverParte.mockRejectedValue(new Error("[stripe] a devolução da cobrança falhou: StripeAPIError"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const antes = await prisma.billingLog.count({ where: { action: "devolver-pagamento" } });
    expect((await acao("devolver-pagamento", { conta: aluna, cobranca: `ch_${S}_1`, centavos: 100, devolvido: 0 })).body).toEqual({ error: "DevolucaoFalhou" });
    expect(await prisma.billingLog.count({ where: { action: "devolver-pagamento" } })).toBe(antes);
    vi.restoreAllMocks();
  });
});

describe("devolver de novo (o caso da devolução que falhou)", () => {
  const casoDe = async (chave: string, comValor: { objeto: string; centavos: number } | null = null) => {
    await abrirCaso({ tipo: TipoDeCaso.DEVOLUCAO_FALHOU, chave, urgente: true, conta: aluna, assinatura: SUB, ...(comValor ?? {}) });
    return (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.DEVOLUCAO_FALHOU, key: chave } } })).id;
  };

  it("a do reembolso (sub:): devolve o que falta pela mesma operação, e o caso fecha com o valor", async () => {
    detalhes = { status: "canceled" };
    const id = await casoDe(`sub:${SUB}`);
    const res = await resolver(id);
    expect(res.status).toBe(200);
    expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s99,90 devolvidos de novo$/);
    expect(cancelarNaHora).not.toHaveBeenCalled();
    expect(devolver).toHaveBeenCalledTimes(2);
    expect(await prisma.billingCase.findUniqueOrThrow({ where: { id } })).toMatchObject({ open: false, closedBy: "OPERADOR", closedByUserId: adminId });
    expect(await ultimaDoRegistro("devolver-de-novo")).toMatchObject({ amount: 9990 });
  });

  // A revisão de segurança do bloco 4 (P1): "Devolver de novo" devolvia TUDO o que faltava da cobrança, e a devolução que
  // falhou podia ser uma parte — agora o caso guarda a cobrança e o valor, e é exatamente isto que volta.
  it("a de uma cobrança (devolucao:re_ do aviso, cobranca:ch_ do painel): devolve EXATAMENTE o valor que falhou, com a trava da assinatura, e o caso fecha", async () => {
    for (const chave of [`devolucao:re_${S}_falhou`, `cobranca:ch_${S}_falhou`]) {
      devolverParte.mockClear();
      const id = await casoDe(chave, { objeto: `ch_${S}_1`, centavos: 2000 });
      const res = await resolver(id);
      expect(res.status).toBe(200);
      expect((res.body as { detalhe: string }).detalhe).toMatch(/^R\$\s20,00 devolvidos de novo$/);
      expect(lerCobranca).toHaveBeenCalledWith(`ch_${S}_1`);
      expect(devolverParte.mock.calls).toEqual([[cobranca(), 2000, { userId: aluna, assinaturaId: SUB, operador: adminId }]]);
      expect(buscarAssinatura).toHaveBeenCalledWith(SUB);
      expect(await prisma.billingCase.findUniqueOrThrow({ where: { id } })).toMatchObject({ open: false, closedBy: "OPERADOR" });
    }
    expect(devolver).not.toHaveBeenCalled();
  });

  it("menos do que falhou ainda falta voltar (alguém devolveu uma parte por fora): devolve só o que falta", async () => {
    lerCobranca.mockResolvedValue(cobranca({ devolvido: 9000 }));
    const id = await casoDe(`devolucao:re_${S}_parte`, { objeto: `ch_${S}_1`, centavos: 2000 });
    expect((await resolver(id)).status).toBe(200);
    expect(devolverParte.mock.calls.map(([, centavos]) => centavos)).toEqual([990]);
  });

  it("o caso antigo, sem o valor (pagamento:pi_): 409, e nada é devolvido — é pela ficha", async () => {
    const id = await casoDe(`pagamento:pi_${S}_antigo`);
    expect((await resolver(id)).body).toEqual({ error: "SemValorDaDevolucao" });
    expect(devolverParte).not.toHaveBeenCalled();
    expect(devolver).not.toHaveBeenCalled();
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).open).toBe(true);
    await prisma.billingCase.delete({ where: { id } });
  });

  it("falhou de novo: 502, e o caso continua aberto; nada faltava: o caso fecha", async () => {
    const id = await casoDe(`devolucao:re_${S}_de_novo`, { objeto: `ch_${S}_1`, centavos: 2000 });
    devolverParte.mockRejectedValueOnce(new Error("[stripe] a devolução da cobrança falhou: StripeAPIError"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await resolver(id)).body).toEqual({ error: "DevolucaoFalhou" });
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).open).toBe(true);
    lerCobranca.mockResolvedValue(cobranca({ devolvido: 9990 }));
    expect((await resolver(id)).body).toEqual({ detalhe: "nada faltava devolver" });
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { id } })).open).toBe(false);
    vi.restoreAllMocks();
  });

  it("na lista de 'Precisa de você', o caso da devolução que falhou traz o conserto — o do reembolso e o de uma cobrança com o valor; o antigo, de um pagamento, não", async () => {
    await casoDe(`sub:${SUB}_lista`);
    await casoDe(`devolucao:re_${S}_lista`, { objeto: `ch_${S}_1`, centavos: 100 });
    await casoDe(`cobranca:ch_${S}_lista`, { objeto: `ch_${S}_lista`, centavos: 100 });
    await casoDe(`pagamento:pi_${S}_lista`);
    const res = await request(servidor).get("/api/admin/cobranca/casos?situacao=abertos&pagina=1").set("Cookie", admin);
    const doTeste = (res.body as { casos: { tipo: string; conserto: string | null; aluno: { id: string } | null }[] }).casos.filter((c) => c.tipo === "DEVOLUCAO_FALHOU" && c.aluno?.id === aluna);
    expect(doTeste.map((c) => c.conserto).sort()).toEqual(["devolver-de-novo", "devolver-de-novo", "devolver-de-novo", null].sort());
  });

  it("o caso que não é de devolução: 404", async () => {
    await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave: `du:${S}`, urgente: true });
    const id = (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.CONTESTACAO, key: `du:${S}` } } })).id;
    expect((await resolver(id)).status).toBe(404);
    expect(devolver).not.toHaveBeenCalled();
  });
});
