import { describe, it, expect, afterEach } from "vitest";
import { assertTestDatabase, childEnv } from "./test-env.js";

// A TRAVA DO BANCO DE TESTE: a suíte roda `prisma migrate reset --force`, que apaga o banco da
// DIRECT_URL. As DUAS variáveis têm de apontar para o banco local (26/10/2026: antes, só a
// DATABASE_URL era conferida).

const ANTES = { DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL };
afterEach(() => {
  process.env.DATABASE_URL = ANTES.DATABASE_URL;
  process.env.DIRECT_URL = ANTES.DIRECT_URL;
});

const LOCAL = "postgresql://u:p@localhost:5432/jilsonsantana_test";
const NUVEM = "postgresql://u:p@ep-algum-lugar.us-east-1.aws.neon.tech/neondb";

describe("a trava do banco de teste", () => {
  it("as duas no banco local: passa", () => {
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = LOCAL;
    expect(() => assertTestDatabase()).not.toThrow();
  });

  it("a DIRECT_URL (a que o reset apaga) na nuvem: para, mesmo com a DATABASE_URL local", () => {
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = NUVEM;
    expect(() => assertTestDatabase()).toThrow(/DIRECT_URL aponta para o host "ep-algum-lugar/);
  });

  it("a DATABASE_URL na nuvem: para", () => {
    process.env.DATABASE_URL = NUVEM;
    process.env.DIRECT_URL = LOCAL;
    expect(() => assertTestDatabase()).toThrow(/DATABASE_URL aponta para o host/);
  });

  it("sem a DIRECT_URL: para", () => {
    process.env.DATABASE_URL = LOCAL;
    delete process.env.DIRECT_URL;
    expect(() => assertTestDatabase()).toThrow(/DIRECT_URL não está definida/);
  });

  it("'localhost' no servidor, mas o ?host= mandando para outro banco: para (o `pg` liga no ?host=)", () => {
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = `${LOCAL}?host=ep-algum-lugar.us-east-1.aws.neon.tech`;
    expect(() => assertTestDatabase()).toThrow(/DIRECT_URL tem host nos parâmetros/);
  });

  it("o reset e o seed não herdam DOTENV_*: um DOTENV_CONFIG_OVERRIDE no terminal os faria ler o banco de dev", () => {
    process.env.DOTENV_CONFIG_OVERRIDE = "true";
    process.env.DOTENV_CONFIG_PATH = "/algum/.env";
    try {
      const env = childEnv();
      expect(Object.keys(env).filter((nome) => nome.startsWith("DOTENV_"))).toEqual([]);
      expect(env.DATABASE_URL).toBe(process.env.DATABASE_URL);
    } finally {
      delete process.env.DOTENV_CONFIG_OVERRIDE;
      delete process.env.DOTENV_CONFIG_PATH;
    }
  });

  it("'localhost' só no nome do banco, não no servidor: para", () => {
    process.env.DATABASE_URL = LOCAL;
    process.env.DIRECT_URL = "postgresql://u:p@evil.com:5432/localhost";
    expect(() => assertTestDatabase()).toThrow(/host "evil.com"/);
  });
});
