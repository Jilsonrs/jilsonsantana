import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// O envio do e-mail na NOSSA fronteira: o balcão (`enviarEmail`) vira dublê, para o teste ler o
// código que sairia. O resto — o recurso de código do Better Auth, a sessão, o banco — roda de verdade.
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

// O código que o Better Auth GERA, mesmo quando o e-mail não sai: é por aqui que o teste prova a
// trava de "entrar por código nunca cria conta" — sem ela, o código de um e-mail sem conta existiria,
// e quem o tivesse criaria a conta.
const gerados: { email: string; otp: string; type: string }[] = [];
vi.mock("../lib/codigo-por-email.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/codigo-por-email.js")>();
  return { ...original, enviarCodigo: (args: { email: string; otp: string; type: string }) => (gerados.push(args), original.enviarCodigo(args)) };
});

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { LIMITES_DO_CODIGO } from "../lib/limite-de-tentativas.js";
import { enviarCodigo } from "../lib/codigo-por-email.js";

// O CÓDIGO NO E-MAIL (Fase 4, etapa 4.7, passo 5 — decisões do operador, 21/10/2026). O que estes
// testes protegem:
//   - ENTRAR com o código (o "Receber código de acesso"): o código sai para a conta, e com ele a
//     pessoa entra — e o e-mail dela fica confirmado;
//   - o e-mail SEM conta: a mesma resposta, nenhum e-mail sai, e entrar com código NUNCA cria conta
//     (a conta só nasce no pagamento — é a trava do `disableSignUp` do recurso);
//   - 3 tentativas e 10 minutos: o código errado demais, ou vencido, não entra;
//   - "Esqueci minha senha": o código e a senha nova — o e-mail confirmado, os OUTROS aparelhos
//     desconectados, e a senha nova entra; a conta sem senha (quem pagou e fechou a tela) ganha a
//     primeira;
//   - o código de entrar não troca senha, e o de senha não entra;
//   - o banco guarda o resumo do código, nunca o número;
//   - pedir código só pela nossa rota (com os limites): as do recurso, e as de link, desligadas;
//   - os limites: por e-mail (3 por hora e 6 por dia, de qualquer endereço) e por endereço.

const S = `${Date.now()}`;
let n = 0;
const novoEmail = () => `codigo-${++n}-${S}@teste.local`;
const SENHA = process.env.SEED_MEMBER_PASSWORD ?? "";

const pedirCodigo = (email: string, motivo: "entrar" | "senha", endereco = "198.51.100.120") =>
  request(servidor).post("/api/conta/codigo").set("x-real-ip", endereco).send({ email, motivo });
const entrarComCodigo = (email: string, otp: string) => request(servidor).post("/api/auth/sign-in/email-otp").send({ email, otp });
const trocarSenha = (email: string, otp: string, password: string) => request(servidor).post("/api/auth/email-otp/reset-password").send({ email, otp, password });
const entrarComSenha = (email: string, password: string) => request(servidor).post("/api/auth/sign-in/email").send({ email, password });
const cookies = (res: { headers: Record<string, unknown> }) => (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
const estaDentro = async (c: string[]) => (await request(servidor).get("/api/me").set("Cookie", c)).status === 200;

/** O último código que o balcão mandaria (o 2º parágrafo do e-mail). */
function ultimoCodigo(): string {
  const pedido = enviarEmail.mock.calls.at(-1)?.[0];
  return pedido?.mensagem.paragrafos[1] ?? "";
}

/** Uma conta COM senha — a mesma senha do member@ (o cadastro é fechado: o cifrado vem dele). */
async function contaComSenha(email = novoEmail()) {
  const daMember = await prisma.account.findFirst({ where: { user: { email: process.env.SEED_MEMBER_EMAIL }, providerId: "credential" }, select: { password: true } });
  const id = `conta-${S}-${++n}`;
  await prisma.user.create({ data: { id, email, accounts: { create: { id: `${id}-senha`, accountId: id, providerId: "credential", password: daMember?.password } } } });
  return { id, email };
}

/** Uma conta SEM senha — como a do visitante que pagou e fechou a tela antes de criar a senha. */
async function contaSemSenha(email = novoEmail()) {
  const id = `conta-${S}-${++n}`;
  await prisma.user.create({ data: { id, email } });
  return { id, email };
}

beforeAll(() => {
  expect(SENHA.length).toBeGreaterThan(0);
});

beforeEach(() => {
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
  gerados.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.verification.deleteMany({ where: { identifier: { contains: `-${S}@teste.local` } } });
});

describe("entrar com o código", () => {
  it("o código sai para a conta (o e-mail do banco), com 6 números; com ele a pessoa entra — e o e-mail fica confirmado", async () => {
    const conta = await contaComSenha();
    const res = await pedirCodigo(conta.email.toUpperCase(), "entrar");
    expect([res.status, res.body]).toEqual([200, { ok: true }]);
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    const pedido = enviarEmail.mock.calls[0]?.[0];
    expect([pedido?.para, pedido?.tipo, pedido?.referencia]).toEqual([conta.email, "codigo", `conta:${conta.id}`]);
    const codigo = ultimoCodigo();
    expect(codigo).toMatch(/^\d{6}$/);
    expect(pedido?.mensagem.assunto).toContain(codigo);

    const entrou = await entrarComCodigo(conta.email, codigo);
    expect(entrou.status).toBe(200);
    expect(await estaDentro(cookies(entrou))).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: conta.id } }))?.emailVerified).toBe(true);
  });

  it("o e-mail SEM conta: a mesma resposta, nenhum e-mail sai — nenhum código nem chega a existir, e entrar com código NUNCA cria a conta", async () => {
    const email = novoEmail();
    const res = await pedirCodigo(email, "entrar");
    expect([res.status, res.body]).toEqual([200, { ok: true }]);
    expect(enviarEmail).not.toHaveBeenCalled();
    // Nem gerado: sem a trava, o Better Auth geraria o código — e quem o tivesse criaria a conta.
    expect(gerados).toEqual([]);
    for (const otp of ["000000", "123456", ...gerados.map((g) => g.otp)]) {
      const tentou = await entrarComCodigo(email, otp);
      expect(tentou.status).toBeGreaterThanOrEqual(400);
      expect(cookies(tentou).some((c) => c.includes("session_token"))).toBe(false);
    }
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it("3 tentativas: depois de 3 códigos errados, nem o certo entra", async () => {
    const conta = await contaComSenha();
    await pedirCodigo(conta.email, "entrar");
    const codigo = ultimoCodigo();
    const errado = codigo === "111111" ? "222222" : "111111";
    for (let i = 0; i < 3; i++) expect((await entrarComCodigo(conta.email, errado)).status, `erro ${i + 1}`).toBeGreaterThanOrEqual(400);
    expect((await entrarComCodigo(conta.email, codigo)).status).toBeGreaterThanOrEqual(400);
  });

  it("10 minutos: o código vencido não entra", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const conta = await contaComSenha();
    await pedirCodigo(conta.email, "entrar");
    const codigo = ultimoCodigo();
    vi.setSystemTime(Date.now() + 11 * 60_000);
    expect((await entrarComCodigo(conta.email, codigo)).status).toBeGreaterThanOrEqual(400);
  });

  it("o banco guarda o resumo do código, nunca o número", async () => {
    const conta = await contaComSenha();
    await pedirCodigo(conta.email, "entrar");
    const guardados = await prisma.verification.findMany({ where: { identifier: { contains: conta.email } } });
    expect(guardados.length).toBeGreaterThan(0);
    expect(guardados.some((v) => v.value.includes(ultimoCodigo()))).toBe(false);
  });
});

describe("Esqueci minha senha — o código e a senha nova", () => {
  it("troca a senha: o e-mail fica confirmado, os OUTROS aparelhos saem, e a senha nova entra", async () => {
    const conta = await contaComSenha();
    const antes = cookies(await entrarComSenha(conta.email, SENHA));
    expect(await estaDentro(antes)).toBe(true);

    expect((await pedirCodigo(conta.email, "senha")).status).toBe(200);
    expect(enviarEmail.mock.calls[0]?.[0].mensagem.titulo).toBe("Crie uma senha nova");
    const nova = `nova-senha-${S}`;
    expect((await trocarSenha(conta.email, ultimoCodigo(), nova)).status).toBe(200);

    expect(await estaDentro(antes)).toBe(false);
    expect((await entrarComSenha(conta.email, SENHA)).status).toBe(401);
    expect((await entrarComSenha(conta.email, nova)).status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: conta.id } }))?.emailVerified).toBe(true);
  });

  it("a conta SEM senha (quem pagou e fechou a tela antes de criar a senha): o código cria a primeira", async () => {
    const conta = await contaSemSenha();
    expect((await entrarComSenha(conta.email, "qualquer-senha-1")).status).toBe(401);
    await pedirCodigo(conta.email, "senha");
    const primeira = `primeira-senha-${S}`;
    expect((await trocarSenha(conta.email, ultimoCodigo(), primeira)).status).toBe(200);
    expect((await entrarComSenha(conta.email, primeira)).status).toBe(200);
    expect(await prisma.account.count({ where: { userId: conta.id, providerId: "credential" } })).toBe(1);
  });

  it("a senha nova curta demais (menos de 8): recusada — os mesmos números da tela", async () => {
    const conta = await contaComSenha();
    await pedirCodigo(conta.email, "senha");
    expect((await trocarSenha(conta.email, ultimoCodigo(), "1234567")).status).toBe(400);
    expect((await entrarComSenha(conta.email, SENHA)).status).toBe(200);
  });

  it("o código de entrar não troca a senha, e o de senha não entra", async () => {
    const conta = await contaComSenha();
    await pedirCodigo(conta.email, "entrar");
    expect((await trocarSenha(conta.email, ultimoCodigo(), `outra-${S}`)).status).toBeGreaterThanOrEqual(400);
    await pedirCodigo(conta.email, "senha");
    expect((await entrarComCodigo(conta.email, ultimoCodigo())).status).toBeGreaterThanOrEqual(400);
    // A senha de antes continua valendo: nenhum dos dois códigos mexeu nela.
    expect((await entrarComSenha(conta.email, SENHA)).status).toBe(200);
  });
});

describe("a porta para pedir o código", () => {
  it("as rotas do recurso para pedir código, e as de link e de troca de e-mail, ficam desligadas por fora", async () => {
    const conta = await contaComSenha();
    const desligadas = [
      "/api/auth/email-otp/send-verification-otp",
      "/api/auth/email-otp/request-password-reset",
      "/api/auth/forget-password/email-otp",
      "/api/auth/email-otp/check-verification-otp",
      "/api/auth/email-otp/verify-email",
      "/api/auth/email-otp/request-email-change",
      "/api/auth/email-otp/change-email",
      "/api/auth/request-password-reset",
      "/api/auth/reset-password",
    ];
    for (const caminho of desligadas) {
      const res = await request(servidor).post(caminho).send({ email: conta.email, type: "sign-in", otp: "123456", newPassword: "x", password: "x" });
      expect(res.status, caminho).toBe(404);
    }
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("o pedido que vem de OUTRO SITE é recusado, e nada sai", async () => {
    const conta = await contaComSenha();
    const res = await request(servidor).post("/api/conta/codigo").set("Sec-Fetch-Site", "cross-site").send({ email: conta.email, motivo: "entrar" });
    expect([res.status, res.body]).toEqual([403, { error: "OutroSite" }]);
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("o motivo inventado, ou sem e-mail: 400, e nada sai", async () => {
    for (const corpo of [{ email: novoEmail(), motivo: "trocar-email" }, { motivo: "entrar" }, { email: "nao-e-email", motivo: "senha" }]) {
      expect((await request(servidor).post("/api/conta/codigo").send(corpo)).status).toBe(400);
    }
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("um tipo de código que a escola não usa não sai — e alerta", async () => {
    const conta = await contaComSenha();
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    await enviarCodigo({ email: conta.email, otp: "123456", type: "email-verification" });
    expect(enviarEmail).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledTimes(1);
  });
});

describe("os limites de pedir o código", () => {
  it(`por E-MAIL, de qualquer endereço: ${LIMITES_DO_CODIGO.email.porHora} por hora — e o seguinte é recusado, e o e-mail não sai`, async () => {
    const conta = await contaComSenha();
    for (let i = 0; i < 3; i++) expect((await pedirCodigo(conta.email, "entrar", `198.51.100.${130 + i}`)).status).toBe(200);
    const recusa = await pedirCodigo(conta.email.toUpperCase(), "senha", "198.51.100.139");
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(enviarEmail).toHaveBeenCalledTimes(3);
  });

  it(`por E-MAIL: ${LIMITES_DO_CODIGO.email.porDia} por dia, mesmo esperando a hora`, async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const conta = await contaComSenha();
    for (let rodada = 0; rodada < 2; rodada++) {
      for (let i = 0; i < 3; i++) expect((await pedirCodigo(conta.email, "entrar", `198.51.100.${140 + rodada}`)).status).toBe(200);
      vi.setSystemTime(Date.now() + 61 * 60_000);
    }
    const recusa = await pedirCodigo(conta.email, "entrar", "198.51.100.149");
    expect(recusa.status).toBe(429);
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(60 * 60);
  });

  it(`por ENDEREÇO: ${LIMITES_DO_CODIGO.endereco.porJanela} a cada 15 minutos, somando os e-mails — conta ou não`, async () => {
    for (let i = 0; i < 10; i++) expect((await pedirCodigo(novoEmail(), "entrar", "198.51.100.150")).status).toBe(200);
    expect((await pedirCodigo(novoEmail(), "entrar", "198.51.100.150")).status).toBe(429);
    expect((await pedirCodigo(novoEmail(), "entrar", "198.51.100.151")).status).toBe(200);
  });
});
