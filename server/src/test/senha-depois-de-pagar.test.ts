import { describe, it, expect, vi, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// O balcão de e-mail na NOSSA fronteira: vira dublê, para o teste ler o código de entrar que sairia.
// O recurso de código do Better Auth, a sessão e o banco rodam de verdade.
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { auth } from "../lib/auth.js";
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
//   - dois pedidos juntos nunca criam duas senhas;
//   - O E-MAIL FICA CONFIRMADO ao criar a senha (decisão do operador, P94, 21/10/2026: o código é só
//     mais uma forma de entrar): entrar pelo código depois NÃO apaga a senha nem tira ninguém — o
//     Better Auth faz isso com toda conta de e-mail não confirmado;
//   - o e-mail confirmado por OUTRO caminho antes (o dono entrou pelo código): a tentativa não cria
//     senha ("e-mail confirmado" — revisão de segurança, 21/10/2026); e a marca da vez fica na
//     ficha, mesmo que a linha de senha suma;
//   - a senha criada e a sessão que não abre: a resposta diz "não entrou", e é ALERTA.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let n = 0;
const SENHA = `senha-da-tela-${S}`;
/** O resumo que a ficha guarda (passo 6b): o SHA-256 da tentativa, em hexadecimal — calculado aqui, à parte. */
const sha256 = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

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
  await prisma.guestCheckout.create({ data: { id: `ficha-${S}-${k}`, email, stripeCustomerId: `cus_${S}_${k}`, livemode: false, tentativa: sha256(tentativa), userId: comConta ? id : null } });
  return { id, email, tentativa };
}

const criarSenha = (tentativa: string, senha: string, endereco = "198.51.100.200") =>
  request(servidor).post("/api/billing/visitante/senha").set("x-forwarded-for", endereco).send({ tentativa, senha });
const entrar = (email: string, password: string) => request(servidor).post("/api/auth/sign-in/email").send({ email, password });
const senhasDa = (id: string) => prisma.account.count({ where: { userId: id, providerId: "credential" } });

let enderecoDoCodigo = 0;
/** Pede o código de ENTRAR (pela nossa rota) e devolve o número que o e-mail levaria. */
async function codigoParaEntrar(email: string): Promise<string> {
  const res = await request(servidor).post("/api/conta/codigo").set("x-forwarded-for", `198.51.100.${220 + ++enderecoDoCodigo}`).send({ email, motivo: "entrar" });
  expect(res.status).toBe(200);
  return enviarEmail.mock.calls.at(-1)?.[0].mensagem.paragrafos[1] ?? "";
}
const entrarComCodigo = (email: string, otp: string) => request(servidor).post("/api/auth/sign-in/email-otp").send({ email, otp });

beforeEach(() => {
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { id: { contains: S } } });
  await prisma.verification.deleteMany({ where: { identifier: { contains: `-${S}@teste.local` } } });
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

  // E16 (decisão do operador P123; texto aprovado em 30/10/2026): a senha criada avisa a caixa — uma vez, com a chave da
  // conta, para o e-mail do nosso banco; se não foi a pessoa, o "Esqueci minha senha" desconecta quem entrou.
  it("a senha criada manda o aviso para a caixa da conta — uma vez, com a chave da conta; a recusa seguinte não manda nada", async () => {
    const conta = await nascida();
    enviarEmail.mockClear();
    expect((await criarSenha(conta.tentativa, SENHA)).status).toBe(200);
    const avisos = enviarEmail.mock.calls.map(([pedido]) => pedido).filter((pedido) => pedido.tipo === "senha-criada");
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ para: conta.email, chave: `senha-criada/${conta.id}`, referencia: `conta:${conta.id}`, mensagem: { assunto: "Uma senha foi criada para a sua conta", titulo: "Uma senha foi criada" } });
    expect(avisos[0]?.mensagem.paragrafos).toEqual([
      "Uma senha foi criada agora para entrar na escola com este e-mail.",
      'Se não foi você, crie uma senha nova em "Esqueci minha senha", na tela de entrar: quem entrou com a senha anterior sai da conta na hora.',
    ]);
    expect((await criarSenha(conta.tentativa, `outra-senha-${S}`)).status).toBe(409);
    expect(enviarEmail.mock.calls.filter(([pedido]) => pedido.tipo === "senha-criada")).toHaveLength(1);
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

  it("o e-mail fica confirmado ao criar a senha (decisão do operador, P94) — e não antes", async () => {
    const conta = await nascida();
    expect((await prisma.user.findUnique({ where: { id: conta.id } }))?.emailVerified).toBe(false);
    await criarSenha(conta.tentativa, SENHA);
    expect((await prisma.user.findUnique({ where: { id: conta.id } }))?.emailVerified).toBe(true);
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

// O CÓDIGO É SÓ MAIS UMA FORMA DE ENTRAR (decisão do operador, P94, 21/10/2026: "entra com senha ou
// código") — e a tentativa não passa por cima de quem confirmou o e-mail ANTES por outro caminho
// (revisão de segurança, 21/10/2026: alguém pode ter pago com o e-mail de outra pessoa).
describe("a senha da tentativa e o código no e-mail", () => {
  it("a senha criada pela tentativa CONTINUA valendo depois de entrar pelo código, e quem estava dentro continua", async () => {
    const conta = await nascida();
    const criada = await criarSenha(conta.tentativa, SENHA);
    expect(criada.status).toBe(200);
    const dentro = (criada.headers["set-cookie"] as unknown as string[] | undefined) ?? [];

    expect((await entrarComCodigo(conta.email, await codigoParaEntrar(conta.email))).status).toBe(200);
    expect(await senhasDa(conta.id)).toBe(1);
    expect((await entrar(conta.email, SENHA)).status).toBe(200);
    expect((await request(servidor).get("/api/me").set("Cookie", dentro)).status).toBe(200);

    // E a tentativa não cria outra: a vez já foi.
    const deNovo = await criarSenha(conta.tentativa, `outra-senha-${S}`);
    expect([deNovo.status, deNovo.body]).toEqual([409, { error: "JaTemSenha" }]);
    expect((await entrar(conta.email, SENHA)).status).toBe(200);
  });

  it("a dona entrou pelo código ANTES: a tentativa não cria senha nenhuma ('e-mail confirmado')", async () => {
    const conta = await nascida();
    expect((await entrarComCodigo(conta.email, await codigoParaEntrar(conta.email))).status).toBe(200);
    const res = await criarSenha(conta.tentativa, SENHA);
    expect([res.status, res.body]).toEqual([409, { error: "EmailConfirmado" }]);
    expect(await senhasDa(conta.id)).toBe(0);
  });

  it("a marca da vez fica na ficha: mesmo que a linha de senha suma e o e-mail volte a não confirmado, a tentativa não cria outra", async () => {
    const conta = await nascida();
    expect((await criarSenha(conta.tentativa, SENHA)).status).toBe(200);
    expect((await prisma.guestCheckout.findUnique({ where: { tentativa: sha256(conta.tentativa) } }))?.senhaCriadaEm).toBeInstanceOf(Date);
    await prisma.account.deleteMany({ where: { userId: conta.id, providerId: "credential" } });
    await prisma.user.update({ where: { id: conta.id }, data: { emailVerified: false } });

    const deNovo = await criarSenha(conta.tentativa, `outra-senha-${S}`);
    expect([deNovo.status, deNovo.body]).toEqual([409, { error: "JaTemSenha" }]);
    expect(await senhasDa(conta.id)).toBe(0);
  });
});

describe("a senha criada e a sessão que não abre", () => {
  const alertou = (alerta: { mock: { calls: unknown[][] } }, contaId: string) =>
    alerta.mock.calls.some(([linha]) => String(linha).startsWith(`[api] a conta ${contaId} criou a senha, e a sessão não abriu`));

  it("o login falhou: a senha fica, a resposta diz 'não entrou' — e é ALERTA", async () => {
    const conta = await nascida();
    vi.spyOn(auth.api, "signInEmail").mockRejectedValueOnce(new Error("o login quebrou"));
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await criarSenha(conta.tentativa, SENHA);
    expect([res.status, res.body]).toEqual([200, { entrou: false }]);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(await senhasDa(conta.id)).toBe(1);
    expect(alertou(alerta, conta.id)).toBe(true);
  });

  it("o login não devolveu o cookie: 'não entrou' — e o mesmo alerta", async () => {
    const conta = await nascida();
    // O formato que a rota lê do login (`headers`), sem cookie nenhum: o tipo completo da resposta não importa aqui.
    vi.spyOn(auth.api, "signInEmail").mockResolvedValueOnce({ headers: new Headers() } as never);
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await criarSenha(conta.tentativa, SENHA);
    expect([res.status, res.body]).toEqual([200, { entrou: false }]);
    expect(alertou(alerta, conta.id)).toBe(true);
  });
});
