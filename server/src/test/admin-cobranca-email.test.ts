import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { PedidoDeEmail, Envio } from "../lib/email.js";
import type { ClienteNaStripe } from "../lib/stripe-limpeza.js";

// CORRIGIR O E-MAIL (etapa 4.7b, passo 3c — decisão do operador P121: "com o código no e-mail novo"). É a porta de tomar
// conta. Só a rede da Stripe e o balcão de e-mail viram dublê; o resto — o pedido guardado, as travas, o Better Auth (a
// sessão, a senha, a entrada pelo código) e o banco — roda de verdade. O que protege:
//   - SÓ ADMIN, o corpo no formato; o código vai ao e-mail CERTO (nunca ao da conta), e o banco guarda só o resumo dele;
//   - recusa a conta que não existe, o mesmo e-mail e o e-mail de outra conta — sem mandar nada;
//   - SÓ COM O CÓDIGO: o errado não troca, e a 3ª tentativa apaga o pedido; o vencido, o de outro pedido e o de outro
//     e-mail não valem;
//   - a troca: o e-mail (em minúsculas) confirmado, as SESSÕES e a SENHA encerradas, a ficha do visitante e os clientes
//     da Stripe com o e-mail novo, o registro com quem trocou (sem os e-mails) — e a pessoa entra pelo código no novo;
//   - a Stripe que falha não muda nada; a tentativa sem pagamento do e-mail novo sai (a regra da limpeza); com
//     pagamento, nada muda.
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));
const trocarEmailDoCliente = vi.fn<(cliente: string, email: string) => Promise<void>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  trocarEmailDoCliente: (cliente: string, email: string) => trocarEmailDoCliente(cliente, email),
}));
const lerClienteNaStripe = vi.fn<(cliente: string) => Promise<ClienteNaStripe | "nao-existe">>();
const apagarClienteNaStripe = vi.fn<(cliente: string) => Promise<"apagado" | "nao-existe">>();
vi.mock("../lib/stripe-limpeza.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-limpeza.js")>()),
  lerClienteNaStripe: (cliente: string) => lerClienteNaStripe(cliente),
  cancelarPagamentoAberto: async () => undefined,
  apagarClienteNaStripe: (cliente: string) => apagarClienteNaStripe(cliente),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { resumoDoCodigo } from "../lib/correcao-de-email.js";

const S = `${Date.now()}`;
let n = 0;
const novoEmail = (nome = "certo") => `email-${nome}-${++n}-${S}@teste.local`;
const SENHA = process.env.SEED_MEMBER_PASSWORD ?? "";
const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];
let adminId = "";

const cookies = (res: { headers: Record<string, unknown> }) => (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
const entrarComSenha = (email: string, password: string) => request(servidor).post("/api/auth/sign-in/email").send({ email, password });
const estaDentro = async (c: string[]) => (await request(servidor).get("/api/me").set("Cookie", c)).status === 200;
const pedirCodigo = (corpo: object, c: string[] = admin) => request(servidor).post("/api/admin/cobranca/acoes/corrigir-email/codigo").set("Cookie", c).send(corpo);
const trocar = (corpo: object, c: string[] = admin) => request(servidor).post("/api/admin/cobranca/acoes/corrigir-email").set("Cookie", c).send(corpo);
const doTipo = (tipo: string) => enviarEmail.mock.calls.map(([p]) => p).filter((p) => p.tipo === tipo);
/** O código que o balcão mandaria ao e-mail novo (o 2º parágrafo do e-mail). */
const codigoEnviado = () => doTipo("codigo-do-email-novo").at(-1)?.mensagem.paragrafos[1] ?? "";
const outroCodigo = (codigo: string) => String((Number(codigo) + 1) % 1_000_000).padStart(6, "0");

/** Uma aluna COM senha (a cifrada do member@: o cadastro é fechado), com o cliente na Stripe e a ficha de onde nasceu. */
async function aluna() {
  const daMember = await prisma.account.findFirst({ where: { user: { email: process.env.SEED_MEMBER_EMAIL }, providerId: "credential" }, select: { password: true } });
  const id = `email-${S}-${++n}`;
  const email = novoEmail("errado");
  await prisma.user.create({ data: { id, email, accounts: { create: { id: `${id}-senha`, accountId: id, providerId: "credential", password: daMember?.password } } } });
  await prisma.stripeCustomer.create({ data: { userId: id, stripeCustomerId: `cus_${id}`, livemode: false } });
  await prisma.guestCheckout.create({ data: { id: `ficha-${id}`, email, stripeCustomerId: `cus_ficha_${id}`, livemode: false, userId: id } });
  const sessao = cookies(await entrarComSenha(email, SENHA));
  expect(await estaDentro(sessao)).toBe(true);
  return { id, email, sessao };
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = cookies(await entrarComSenha(process.env.SEED_ADMIN_EMAIL ?? "", process.env.SEED_ADMIN_PASSWORD ?? ""));
  member = cookies(await entrarComSenha(process.env.SEED_MEMBER_EMAIL ?? "", SENHA));
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() } })).id;
});

beforeEach(() => {
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
  trocarEmailDoCliente.mockReset().mockResolvedValue(undefined);
  lerClienteNaStripe.mockReset().mockResolvedValue({ assinaturas: [], pagamentos: [], completo: true });
  apagarClienteNaStripe.mockReset().mockResolvedValue("apagado");
});

afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { actorUserId: adminId, action: { in: ["codigo-do-email-novo", "corrigir-email"] } } });
  await prisma.guestCheckout.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: `email-${S}-` } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.verification.deleteMany({ where: { identifier: { contains: `-${S}@teste.local` } } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("corrigir o e-mail — o código", () => {
  it("só admin, e o corpo no formato", async () => {
    const conta = await aluna();
    const email = novoEmail();
    expect((await pedirCodigo({ conta: conta.id, email }, member)).status).toBe(403);
    expect((await pedirCodigo({ conta: conta.id, email }, [])).status).toBe(401);
    expect((await trocar({ conta: conta.id, email, codigo: "123456" }, member)).status).toBe(403);
    expect((await pedirCodigo({ conta: conta.id, email: "não é e-mail" })).status).toBe(400);
    expect((await pedirCodigo({ conta: conta.id, email, extra: 1 })).status).toBe(400);
    expect((await trocar({ conta: conta.id, email, codigo: "12345" })).status).toBe(400);
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("o código vai ao e-mail CERTO, com 6 números; o banco guarda só o resumo; a conta não muda; o registro diz quem pediu", async () => {
    const conta = await aluna();
    const email = novoEmail();
    const res = await pedirCodigo({ conta: conta.id, email: `  ${email.toUpperCase()} ` });
    expect([res.status, res.body]).toEqual([200, { minutos: 10 }]);
    const [pedido] = doTipo("codigo-do-email-novo");
    expect([pedido?.para, pedido?.referencia]).toEqual([email, `conta:${conta.id}`]);
    const codigo = codigoEnviado();
    expect(codigo).toMatch(/^\d{6}$/);
    expect(pedido?.mensagem.assunto).toContain(codigo);
    const guardado = await prisma.emailCorrection.findUniqueOrThrow({ where: { userId: conta.id } });
    expect([guardado.newEmail, guardado.attempts, guardado.requestedBy]).toEqual([email, 0, adminId]);
    expect(JSON.stringify(guardado)).not.toContain(codigo);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: conta.id } })).email).toBe(conta.email);
    expect(await prisma.billingLog.findFirst({ where: { action: "codigo-do-email-novo", userId: conta.id } })).toMatchObject({ who: "OPERADOR", actorUserId: adminId });
  });

  it("recusa a conta que não existe (404), o mesmo e-mail e o e-mail de outra conta (409) — sem mandar nada", async () => {
    const conta = await aluna();
    const outra = await aluna();
    expect([(await pedirCodigo({ conta: "nao-existe", email: novoEmail() })).status]).toEqual([404]);
    expect((await pedirCodigo({ conta: conta.id, email: conta.email.toUpperCase() })).body).toEqual({ error: "MesmoEmail" });
    expect((await pedirCodigo({ conta: conta.id, email: outra.email })).body).toEqual({ error: "EmailDeOutraConta" });
    expect(enviarEmail).not.toHaveBeenCalled();
    expect(await prisma.emailCorrection.findUnique({ where: { userId: conta.id } })).toBeNull();
  });

  // A revisão de segurança do bloco 3: com uma sessão de admin roubada, a troca daria a conta de admin a quem a roubou.
  it("a conta de ADMIN (e a do próprio operador) não se corrige: nem o código sai, nem a troca vale", async () => {
    expect((await pedirCodigo({ conta: adminId, email: novoEmail() })).body).toEqual({ error: "ContaDeAdmin" });
    const outroAdmin = `email-${S}-${++n}`;
    const doOutro = novoEmail("admin");
    await prisma.user.create({ data: { id: outroAdmin, email: doOutro, role: "admin" } });
    expect((await pedirCodigo({ conta: outroAdmin, email: novoEmail() })).body).toEqual({ error: "ContaDeAdmin" });
    expect(enviarEmail).not.toHaveBeenCalled();
    // E de novo na troca, com as travas: um pedido que exista (gravado aqui à mão) não passa.
    const email = novoEmail();
    await prisma.emailCorrection.create({ data: { userId: outroAdmin, newEmail: email, codeHash: resumoDoCodigo(outroAdmin, email, "123456"), expiresAt: new Date(Date.now() + 60_000), requestedBy: adminId } });
    expect((await trocar({ conta: outroAdmin, email, codigo: "123456" })).body).toEqual({ error: "ContaDeAdmin" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: outroAdmin } })).email).toBe(doOutro);
    expect(trocarEmailDoCliente).not.toHaveBeenCalled();
  });

  it("o código ao mesmo e-mail: 3 por hora (o teto do código de entrar) — depois, 429, e nada sai", async () => {
    const conta = await aluna();
    const email = novoEmail();
    for (let i = 0; i < 3; i++) expect((await pedirCodigo({ conta: conta.id, email })).status).toBe(200);
    const res = await pedirCodigo({ conta: conta.id, email });
    expect([res.status, res.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(doTipo("codigo-do-email-novo")).toHaveLength(3);
  });

  it("o e-mail que não saiu: 502, e o pedido não fica — o código dele não vale", async () => {
    const conta = await aluna();
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "falhou" });
    const res = await pedirCodigo({ conta: conta.id, email: novoEmail() });
    expect([res.status, res.body]).toEqual([502, { error: "EmailNaoSaiu" }]);
    expect(await prisma.emailCorrection.findUnique({ where: { userId: conta.id } })).toBeNull();
  });
});

describe("corrigir o e-mail — a troca", () => {
  it("com o código: o e-mail confirmado; as sessões e a SENHA encerradas; a ficha e os clientes da Stripe com o novo; o registro — e a pessoa entra pelo código no e-mail novo", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await pedirCodigo({ conta: conta.id, email });
    const res = await trocar({ conta: conta.id, email: email.toUpperCase(), codigo: codigoEnviado() });
    expect([res.status, res.body]).toEqual([200, { email }]);

    const depois = await prisma.user.findUniqueOrThrow({ where: { id: conta.id } });
    expect([depois.email, depois.emailVerified]).toEqual([email, true]);
    expect(await estaDentro(conta.sessao)).toBe(false);
    expect(await prisma.session.count({ where: { userId: conta.id } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: conta.id, providerId: "credential" } })).toBe(0);
    expect((await entrarComSenha(email, SENHA)).status).toBe(401);
    expect((await prisma.guestCheckout.findUniqueOrThrow({ where: { userId: conta.id } })).email).toBe(email);
    expect(trocarEmailDoCliente.mock.calls.sort()).toEqual([[`cus_${conta.id}`, email], [`cus_ficha_${conta.id}`, email]]);
    expect(await prisma.emailCorrection.findUnique({ where: { userId: conta.id } })).toBeNull();
    const registro = await prisma.billingLog.findFirstOrThrow({ where: { action: "corrigir-email", userId: conta.id } });
    expect([registro.who, registro.actorUserId]).toEqual(["OPERADOR", adminId]);
    expect(registro.detail).not.toContain("@");

    // A pessoa entra pelo código no e-mail NOVO (o do Better Auth, de sempre) — e o e-mail antigo não tem mais conta.
    enviarEmail.mockClear();
    await request(servidor).post("/api/conta/codigo").set("x-forwarded-for", "198.51.100.230").send({ email: conta.email, motivo: "entrar" });
    expect(doTipo("codigo")).toHaveLength(0);
    await request(servidor).post("/api/conta/codigo").set("x-forwarded-for", "198.51.100.230").send({ email, motivo: "entrar" });
    const [doLogin] = doTipo("codigo");
    expect(doLogin?.para).toBe(email);
    const entrou = await request(servidor).post("/api/auth/sign-in/email-otp").send({ email, otp: doLogin?.mensagem.paragrafos[1] });
    expect(entrou.status).toBe(200);
    expect(await estaDentro(cookies(entrou))).toBe(true);
  });

  it("o código ERRADO não troca; a 3ª tentativa apaga o pedido — e nem o certo vale depois", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await pedirCodigo({ conta: conta.id, email });
    const certo = codigoEnviado();
    for (let i = 0; i < 2; i++) expect((await trocar({ conta: conta.id, email, codigo: outroCodigo(certo) })).body).toEqual({ error: "CodigoErrado" });
    expect((await prisma.emailCorrection.findUniqueOrThrow({ where: { userId: conta.id } })).attempts).toBe(2);
    expect((await trocar({ conta: conta.id, email, codigo: outroCodigo(certo) })).body).toEqual({ error: "CodigoErrado" });
    expect(await prisma.emailCorrection.findUnique({ where: { userId: conta.id } })).toBeNull();
    expect((await trocar({ conta: conta.id, email, codigo: certo })).body).toEqual({ error: "CodigoVencido" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: conta.id } })).email).toBe(conta.email);
    expect(await estaDentro(conta.sessao)).toBe(true);
    expect(trocarEmailDoCliente).not.toHaveBeenCalled();
  });

  // A revisão de segurança do bloco 3: a tentativa era contada DEPOIS de comparar, e N pedidos juntos comparavam N códigos.
  it("5 tentativas erradas AO MESMO TEMPO: no máximo 3 são comparadas — as outras já acham o pedido esgotado", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await pedirCodigo({ conta: conta.id, email });
    const errado = outroCodigo(codigoEnviado());
    const respostas = await Promise.all(Array.from({ length: 5 }, () => trocar({ conta: conta.id, email, codigo: errado })));
    const erros = respostas.map((r) => (r.body as { error?: string }).error);
    expect(erros.filter((e) => e === "CodigoErrado").length).toBeLessThanOrEqual(3);
    expect(erros.every((e) => e === "CodigoErrado" || e === "CodigoVencido")).toBe(true);
    expect(await prisma.emailCorrection.findUnique({ where: { userId: conta.id } })).toBeNull();
  });

  it("o vencido, o de um pedido substituído e o de outro e-mail não valem", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await pedirCodigo({ conta: conta.id, email });
    const primeiro = codigoEnviado();
    await pedirCodigo({ conta: conta.id, email });
    const segundo = codigoEnviado();
    if (primeiro !== segundo) expect((await trocar({ conta: conta.id, email, codigo: primeiro })).body).toEqual({ error: "CodigoErrado" });
    expect((await trocar({ conta: conta.id, email: novoEmail(), codigo: segundo })).body).toEqual({ error: "CodigoVencido" });
    await prisma.emailCorrection.update({ where: { userId: conta.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await trocar({ conta: conta.id, email, codigo: segundo })).body).toEqual({ error: "CodigoVencido" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: conta.id } })).email).toBe(conta.email);
  });

  it("a Stripe falhou: nada muda — e repetir, com a Stripe de volta, troca", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await pedirCodigo({ conta: conta.id, email });
    const codigo = codigoEnviado();
    trocarEmailDoCliente.mockRejectedValueOnce(new Error("[stripe] a troca do e-mail do cliente falhou: StripeConnectionError"));
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await trocar({ conta: conta.id, email, codigo })).status).toBe(500);
    } finally {
      erro.mockRestore();
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: conta.id } })).email).toBe(conta.email);
    expect(await estaDentro(conta.sessao)).toBe(true);
    expect(await prisma.account.count({ where: { userId: conta.id, providerId: "credential" } })).toBe(1);
    expect((await trocar({ conta: conta.id, email, codigo })).body).toEqual({ email });
  });

  it("o e-mail novo com uma tentativa SEM pagamento: ela sai (a ficha e o cliente na Stripe) e a troca segue; COM pagamento, nada muda", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await prisma.guestCheckout.create({ data: { id: `tentativa-${conta.id}`, email, stripeCustomerId: `cus_tentativa_${conta.id}`, livemode: false } });
    await pedirCodigo({ conta: conta.id, email });
    const codigo = codigoEnviado();

    lerClienteNaStripe.mockResolvedValueOnce({ assinaturas: ["active"], pagamentos: [], completo: true });
    expect((await trocar({ conta: conta.id, email, codigo })).body).toEqual({ error: "PagamentoNoEmailNovo" });
    expect(apagarClienteNaStripe).not.toHaveBeenCalled();
    expect(await prisma.guestCheckout.findUnique({ where: { id: `tentativa-${conta.id}` } })).not.toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: conta.id } })).email).toBe(conta.email);

    expect((await trocar({ conta: conta.id, email, codigo })).body).toEqual({ email });
    expect(apagarClienteNaStripe.mock.calls).toEqual([[`cus_tentativa_${conta.id}`]]);
    expect(await prisma.guestCheckout.findUnique({ where: { id: `tentativa-${conta.id}` } })).toBeNull();
    expect((await prisma.guestCheckout.findUniqueOrThrow({ where: { userId: conta.id } })).email).toBe(email);
  });

  it("o e-mail novo ganhou uma conta entre o código e a troca: 409, e nada muda", async () => {
    const conta = await aluna();
    const email = novoEmail();
    await pedirCodigo({ conta: conta.id, email });
    await prisma.user.create({ data: { id: `email-${S}-${++n}`, email } });
    expect((await trocar({ conta: conta.id, email, codigo: codigoEnviado() })).body).toEqual({ error: "EmailDeOutraConta" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: conta.id } })).email).toBe(conta.email);
    expect(await estaDentro(conta.sessao)).toBe(true);
    // Recusada ANTES da Stripe: o cliente dela não fica com um e-mail que a conta não tem.
    expect(trocarEmailDoCliente).not.toHaveBeenCalled();
  });
});
