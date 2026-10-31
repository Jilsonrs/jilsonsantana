// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import type { MinhaCobranca, MinhasCobrancas } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getMinhasCobrancas = vi.fn<() => Promise<MinhasCobrancas>>();
vi.mock("@/lib/api", () => ({ getMinhaAssinatura: vi.fn(), getMinhasCobrancas: () => getMinhasCobrancas() }));

import { BlocoDasCobrancas } from "./BlocoDasCobrancas";

// MINHAS COBRANÇAS EM FATURAMENTO (etapa 4.7b, passo 6a — P144). O que protege: os estados (carregando, erro, vazio); cada
// linha diz a data, o valor, como foi paga (a bandeira por nome, ou só o final; o Pix) e em que pé está (paga, devolvida,
// quanto voltou, contestada); cada uma abre o recibo da ESCOLA numa aba nova (decisão do operador, 31/10/2026: no lugar do
// recibo da Stripe, que mostrava o CPF de quem pagou); a ordem é a do servidor.

const cobranca = (mudanca: Partial<MinhaCobranca>): MinhaCobranca => ({ em: "2026-10-10T15:00:00.000Z", centavos: 9990, moeda: "brl", forma: "cartao", cartao: { bandeira: "visa", final: "4242" }, situacao: "paga", devolvido: 0, chave: "a1b2c3d4e5f60718", ...mudanca });
/** O texto, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const texto = (el: Element) => (el.textContent ?? "").replace(/ /g, " ");

beforeEach(() => {
  getMinhasCobrancas.mockReset().mockResolvedValue({
    cobrancas: [
      cobranca({}),
      cobranca({ em: "2026-09-10T15:00:00.000Z", forma: "pix", cartao: null, situacao: "devolvida", devolvido: 9990, chave: "0000000000000002" }),
      cobranca({ em: "2026-08-10T15:00:00.000Z", centavos: 99900, cartao: { bandeira: "bandeira-nova", final: "1111" }, situacao: "devolvida-em-parte", devolvido: 2500, chave: "0000000000000003" }),
      cobranca({ em: "2026-07-10T15:00:00.000Z", situacao: "contestada", chave: "0000000000000004" }),
    ],
  });
});

describe("as cobranças em Faturamento", () => {
  it("carregando", () => {
    getMinhasCobrancas.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<BlocoDasCobrancas />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: diz que não carregou, e nenhuma linha aparece", async () => {
    getMinhasCobrancas.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<BlocoDasCobrancas />);
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as cobranças. Tente de novo.");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("vazio: diz que não há nenhuma", async () => {
    getMinhasCobrancas.mockResolvedValue({ cobrancas: [] });
    renderWithProviders(<BlocoDasCobrancas />);
    expect(await screen.findByText("Nenhuma cobrança ainda.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("cada linha: a data, o valor, como foi paga e em que pé está — na ordem do servidor", async () => {
    renderWithProviders(<BlocoDasCobrancas />);
    const linhas = within(await screen.findByRole("list", { name: "Cobranças" })).getAllByRole("listitem");
    expect(linhas.map(texto)).toEqual([
      "10/10/2026 · R$ 99,90Cartão Visa final 4242 · PagaVer recibo",
      "10/09/2026 · R$ 99,90Pix · DevolvidaVer recibo",
      "10/08/2026 · R$ 999,00Cartão final 1111 · R$ 25,00 devolvidosVer recibo",
      "10/07/2026 · R$ 99,90Cartão Visa final 4242 · Contestada no bancoVer recibo",
    ]);
  });

  it("cada uma abre o recibo DA ESCOLA, pela chave dela, numa aba nova — nenhum link para a Stripe", async () => {
    renderWithProviders(<BlocoDasCobrancas />);
    const linhas = within(await screen.findByRole("list", { name: "Cobranças" })).getAllByRole("listitem");
    const recibo = within(linhas[0] as HTMLElement).getByRole("link", { name: "Ver o recibo de 10/10/2026 (abre em outra aba)" });
    expect(recibo.getAttribute("href")).toBe("/aluno/conta/faturamento/recibo/a1b2c3d4e5f60718");
    expect(recibo.getAttribute("target")).toBe("_blank");
    expect(recibo.getAttribute("rel")).toBe("noopener noreferrer");
    expect(within(linhas[3] as HTMLElement).getByRole("link").getAttribute("href")).toBe("/aluno/conta/faturamento/recibo/0000000000000004");
    expect(screen.getAllByRole("link").every((link) => (link.getAttribute("href") ?? "").startsWith("/aluno/"))).toBe(true);
  });
});
