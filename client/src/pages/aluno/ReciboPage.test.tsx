// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import type { ReciboDaEscola } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getRecibo = vi.fn<(chave: string) => Promise<ReciboDaEscola>>();
vi.mock("@/lib/api", () => ({ getMinhaAssinatura: vi.fn(), getMinhasCobrancas: vi.fn(), getRecibo: (chave: string) => getRecibo(chave) }));
const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({ useSession: () => useSession() }));

import { ReciboPage } from "./ReciboPage";

// O RECIBO DA ESCOLA (etapa 4.7b, passo 6a — decisões do operador, 31/10/2026: no lugar do recibo da Stripe, que levava à
// fatura com o CPF de quem pagou; e com os itens que ele escolheu). O que protege: os estados (carregando; erro com "tentar
// de novo"; não encontrado — sem o botão de imprimir); o recibo da chave do endereço, com o número e a data, a escola (nome
// empresarial, CNPJ, site — sem o e-mail, que está nas dúvidas), quem assina (o nome; sem nome, o e-mail), o plano e o
// período, o preço, o desconto com o código, o crédito da troca de plano, o total pago, a forma, a situação e as dúvidas;
// sem o detalhe do servidor, só o total; sem o plano, a assinatura; "Imprimir ou salvar em PDF" imprime.

const recibo = (mudanca: Partial<ReciboDaEscola>): ReciboDaEscola => ({
  em: "2026-10-31T15:00:00.000Z",
  centavos: 4995,
  moeda: "brl",
  forma: "cartao",
  cartao: { bandeira: "visa", final: "4242" },
  situacao: "paga",
  devolvido: 0,
  numero: "81DD-3FD1",
  plano: "mensal",
  periodo: { de: "2026-10-31T15:00:00.000Z", ate: "2026-11-30T15:00:00.000Z" },
  detalhe: { preco: 9990, descontos: [{ codigo: "BLACK50", centavos: 4995 }], credito: 0 },
  ...mudanca,
});
const abrir = (chave = "81dd3fd133e6f9fb") => renderWithProviders(<ReciboPage />, { route: `/aluno/conta/faturamento/recibo/${chave}`, path: "/aluno/conta/faturamento/recibo/:chave" });
/** O texto, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const texto = (el: Element) => (el.textContent ?? "").replace(/ /g, " ");
const linhas = () => {
  const rotulos = screen.getAllByRole("term").map(texto);
  const valores = screen.getAllByRole("definition").map(texto);
  return rotulos.map((rotulo, i) => [rotulo, valores[i]]);
};

beforeEach(() => {
  useSession.mockReturnValue({ data: { user: { name: "Ana Souza", email: "ana@exemplo.com" } }, isPending: false, error: null });
  getRecibo.mockReset().mockResolvedValue(recibo({}));
});

describe("o recibo da escola", () => {
  it("carregando", () => {
    getRecibo.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Imprimir ou salvar em PDF" })).toBeNull();
  });

  it("erro: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    getRecibo.mockRejectedValue(new Error("fora do ar"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar o recibo. Tente de novo.");
    expect(screen.queryByRole("button", { name: "Imprimir ou salvar em PDF" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await vi.waitFor(() => expect(getRecibo).toHaveBeenCalledTimes(2));
  });

  it("a chave que não é da conta (404): não encontrado, sem nada para imprimir nem tentar de novo", async () => {
    getRecibo.mockRejectedValue({ response: { status: 404, data: { error: "NaoEncontrado" } } });
    abrir("1234567890abcdef");
    expect(await screen.findByText("Este recibo não foi encontrado.")).toBeTruthy();
    expect(getRecibo).toHaveBeenCalledWith("1234567890abcdef");
    expect(screen.queryByRole("definition")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("o recibo da chave: o número e a data, a escola, quem assina, o plano e o período, os valores, a forma, a situação e as dúvidas", async () => {
    abrir();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Recibo");
    expect(await screen.findByText("Nº 81DD-3FD1 · 31/10/2026")).toBeTruthy();
    expect(getRecibo).toHaveBeenCalledWith("81dd3fd133e6f9fb");
    expect(screen.getByText("67.633.954 JILSON RODRIGUES DE SANTANA")).toBeTruthy();
    expect(screen.getByText("CNPJ 67.633.954/0001-02")).toBeTruthy();
    expect(screen.getByText("jilsonsantana.com")).toBeTruthy();
    expect(screen.getByText("Assinatura Mensal")).toBeTruthy();
    expect(screen.getByText("31/10/2026 a 30/11/2026")).toBeTruthy();
    expect(linhas()).toEqual([
      ["Assinante", "Ana Souza"],
      ["Preço", "R$ 99,90"],
      ["Desconto (BLACK50)", "−R$ 49,95"],
      ["Total pago", "R$ 49,95"],
      ["Forma de pagamento", "Cartão Visa final 4242"],
      ["Situação", "Paga"],
    ]);
    expect(screen.getByText("Dúvidas sobre este recibo? Escreva para suporte@jilsonsantana.com.")).toBeTruthy();
    // Quem assina aparece pelo nome; o e-mail dela, não (decisão do operador).
    expect(screen.queryByText(/ana@exemplo[.]com/)).toBeNull();
  });

  it("a troca de plano: o crédito do plano anterior; o Anual", async () => {
    getRecibo.mockResolvedValue(recibo({ plano: "anual", centavos: 94900, detalhe: { preco: 99900, descontos: [], credito: 5000 } }));
    abrir();
    expect(await screen.findByText("Assinatura Anual")).toBeTruthy();
    expect(linhas().slice(1, 4)).toEqual([
      ["Preço", "R$ 999,00"],
      ["Crédito do plano anterior", "−R$ 50,00"],
      ["Total pago", "R$ 949,00"],
    ]);
  });

  it("sem o detalhe, só o total; sem o plano nem o período, a assinatura; o Pix devolvido em parte; a conta sem nome, o e-mail", async () => {
    useSession.mockReturnValue({ data: { user: { name: "", email: "ana@exemplo.com" } }, isPending: false, error: null });
    getRecibo.mockResolvedValue(recibo({ plano: null, periodo: null, detalhe: null, centavos: 9990, forma: "pix", cartao: null, situacao: "devolvida-em-parte", devolvido: 2500 }));
    abrir();
    expect(await screen.findByText("Assinatura da escola Jilson Santana")).toBeTruthy();
    expect(screen.queryByText(/[0-9]{2}[/][0-9]{2}[/][0-9]{4} a /)).toBeNull();
    expect(linhas()).toEqual([
      ["Assinante", "ana@exemplo.com"],
      ["Total pago", "R$ 99,90"],
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
