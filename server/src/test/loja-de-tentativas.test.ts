import { afterEach, describe, expect, it, vi } from "vitest";
import type { Options } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { LojaNoBanco, PREFIXO_DO_LOGIN, consumirTentativaDeLogin } from "../lib/loja-de-tentativas.js";

// A CONTAGEM DO LIMITE DE TENTATIVAS NO BANCO (25/10/2026 — o servidor passa a ter até 3 cópias). O
// que ela promete, contra o banco de verdade: as cópias CONTAM JUNTAS — cada cópia do servidor monta
// as suas lojas, com os mesmos nomes; aqui, duas lojas com o mesmo nome fazem o papel de duas cópias.

const QUINZE_MINUTOS = 15 * 60_000;
// Seguro: a loja só lê a janela das opções da biblioteca.
const opcoes = { windowMs: QUINZE_MINUTOS } as Options;

function copia(nome = "teste-cobranca"): LojaNoBanco {
  const loja = new LojaNoBanco(nome);
  loja.init(opcoes);
  return loja;
}

afterEach(async () => {
  vi.useRealTimers();
  await prisma.$executeRaw`DELETE FROM limite_de_tentativa WHERE starts_with(chave, 'teste-') OR starts_with(chave, ${PREFIXO_DO_LOGIN})`;
});

describe("a contagem do limite de tentativas no banco", () => {
  it("duas cópias do servidor somam a MESMA contagem", async () => {
    const primeira = copia();
    const segunda = copia();

    expect((await primeira.increment("conta:ana")).totalHits).toBe(1);
    expect((await segunda.increment("conta:ana")).totalHits).toBe(2);
    expect((await primeira.increment("conta:ana")).totalHits).toBe(3);
    expect((await segunda.get("conta:ana"))?.totalHits).toBe(3);
  });

  it("pedidos ao mesmo tempo, de duas cópias, não se perdem", async () => {
    const primeira = copia();
    const segunda = copia();

    await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? primeira : segunda).increment("endereco:1.2.3.4")));

    expect((await primeira.get("endereco:1.2.3.4"))?.totalHits).toBe(20);
  });

  it("a janela começa no primeiro pedido e, passada, a contagem recomeça do 1", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const loja = copia();
    const primeiro = await loja.increment("conta:bia");
    await loja.increment("conta:bia");
    expect(primeiro.resetTime?.getTime()).toBe(Date.now() + QUINZE_MINUTOS);

    vi.setSystemTime(Date.now() + QUINZE_MINUTOS + 1000);

    expect(await loja.get("conta:bia")).toBeUndefined();
    expect((await loja.increment("conta:bia")).totalHits).toBe(1);
  });

  it("limites diferentes (outro nome) não se misturam, e zerar um não zera o outro", async () => {
    const janela = copia("teste-conta-15min");
    const dia = copia("teste-conta-1440min");
    await janela.increment("conta:caio");
    await janela.increment("conta:caio");
    await dia.increment("conta:caio");

    expect((await janela.get("conta:caio"))?.totalHits).toBe(2);
    expect((await dia.get("conta:caio"))?.totalHits).toBe(1);

    await janela.resetAll();
    expect(await janela.get("conta:caio")).toBeUndefined();
    expect((await dia.get("conta:caio"))?.totalHits).toBe(1);
  });

  it("desfazer um pedido devolve um, e nunca deixa a contagem negativa", async () => {
    const loja = copia();
    await loja.increment("conta:duda");
    await loja.decrement("conta:duda");
    await loja.decrement("conta:duda");
    expect((await loja.get("conta:duda"))?.totalHits).toBe(0);
  });

  // A chave vai CIFRADA (revisão de segurança, 25/10/2026): o que o visitante digita não chega ao
  // banco — nem o e-mail em claro, nem um `\u0000`, que o Postgres recusa e virava 500.
  it("a chave vai cifrada: um e-mail com caractere que o Postgres recusa conta normalmente, e não fica em claro", async () => {
    const loja = copia();
    expect((await loja.increment("email:a\u0000b@x.com endereco:1.2.3.4")).totalHits).toBe(1);
    const linhas = await prisma.$queryRaw<{ chave: string }[]>`SELECT chave FROM limite_de_tentativa WHERE starts_with(chave, 'teste-cobranca|')`;
    expect(linhas).toHaveLength(1);
    expect(linhas[0].chave).not.toContain("@x.com");
    expect(linhas[0].chave).toMatch(/^teste-cobranca\|[0-9a-f]{64}$/);
  });
});

// AS TENTATIVAS DE LOGIN (`rateLimit.customStorage` do Better Auth): UMA instrução por pedido — a
// tabela pronta do Better Auth abria uma transação por pedido no caixa de ligações da sessão.
describe("as tentativas de login no banco", () => {
  it("até o teto passa; acima, recusa e diz em quantos segundos a janela libera", async () => {
    const regra = { window: 10, max: 3 };
    const respostas = [];
    for (let i = 0; i < 4; i++) respostas.push(await consumirTentativaDeLogin("203.0.113.70|/sign-in/email", regra));
    expect(respostas.slice(0, 3)).toEqual([{ allowed: true, retryAfter: null }, { allowed: true, retryAfter: null }, { allowed: true, retryAfter: null }]);
    expect(respostas[3].allowed).toBe(false);
    expect(respostas[3].retryAfter).toBeGreaterThanOrEqual(1);
    expect(respostas[3].retryAfter).toBeLessThanOrEqual(10);
  });

  it("cada endereço e rota tem a sua contagem", async () => {
    const regra = { window: 10, max: 1 };
    expect((await consumirTentativaDeLogin("203.0.113.71|/sign-in/email", regra)).allowed).toBe(true);
    expect((await consumirTentativaDeLogin("203.0.113.72|/sign-in/email", regra)).allowed).toBe(true);
    expect((await consumirTentativaDeLogin("203.0.113.71|/forget-password", regra)).allowed).toBe(true);
    expect((await consumirTentativaDeLogin("203.0.113.71|/sign-in/email", regra)).allowed).toBe(false);
  });
});
