// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AssinaturaDaLista, ContagemDasAssinaturas, FiltroDasAssinaturas, ListaDeAssinaturas, OndeLeva, SincroniaDaConta } from "@jilson/core";

type Consulta = { filtro: FiltroDasAssinaturas; busca?: string; pagina: number };
const adminListarAssinaturas = vi.fn<(consulta: Consulta) => Promise<ListaDeAssinaturas>>();
const adminSincronizarConta = vi.fn<(email: string) => Promise<SincroniaDaConta>>();
const adminAcharCodigo = vi.fn<(codigo: string) => Promise<OndeLeva>>();
vi.mock("@/lib/api", () => ({
  adminListarAssinaturas: (consulta: Consulta) => adminListarAssinaturas(consulta),
  adminSincronizarConta: (email: string) => adminSincronizarConta(email),
  adminAcharCodigo: (codigo: string) => adminAcharCodigo(codigo),
}));

import { CobrancaAssinaturasPage } from "./CobrancaAssinaturasPage";

// ADMIN → COBRANÇA → ASSINATURAS (etapa 4.7b, passo 1b). O que estes testes protegem: os três estados (carregando,
// erro com "tentar de novo", vazio — e o vazio da busca), o que cada linha diz (a situação com a data, o plano, o
// "pago até", o código e a marca de teste; a assinatura sem conta), e que filtro, busca e página vão ao servidor —
// a busca aparada, e a página voltando à primeira quando o filtro ou a busca mudam.

const CONTAGEM: ContagemDasAssinaturas = { todas: 9, ativas: 5, "vao-cancelar": 2, atrasadas: 1, canceladas: 2, aguardando: 1 };
const linha = (extra: Partial<AssinaturaDaLista> = {}): AssinaturaDaLista => ({
  id: 1,
  aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" },
  plano: "mensal",
  prePaga: false,
  situacao: "ativa",
  status: "active",
  pagoAte: "2026-11-20T15:00:00.000Z",
  acabaEm: null,
  daAcesso: true,
  codigo: null,
  deTeste: false,
  criadaEm: "2026-10-20T15:00:00.000Z",
  ...extra,
});
const resposta = (assinaturas: AssinaturaDaLista[], temMais = false): ListaDeAssinaturas => ({ contagem: CONTAGEM, assinaturas, temMais });
const ultimaConsulta = () => adminListarAssinaturas.mock.calls[adminListarAssinaturas.mock.calls.length - 1]?.[0];

beforeEach(() => {
  adminListarAssinaturas.mockReset().mockResolvedValue(resposta([linha()]));
  adminSincronizarConta.mockReset();
  adminAcharCodigo.mockReset();
});

describe("Cobrança → Assinaturas — os estados", () => {
  it("carregando: diz que está carregando", () => {
    adminListarAssinaturas.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect(screen.getByRole("heading", { name: "Assinaturas" })).toBeTruthy();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: diz que não carregou, e 'Tentar de novo' pede de novo", async () => {
    adminListarAssinaturas.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar as assinaturas.");
    adminListarAssinaturas.mockResolvedValue(resposta([linha()]));
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    expect(adminListarAssinaturas).toHaveBeenCalledTimes(2);
  });

  it("erro depois de já ter carregado (trocou o filtro e falhou): avisa, e não deixa a lista do outro filtro na tela", async () => {
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    adminListarAssinaturas.mockRejectedValue(new Error("fora do ar"));
    fireEvent.click(screen.getByRole("button", { name: "Canceladas (2)" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar as assinaturas.");
    expect(screen.queryByText("Ana Souza")).toBeNull();
  });

  it("vazio: sem assinaturas na situação; e, com busca, 'nada encontrado' com o que foi buscado", async () => {
    adminListarAssinaturas.mockResolvedValue(resposta([]));
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect(await screen.findByText("Nenhuma assinatura nesta situação.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Buscar assinaturas"), { target: { value: "zeca" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Nada encontrado para “zeca”.")).toBeTruthy();
  });
});

describe("Cobrança → Assinaturas — as linhas", () => {
  it("cada linha diz quem, a situação com a data, o plano, o 'pago até', o código e a marca de teste", async () => {
    adminListarAssinaturas.mockResolvedValue(
      resposta([
        linha({ id: 1, situacao: "vai-cancelar", plano: "anual", acabaEm: "2026-11-20T15:00:00.000Z", codigo: "TESTE100", deTeste: true }),
        linha({ id: 2, aluno: null, situacao: "pre-paga", prePaga: true, acabaEm: "2026-12-01T15:00:00.000Z", pagoAte: null, daAcesso: false }),
        linha({ id: 4, aluno: { id: "u-4", nome: "Cris Cancelada", email: "cris@exemplo.com" }, situacao: "cancelada", status: "canceled", pagoAte: "2026-12-05T15:00:00.000Z", daAcesso: true }),
        linha({ id: 5, aluno: null, situacao: "cancelada", status: "canceled", pagoAte: "2026-12-05T15:00:00.000Z", daAcesso: false }),
        linha({ id: 3, aluno: { id: "u-3", nome: null, email: "sem-nome@exemplo.com" }, situacao: "outra", status: "novo_status" }),
      ]),
    );
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("ana@exemplo.com")).toBeTruthy();
    expect(screen.getByText("Vai cancelar em 20/11/2026")).toBeTruthy();
    expect(screen.getByText("Anual · pago até 20/11/2026 · código TESTE100 · teste")).toBeTruthy();
    expect(screen.getAllByText("Sem conta na escola")).toHaveLength(2);
    // "Acesso até" só quando o SERVIDOR diz que dá acesso (a regra do gate): a sem conta não dá a ninguém.
    expect(screen.getByText("Pix · pago até 01/12/2026")).toBeTruthy();
    expect(screen.getByText("Cancelada · acesso até 05/12/2026")).toBeTruthy();
    expect(screen.getByText("Cancelada")).toBeTruthy();
    expect(screen.getByText("sem-nome@exemplo.com")).toBeTruthy();
    expect(screen.getByText("Na Stripe: novo_status")).toBeTruthy();
  });
});

describe("Cobrança → Assinaturas — filtro, busca e página vão ao servidor", () => {
  it("de início: Todas, página 1, sem busca; cada filtro mostra quantas há", async () => {
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect(await screen.findByRole("button", { name: "Vão cancelar (2)" })).toBeTruthy();
    expect(ultimaConsulta()).toEqual({ filtro: "todas", pagina: 1 });
    expect(screen.getByRole("button", { name: "Todas (9)" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("escolher um filtro pede aquele filtro, da página 1", async () => {
    adminListarAssinaturas.mockResolvedValue(resposta([linha()], true));
    renderWithProviders(<CobrancaAssinaturasPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(ultimaConsulta()).toEqual({ filtro: "todas", pagina: 2 }));
    fireEvent.click(screen.getByRole("button", { name: "Pagamento atrasado (1)" }));
    await waitFor(() => expect(ultimaConsulta()).toEqual({ filtro: "atrasadas", pagina: 1 }));
    expect(screen.getByRole("button", { name: "Pagamento atrasado (1)" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("a busca vai aparada; 'Limpar' tira a busca", async () => {
    renderWithProviders(<CobrancaAssinaturasPage />);
    await screen.findByText("Ana Souza");
    fireEvent.change(screen.getByLabelText("Buscar assinaturas"), { target: { value: "  ana@exemplo  " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(ultimaConsulta()).toEqual({ filtro: "todas", pagina: 1, busca: "ana@exemplo" }));
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    await waitFor(() => expect(ultimaConsulta()).toEqual({ filtro: "todas", pagina: 1 }));
    expect((screen.getByLabelText("Buscar assinaturas") as HTMLInputElement).value).toBe("");
  });

  it("as páginas: sem mais páginas, não há navegação; com mais, 'Anterior' fica desligado na primeira", async () => {
    renderWithProviders(<CobrancaAssinaturasPage />);
    await screen.findByText("Ana Souza");
    expect(screen.queryByRole("navigation", { name: "Páginas" })).toBeNull();
  });

  it("com mais páginas: 'Anterior' desligado na primeira, 'Próxima' pede a 2", async () => {
    adminListarAssinaturas.mockResolvedValue(resposta([linha()], true));
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect((await screen.findByRole("button", { name: "Anterior" })).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(ultimaConsulta()).toEqual({ filtro: "todas", pagina: 2 }));
  });

  it("o 'Conferir na Stripe' por e-mail saiu da lista: ele mora na ficha (passo 3a)", async () => {
    renderWithProviders(<CobrancaAssinaturasPage />);
    await screen.findByText("Ana Souza");
    expect(screen.queryByLabelText("E-mail do aluno")).toBeNull();
    expect(screen.queryByRole("button", { name: "Conferir na Stripe" })).toBeNull();
  });
});

describe("Cobrança → Assinaturas — da lista para a ficha (passo 1d)", () => {
  it("o nome leva à ficha da conta; a linha sem conta, à ficha da assinatura", async () => {
    adminListarAssinaturas.mockResolvedValue(resposta([linha({ id: 1 }), linha({ id: 2, aluno: null })]));
    renderWithProviders(<CobrancaAssinaturasPage />);
    expect((await screen.findByRole("link", { name: "Ana Souza" })).getAttribute("href")).toBe("/admin/cobranca/assinaturas/ficha?conta=u-1");
    expect(screen.getByRole("link", { name: "Sem conta na escola" }).getAttribute("href")).toBe("/admin/cobranca/assinaturas/ficha?assinatura=2");
  });

  it("o código de uma cobrança (ch_): pergunta de quem é e abre a ficha — sem buscar na lista", async () => {
    adminAcharCodigo.mockResolvedValue({ conta: "u-9", assinatura: null, visitante: null });
    renderWithProviders(<CobrancaAssinaturasPage />, { route: "/admin/cobranca/assinaturas", path: "/admin/cobranca/assinaturas", extraRoutes: [{ path: "/admin/cobranca/assinaturas/ficha", element: <p>A FICHA ABRIU</p> }] });
    await screen.findByText("Ana Souza");
    fireEvent.change(screen.getByLabelText("Buscar assinaturas"), { target: { value: " ch_123 " } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("A FICHA ABRIU")).toBeTruthy();
    expect(adminAcharCodigo.mock.calls).toEqual([["ch_123"]]);
    expect(adminListarAssinaturas.mock.calls.every(([c]) => c.busca === undefined)).toBe(true);
  });

  it("o código que ninguém da escola tem: diz isso, e a lista continua", async () => {
    adminAcharCodigo.mockRejectedValue({ response: { data: { error: "NaoEncontrada" } } });
    renderWithProviders(<CobrancaAssinaturasPage />);
    await screen.findByText("Ana Souza");
    fireEvent.change(screen.getByLabelText("Buscar assinaturas"), { target: { value: "du_999" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Nenhuma pessoa da escola tem esse código.");
    expect(screen.getByText("Ana Souza")).toBeTruthy();
  });
});
