import { describe, it, expect, vi, afterEach } from "vitest";
import { alertarConfiguracaoAusente, INTERVALO_DO_ALERTA_DE_CONFIGURACAO } from "./alerta-de-configuracao.js";

// A COBRANÇA SEM CONFIGURAÇÃO NUM PEDIDO SEM LOGIN (revisão do grupo 2 da 4.9b, 30/10/2026). O que protege: a mesma linha
// alerta no máximo uma vez a cada 15 min por cópia — um robô não gasta a reserva de alertas da cobrança —; o resto fica
// no registro; linhas diferentes não se calam; o relógio que volta não cala para sempre.
afterEach(() => vi.restoreAllMocks());

describe("o alerta de configuração ausente", () => {
  it("UM alerta a cada 15 min por linha; o resto no registro; outra linha alerta à parte; o relógio que volta não cala", () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    const inicio = 2_000_000_000_000;
    expect(INTERVALO_DO_ALERTA_DE_CONFIGURACAO).toBe(15 * 60_000);
    alertarConfiguracaoAusente("[stripe] teste: A ausente", inicio);
    alertarConfiguracaoAusente("[stripe] teste: A ausente", inicio + 14 * 60_000);
    alertarConfiguracaoAusente("[stripe] teste: B ausente", inicio + 14 * 60_000);
    expect(erro.mock.calls).toEqual([["[stripe] teste: A ausente"], ["[stripe] teste: B ausente"]]);
    expect(registro.mock.calls).toEqual([["[stripe] teste: A ausente"]]);
    alertarConfiguracaoAusente("[stripe] teste: A ausente", inicio + 15 * 60_000);
    alertarConfiguracaoAusente("[stripe] teste: A ausente", inicio);
    expect(erro.mock.calls.filter(([linha]) => linha === "[stripe] teste: A ausente")).toHaveLength(3);
  });
});
