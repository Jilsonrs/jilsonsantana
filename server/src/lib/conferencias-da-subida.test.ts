import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// AS CONFERÊNCIAS DA SUBIDA, ANTES DE ABRIR A PORTA (P128 — decisão do operador, 30/10/2026). As duas conferências viram
// dublê; o teto e a ordem rodam de verdade. O que protege: a falha vira o alerta de sempre (com a etiqueta no texto);
// a conferência lenta não segura a subida além do teto, e o que ela fizer depois não escapa sem tratamento nem vira
// alerta; a da cobrança só em produção.
const fuso = vi.fn<() => Promise<boolean>>();
const cobranca = vi.fn<() => Promise<boolean>>();
vi.mock("./prisma.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./prisma.js")>()),
  conferirFusoDoBanco: () => fuso(),
}));
vi.mock("./conferencia-da-cobranca.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./conferencia-da-cobranca.js")>()),
  conferirCobrancaNaSubida: () => cobranca(),
}));

import { comTeto, conferirNaSubida, TETO_DA_CONFERENCIA_NA_SUBIDA_EM_MS } from "./conferencias-da-subida.js";

const nunca = () => new Promise<never>(() => {});
const depois = <T>(ms: number, fazer: () => T) => new Promise<T>((ok, falha) => setTimeout(() => {
  try {
    ok(fazer());
  } catch (erro) {
    falha(erro);
  }
}, ms));

beforeEach(() => {
  fuso.mockReset().mockResolvedValue(true);
  cobranca.mockReset().mockResolvedValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe("as conferências da subida", () => {
  it("o teto de 15 s", () => {
    expect(TETO_DA_CONFERENCIA_NA_SUBIDA_EM_MS).toBe(15_000);
  });

  it("a que falha: o alerta de sempre, com o motivo dentro do texto", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    await comTeto({ nome: "do teste", rodar: () => Promise.reject(new Error("Connection terminated due to connection timeout")), falhou: "[api] não consegui conferir o teste" }, 1_000);
    expect(erro.mock.calls).toEqual([["[api] não consegui conferir o teste: Connection terminated due to connection timeout"]]);
  });

  it("a que passa do teto: a subida segue no teto, só no registro — e a falha que vem depois também fica no registro, sem alerta", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    const inicio = Date.now();
    await comTeto({ nome: "do teste", rodar: () => depois(150, () => { throw new Error("tarde demais"); }), falhou: "[api] não consegui conferir o teste" }, 30);
    expect(Date.now() - inicio).toBeLessThan(140);
    expect(registro.mock.calls.flat().join(" ")).toContain("a conferência do teste passou de 0.03 s");
    await new Promise((ok) => setTimeout(ok, 200));
    expect(registro.mock.calls.flat().join(" ")).toContain("a conferência do teste falhou depois do teto: tarde demais");
    expect(erro).not.toHaveBeenCalled();
  });

  it("a que trava de vez: a subida segue no teto", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const inicio = Date.now();
    await comTeto({ nome: "do teste", rodar: nunca, falhou: "[api] x" }, 30);
    expect(Date.now() - inicio).toBeLessThan(1_000);
  });

  it("fora de produção, só o fuso; em produção, o fuso e depois a cobrança — a que falha não impede a outra", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    await conferirNaSubida(false, 1_000);
    expect(fuso).toHaveBeenCalledTimes(1);
    expect(cobranca).not.toHaveBeenCalled();

    const ordem: string[] = [];
    fuso.mockImplementation(async () => {
      ordem.push("fuso");
      throw new Error("sem banco");
    });
    cobranca.mockImplementation(async () => {
      ordem.push("cobrança");
      return true;
    });
    await conferirNaSubida(true, 1_000);
    expect(ordem).toEqual(["fuso", "cobrança"]);
    expect(erro.mock.calls.flat().join(" ")).toContain("[api] não consegui conferir o fuso do banco: sem banco");
  });

  it("a cobrança que falha: o alerta de sempre, com a etiqueta da Stripe", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    cobranca.mockRejectedValue(new Error("a lista caiu"));
    await conferirNaSubida(true, 1_000);
    expect(erro.mock.calls).toEqual([["[stripe] subida: a conferência da cobrança falhou: a lista caiu"]]);
  });
});
