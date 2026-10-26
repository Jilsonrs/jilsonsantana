import { describe, it, expect } from "vitest";
import { inspect } from "node:util";
import { availableParallelism } from "node:os";
import { configuracaoDasLigacoes } from "../lib/ligacoes.js";

// AS LIGAÇÕES COM O BANCO (Prisma 7, 26/10/2026): `configuracaoDasLigacoes` é função pura — recebe o
// endereço, devolve a configuração do `pg`. O que estes testes protegem (revisão de segurança):
// a senha nunca vai para um erro; um número estranho no endereço não derruba nem destrava o pool;
// e, em produção, a ligação sempre confere o certificado do banco.

const SENHA = "SENHA_MARCA_NAO_PODE_VAZAR";
const BASE = `postgresql://usuario:${SENHA}@ep-x-pooler.us-east-1.aws.neon.tech/neondb`;
const sslmode = (config: { connectionString?: string }) => new URL(config.connectionString ?? "").searchParams.get("sslmode");

/** O erro de uma chamada que tem de falhar — e o texto inteiro dele, como um registro o imprimiria. */
function erroDe(chamada: () => unknown): { mensagem: string; tudo: string } {
  try {
    chamada();
  } catch (erro) {
    return { mensagem: erro instanceof Error ? erro.message : String(erro), tudo: inspect(erro, { depth: 5 }) };
  }
  throw new Error("era para falhar");
}

describe("as ligações com o banco", () => {
  it("o padrão do Prisma 5: processadores × 2 + 1 ligações e 10 s de espera", () => {
    const config = configuracaoDasLigacoes(`${BASE}?sslmode=require`, false);
    expect(config.max).toBe(availableParallelism() * 2 + 1);
    expect(config.connectionTimeoutMillis).toBe(10_000);
  });

  it("connection_limit e pool_timeout do endereço valem, e saem do endereço que vai ao pg", () => {
    const config = configuracaoDasLigacoes(`${BASE}?connection_limit=1&pool_timeout=3`, false);
    expect(config.max).toBe(1);
    expect(config.connectionTimeoutMillis).toBe(3_000);
    expect(config.connectionString).not.toMatch(/connection_limit|pool_timeout/);
  });

  it.each(["connection_limit=0", "connection_limit=", "connection_limit=abc", "connection_limit=1.5", "pool_timeout=abc", "pool_timeout=-1"])(
    "número estranho no endereço (%s): para, em vez de derrubar ou destravar o pool",
    (parametro) => {
      const { mensagem } = erroDe(() => configuracaoDasLigacoes(`${BASE}?${parametro}`, false));
      expect(mensagem).toMatch(/^\[api\] DATABASE_URL tem (connection_limit|pool_timeout) inválido/);
    },
  );

  it("endereço que nem se lê: o erro não leva a senha (o do new URL levava)", () => {
    const { mensagem, tudo } = erroDe(() => configuracaoDasLigacoes(`postgresql://usuario:${SENHA}@servidor:porta/neondb`, true));
    expect(mensagem).toBe("[api] DATABASE_URL não é um endereço válido");
    expect(tudo).not.toContain(SENHA);
  });

  it("nenhum erro leva a senha", () => {
    for (const ruim of [`${BASE}?connection_limit=0`, `${BASE}?sslmode=disable`]) {
      expect(erroDe(() => configuracaoDasLigacoes(ruim, true)).tudo).not.toContain(SENHA);
    }
  });

  it("sslmode=require vira verify-full (o que o pg já faz com ele), em qualquer ambiente", () => {
    expect(sslmode(configuracaoDasLigacoes(`${BASE}?sslmode=require`, false))).toBe("verify-full");
    expect(sslmode(configuracaoDasLigacoes(`${BASE}?sslmode=require`, true))).toBe("verify-full");
  });

  it("em produção, sem sslmode: entra o verify-full (sem ele, o pg ligaria sem TLS)", () => {
    expect(sslmode(configuracaoDasLigacoes(BASE, true))).toBe("verify-full");
  });

  it.each(["sslmode=disable", "sslmode=prefer", "sslmode=allow", "sslmode=no-verify", "sslmode=verify-ca", "sslmode=require&uselibpqcompat=true"])(
    "em produção, TLS que não confere o certificado (%s): para",
    (parametro) => {
      expect(erroDe(() => configuracaoDasLigacoes(`${BASE}?${parametro}`, true)).mensagem).toMatch(/^\[api\] DATABASE_URL em produção/);
    },
  );

  it("o banco na própria máquina, sem TLS, continua como está — também em produção", () => {
    expect(sslmode(configuracaoDasLigacoes("postgresql://u:p@localhost:5432/jilsonsantana_test", false))).toBeNull();
    expect(sslmode(configuracaoDasLigacoes("postgresql://u:p@127.0.0.1:5432/x", true))).toBeNull();
  });

  it("em produção, 'localhost' com ?host= apontando para fora não escapa do TLS", () => {
    expect(sslmode(configuracaoDasLigacoes("postgresql://u:p@localhost:5432/x?host=ep-x.neon.tech", true))).toBe("verify-full");
  });
});
