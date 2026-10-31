// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CodigoDaLista } from "@jilson/core";

const adminListarCodigos = vi.fn<() => Promise<CodigoDaLista[]>>();
const adminMudarCodigo = vi.fn<(id: string, ativo: boolean) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminListarCodigos: () => adminListarCodigos(),
  adminMudarCodigo: (id: string, ativo: boolean) => adminMudarCodigo(id, ativo),
  adminCriarCodigo: vi.fn(),
}));

import { CobrancaCodigosPage } from "./CobrancaCodigosPage";

// ADMIN → COBRANÇA → CÓDIGOS PROMOCIONAIS (etapa 4.7b, passo 6d — P142). O que protege: os estados (carregando, erro com
// "tentar de novo", vazio); o que cada linha diz (o desconto, quantos usaram, a validade, a situação); "Pausar" só no ativo
// e "Reativar" só no pausado, com o id certo; o esgotado e o vencido sem botão; o que não deu diz por quê.

const codigo = (mudanca: Partial<CodigoDaLista>): CodigoDaLista => ({ id: "promo_1", codigo: "PRESENTE-K7Q2X9", percentual: 100, duracao: "para-sempre", meses: null, usados: 1, maximo: 3, validoAte: null, situacao: "ativo", criadoEm: "2026-10-31T12:00:00.000Z", ...mudanca });
const linha = (texto: string) => {
  const item = screen.getByText(texto).closest("li");
  if (!item) throw new Error(`sem a linha de ${texto}`);
  return item;
};

beforeEach(() => {
  adminListarCodigos.mockReset().mockResolvedValue([
    codigo({}),
    codigo({ id: "promo_2", codigo: "BLACK50", percentual: 50, duracao: "uma-vez", usados: 12, maximo: null, validoAte: "2026-12-01T02:59:59.000Z", situacao: "pausado" }),
    codigo({ id: "promo_3", codigo: "PRESENTE-ESGOT1", usados: 1, maximo: 1, situacao: "esgotado" }),
    codigo({ id: "promo_4", codigo: "VELHO10", percentual: 10, duracao: "por-meses", meses: 3, usados: 0, maximo: null, validoAte: "2026-10-01T02:59:59.000Z", situacao: "vencido" }),
  ]);
  adminMudarCodigo.mockReset().mockResolvedValue({ detalhe: "feito" });
});

describe("Cobrança → Códigos promocionais", () => {
  it("carregando", () => {
    adminListarCodigos.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CobrancaCodigosPage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    adminListarCodigos.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<CobrancaCodigosPage />);
    expect(await screen.findByText("Não foi possível carregar os códigos.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await vi.waitFor(() => expect(adminListarCodigos).toHaveBeenCalledTimes(2));
  });

  it("vazio: diz que não há nenhum", async () => {
    adminListarCodigos.mockResolvedValue([]);
    renderWithProviders(<CobrancaCodigosPage />);
    expect(await screen.findByText("Nenhum código ainda.")).toBeTruthy();
  });

  it("cada linha diz o desconto, quantos usaram, a validade e a situação", async () => {
    renderWithProviders(<CobrancaCodigosPage />);
    await screen.findByText("PRESENTE-K7Q2X9");
    expect(linha("PRESENTE-K7Q2X9").textContent).toBe("PRESENTE-K7Q2X9Ativo100% em todas as cobranças · 1 de 3 usos · sem data para vencerPausar");
    expect(linha("BLACK50").textContent).toBe("BLACK50Pausado50% só na primeira cobrança · 12 usos · vale até 30/11/2026Reativar");
    expect(linha("PRESENTE-ESGOT1").textContent).toBe("PRESENTE-ESGOT1Esgotado100% em todas as cobranças · 1 de 1 uso · sem data para vencer");
    expect(linha("VELHO10").textContent).toBe("VELHO10Vencido10% por 3 meses · 0 usos · vale até 30/09/2026");
  });

  it("'Pausar' no ativo e 'Reativar' no pausado, com o id certo — e a lista é lida de novo", async () => {
    renderWithProviders(<CobrancaCodigosPage />);
    await screen.findByText("PRESENTE-K7Q2X9");
    fireEvent.click(within(linha("PRESENTE-K7Q2X9")).getByRole("button", { name: "Pausar" }));
    await vi.waitFor(() => expect(adminListarCodigos).toHaveBeenCalledTimes(2));
    fireEvent.click(within(linha("BLACK50")).getByRole("button", { name: "Reativar" }));
    await vi.waitFor(() => expect(adminListarCodigos).toHaveBeenCalledTimes(3));
    expect(adminMudarCodigo.mock.calls).toEqual([
      ["promo_1", false],
      ["promo_2", true],
    ]);
  });

  it("o que não deu diz por quê, na linha", async () => {
    adminMudarCodigo.mockRejectedValue({ response: { data: { error: "NaoReativa" } } });
    renderWithProviders(<CobrancaCodigosPage />);
    await screen.findByText("BLACK50");
    fireEvent.click(within(linha("BLACK50")).getByRole("button", { name: "Reativar" }));
    expect((await within(linha("BLACK50")).findByRole("alert")).textContent).toBe("Este código não volta: está esgotado ou vencido. Crie outro.");
  });
});
