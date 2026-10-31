// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { MinhaCobranca, MinhasCobrancas } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getMinhasCobrancas = vi.fn<() => Promise<MinhasCobrancas>>();
vi.mock("@/lib/api", () => ({ getMinhaAssinatura: vi.fn(), getMinhasCobrancas: () => getMinhasCobrancas() }));
const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSession() }));

import { ReciboPage } from "./ReciboPage";

// O RECIBO DA ESCOLA (etapa 4.7b, passo 6a — decisão do operador, 31/10/2026: no lugar do recibo da Stripe, que levava à
// fatura com o CPF de quem pagou). O que protege: os estados (carregando, erro com "tentar de novo", não encontrado — sem o
// botão de imprimir); o recibo achado pela chave, com os dados da escola (nome empresarial, CNPJ, site e e-mail) e cada
// linha (quem assina, o que foi pago, a data, o valor, como foi paga, a situação); "Imprimir ou salvar em PDF" imprime.

const cobranca = (mudanca: Partial<MinhaCobranca>): MinhaCobranca => ({ em: "2026-10-10T15:00:00.000Z", centavos: 9990, moeda: "brl", forma: "cartao", cartao: { bandeira: "visa", final: "4242" }, situacao: "paga", devolvido: 0, chave: "a1b2c3d4e5f60718", ...mudanca });
const abrir = (chave = "a1b2c3d4e5f60718") => renderWithProviders(<ReciboPage />, { route: `/aluno/conta/faturamento/recibo/${chave}`, path: "/aluno/conta/faturamento/recibo/:chave" });
/** O texto, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const texto = (el: Element) => (el.textContent ?? "").replace(/ /g, " ");
const linhas = () => {
  const rotulos = screen.getAllByRole("term").map(texto);
  const valores = screen.getAllByRole("definition").map(texto);
  return rotulos.map((rotulo, i) => [rotulo, valores[i]]);
};

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { name: "Ana Souza", email: "ana@exemplo.com" } }, isPending: false, error: null });
  getMinhasCobrancas.mockReset().mockResolvedValue({
    cobrancas: [cobranca({ em: "2026-11-10T15:00:00.000Z", chave: "ffffffffffffffff", centavos: 1 }), cobranca({}), cobranca({ forma: "pix", cartao: null, situacao: "devolvida-em-parte", devolvido: 2500, chave: "0000000000000003" })],
  });
});

describe("o recibo da escola", () => {
  it("carregando", () => {
    getMinhasCobrancas.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Imprimir ou salvar em PDF" })).toBeNull();
  });

  it("erro: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    getMinhasCobrancas.mockRejectedValue(new Error("fora do ar"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar o recibo. Tente de novo.");
    expect(screen.queryByRole("button", { name: "Imprimir ou salvar em PDF" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await vi.waitFor(() => expect(getMinhasCobrancas).toHaveBeenCalledTimes(2));
  });

  it("a chave que não está nas cobranças da conta: não encontrado, sem nada para imprimir", async () => {
    abrir("1234567890abcdef");
    expect(await screen.findByText("Este recibo não foi encontrado.")).toBeTruthy();
    expect(screen.queryByRole("definition")).toBeNull();
    expect(screen.queryByRole("button", { name: "Imprimir ou salvar em PDF" })).toBeNull();
  });

  it("o recibo da cobrança da chave: os dados da escola e cada linha", async () => {
    abrir();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Recibo");
    expect(await screen.findByText("67.633.954 JILSON RODRIGUES DE SANTANA")).toBeTruthy();
    expect(screen.getByText("CNPJ 67.633.954/0001-02")).toBeTruthy();
    expect(screen.getByText("jilsonsantana.com · suporte@jilsonsantana.com")).toBeTruthy();
    expect(linhas()).toEqual([
      ["Assinante", "Ana Souza · ana@exemplo.com"],
      ["Referente a", "Assinatura da escola Jilson Santana"],
      ["Data", "10/10/2026"],
      ["Valor", "R$ 99,90"],
      ["Forma de pagamento", "Cartão Visa final 4242"],
      ["Situação", "Paga"],
    ]);
  });

  it("outra cobrança, pela chave dela: o Pix devolvido em parte; e a conta sem nome mostra só o e-mail", async () => {
    useSession.mockReturnValue({ data: { user: { name: "", email: "ana@exemplo.com" } }, isPending: false, error: null });
    abrir("0000000000000003");
    await screen.findByText("67.633.954 JILSON RODRIGUES DE SANTANA");
    expect(linhas()).toEqual([
      ["Assinante", "ana@exemplo.com"],
      ["Referente a", "Assinatura da escola Jilson Santana"],
      ["Data", "10/10/2026"],
      ["Valor", "R$ 99,90"],
      ["Forma de pagamento", "Pix"],
      ["Situação", "R$ 25,00 devolvidos"],
    ]);
  });

  it("'Imprimir ou salvar em PDF' abre a impressão do navegador", async () => {
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Imprimir ou salvar em PDF" }));
    expect(imprimir).toHaveBeenCalledTimes(1);
    imprimir.mockRestore();
  });
});
