import { describe, it, expect, vi, afterEach } from "vitest";
import { conferirFusoDoBanco } from "../lib/prisma.js";
import { novoPrisma } from "../lib/ligacoes.js";

// O FUSO DO BANCO (Prisma 7, 26/10/2026): o adaptador do `pg` lê as datas com fuso como se o banco
// estivesse em UTC. O Neon está em GMT; o banco de teste é posto em UTC no preparo da suíte
// (`fuso-utc.ts`); e o servidor confere ao subir — fora de UTC, alerta.

afterEach(() => {
  vi.restoreAllMocks();
});

/** Um cliente cuja sessão está em outro fuso (o Postgres aceita o fuso no endereço). */
function clienteNoFuso(fuso: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.searchParams.set("options", `-c TimeZone=${fuso}`);
  return novoPrisma(url.toString());
}

describe("o fuso do banco", () => {
  it("o banco de teste está em UTC, como o de produção: a conferência passa sem alerta", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await conferirFusoDoBanco()).toBe(true);
    expect(alerta).not.toHaveBeenCalled();
  });

  it("fora de UTC: a data com fuso sai errada — e a conferência alerta", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const emBrasilia = clienteNoFuso("America/Sao_Paulo");
    try {
      // O retrato do defeito que a conferência evita: o mesmo instante, lido numa sessão no fuso
      // de Brasília, volta 3 h errado.
      const [linha] = await emBrasilia.$queryRaw<{ instante: Date }[]>`SELECT '2026-10-26T12:00:00Z'::timestamptz AS instante`;
      expect(linha.instante.toISOString()).not.toBe("2026-10-26T12:00:00.000Z");
      expect(await conferirFusoDoBanco(emBrasilia)).toBe(false);
      expect(alerta).toHaveBeenCalledWith(expect.stringMatching(/^\[api\] o banco não está em UTC \(fuso America\/Sao_Paulo\)/));
    } finally {
      await emBrasilia.$disconnect();
    }
  });
});
