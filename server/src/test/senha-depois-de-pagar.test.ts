import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";
import { PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS } from "../lib/senha-depois-de-pagar.js";

// A SENHA LOGO DEPOIS DE PAGAR (Fase 4, etapa 4.7, passo 5 — decisão do operador, 21/10/2026: "na
// própria tela, logo após pagar"). O que estes testes protegem:
//   - a conta que NASCEU do pagamento daquela tentativa ganha a senha, e a pessoa já entra — a
//     sessão aberta, e a mesma senha vale no login;
//   - UMA vez: depois, "já tem senha", e a senha não muda (trocar é pelo código no e-mail);
//   - o código desconhecido, a ficha ainda sem conta e a conta sem acesso dão a MESMA recusa, e
//     nenhuma senha nasce; depois de 24 horas, também não;
//   - a senha nunca é aparada (espaço nas pontas é parte dela); curta, só de espaços ou longa demais,
//     recusada;
//   - dois pedidos juntos nunca criam duas senhas; e o e-mail não fica confirmado por aqui.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const SENHA = `senha-da-tela-${S}`;

/** Uma conta que nasceu de um pagamento sem conta: a ficha com a tentativa, o espelho, e sem senha. */
async function nascida({ criadaHa = 0, acesso = true, comConta = true } = {}) {
  const k = ++n;
  const id = `conta-${S}-${k}`;
  const email = `senha-${k}-${S}@teste.local`;
  const tentativa = `tentativa-${S}-${k}-abcdefghijklmnop`;
  if (comConta) {
    await prisma.user.create({ data: { id, email, createdAt: new Date(Date.now() - criadaHa) } });
    await prisma.subscription.create({
      data: { ownerUserId: id, status: acesso ? "active" : "canceled", currentPeriodEnd: new Date(Date.now() + (acesso ? 30 : -1) * DIA), stripeSubscriptionId: `sub_${S}_${k}` },
    });
  }
  await prisma.guestCheckout.create({ data: { id: `ficha-${S}-${k}`, email, stripeCustomerId: `cus_${S}_${k}`, livemode: false, tentativa, userId: comConta ? id : null } });
  return { id, email, tentativa };
}

const criarSenha = (tentativa: string, senha: string, endereco = "198.51.100.200") =>
  request(servidor).post("/api/billing/visitante/senha").set("x-real-ip", endereco).send({ tentativa, senha });
const entrar = (email: string, password: string) => request(servidor).post("/api/auth/sign-in/email").send({ email, password });
const senhasDa = (id: string) => prisma.account.count({ where: { userId: id, providerId: "credential" } });

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { id: { contains: S } } });
});

describe("a senha logo depois de pagar", () => {
  it("a conta que nasceu do pagamento ganha a senha e a pessoa já entra — e a mesma senha vale no login", async () => {
    const conta = await nascida();
    const res = await criarSenha(conta.tentativa, SENHA);
    expect([res.status, res.body]).toEqual([200, { entrou: true }]);
    const cookies = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
    expect((await request(servidor).get("/api/me").set("Cookie", cookies)).status).toBe(200);
    expect(await senhasDa(conta.id)).toBe(1);
    expect((await entrar(conta.email, SENHA)).status).toBe(200);
  });

  it("UMA vez: a segunda é 'já tem senha', e a senha não muda", async () => {
    const conta = await nascida();
    await criarSenha(conta.tentativa, SENHA);
    const outra = await criarSenha(conta.tentativa, `outra-senha-${S}`);
    expect([outra.status, outra.body]).toEqual([409, { error: "JaTemSenha" }]);
    expect(await senhasDa(conta.id)).toBe(1);
    expect((await entrar(conta.email, SENHA)).status).toBe(200);
    expect((await entrar(conta.email, `outra-senha-${S}`)).status).toBe(401);
  });

  it("o código desconhecido, a ficha ainda sem conta e a conta sem acesso: a MESMA recusa, e nenhuma senha nasce", async () => {
    const semConta = await nascida({ comConta: false });
    const semAcesso = await nascida({ acesso: false });
    for (const tentativa of [`desconhecida-${S}`, semConta.tentativa, semAcesso.tentativa]) {
      const res = await criarSenha(tentativa, SENHA);
      expect([res.status, res.body]).toEqual([409, { error: "NaoConfirmado" }]);
      expect(res.headers["set-cookie"]).toBeUndefined();
    }
    expect(await senhasDa(semAcesso.id)).toBe(0);
  });

  it(`depois de ${PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS} horas da conta nascida: 'prazo vencido', e nenhuma senha nasce`, async () => {
    expect(PRAZO_DA_SENHA_DEPOIS_DE_PAGAR_EM_HORAS).toBe(24);
    const conta = await nascida({ criadaHa: 25 * 60 * 60 * 1000 });
    expect((await criarSenha(conta.tentativa, SENHA)).body).toEqual({ error: "PrazoVencido" });
    expect(await senhasDa(conta.id)).toBe(0);
    // Dentro do prazo, passa.
    const recente = await nascida({ criadaHa: 23 * 60 * 60 * 1000 });
    expect((await criarSenha(recente.tentativa, SENHA)).status).toBe(200);
  });

  it("a senha nunca é aparada: com espaço nas pontas, vale como foi digitada; curta, só de espaços ou longa demais, recusada", async () => {
    const conta = await nascida();
    for (const ruim of ["1234567", " ".repeat(10), "x".repeat(129)]) {
      const res = await criarSenha(conta.tentativa, ruim);
      expect(res.status, JSON.stringify(ruim.slice(0, 12))).toBe(400);
    }
    expect(await senhasDa(conta.id)).toBe(0);
    const comEspacos = `  ${SENHA}  `;
    expect((await criarSenha(conta.tentativa, comEspacos)).status).toBe(200);
    expect((await entrar(conta.email, comEspacos)).status).toBe(200);
    expect((await entrar(conta.email, SENHA)).status).toBe(401);
  });

  it("a conta ocupada (outro pedido criando a senha agora): 'ocupada' na hora, e nenhuma senha nasce", async () => {
    const conta = await nascida();
    let soltar!: () => void;
    let travou!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const travada = new Promise<void>((ok) => (travou = ok));
    const outro = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`senha:${conta.id}`}))`;
      travou();
      await segura;
    }, { timeout: 20_000 });
    await travada;
    try {
      const res = await criarSenha(conta.tentativa, SENHA);
      expect([res.status, res.body]).toEqual([409, { error: "Ocupada" }]);
      expect(await senhasDa(conta.id)).toBe(0);
    } finally {
      soltar();
      await outro;
    }
  });

  it("o e-mail NÃO fica confirmado por aqui (quem digitou pode não ser o dono dele)", async () => {
    const conta = await nascida();
    await criarSenha(conta.tentativa, SENHA);
    expect((await prisma.user.findUnique({ where: { id: conta.id } }))?.emailVerified).toBe(false);
  });

  it("o pedido de outro site é recusado, e nenhuma senha nasce", async () => {
    const conta = await nascida();
    const res = await request(servidor).post("/api/billing/visitante/senha").set("Sec-Fetch-Site", "cross-site").send({ tentativa: conta.tentativa, senha: SENHA });
    expect([res.status, res.body]).toEqual([403, { error: "OutroSite" }]);
    expect(await senhasDa(conta.id)).toBe(0);
  });

  it(`o limite por endereço: ${LIMITES_DO_VISITANTE.senha.endereco.porJanela} a cada 15 minutos`, async () => {
    for (let i = 0; i < 10; i++) expect((await criarSenha(`desconhecida-${S}-${i}`, SENHA, "198.51.100.210")).status).toBe(409);
    expect((await criarSenha(`desconhecida-${S}-x`, SENHA, "198.51.100.210")).status).toBe(429);
  });
});
