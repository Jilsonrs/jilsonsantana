// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CasoDaLista, ListaDeCasos } from "@jilson/core";

type Consulta = { situacao: "abertos" | "fechados"; pagina: number };
const adminListarCasos = vi.fn<(consulta: Consulta) => Promise<ListaDeCasos>>();
const adminFecharCaso = vi.fn<(id: number, nota: string) => Promise<void>>();
const adminReenviarEmail = vi.fn<(id: number) => Promise<{ detalhe: string }>>();
const adminResolverCaso = vi.fn<(id: number, acao: string) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminListarCasos: (consulta: Consulta) => adminListarCasos(consulta),
  adminFecharCaso: (id: number, nota: string) => adminFecharCaso(id, nota),
  adminReenviarEmail: (id: number) => adminReenviarEmail(id),
  adminResolverCaso: (id: number, acao: string) => adminResolverCaso(id, acao),
}));

import { CobrancaPrecisaDeVocePage } from "./CobrancaPrecisaDeVocePage";

// ADMIN → COBRANÇA → PRECISA DE VOCÊ (etapa 4.7b, passo 2c). O que estes testes protegem: os estados (carregando, erro
// com "tentar de novo", nada aberto, nada fechado); o que cada caso diz (o tipo, "Urgente", quando abriu, o valor, o
// resumo, o aluno levando à ficha certa, o que resolve); o "Fechar" mandando o id e a nota aparada, e a lista pedida de
// novo; a falha ao fechar; e a aba dos fechados (quem fechou e a nota).

const caso = (extra: Partial<CasoDaLista> = {}): CasoDaLista => ({
  id: 1,
  tipo: "PIX_EM_CONFERENCIA",
  urgente: true,
  aberto: true,
  abertoEm: "2026-11-20T15:30:00.000Z",
  detalhe: "pagou 9990 centavos e o plano anual custa 99500",
  centavos: 9990,
  aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" },
  ficha: { conta: "u-1", assinatura: null, visitante: null },
  fechadoEm: null,
  fechadoPor: null,
  nota: null,
  conserto: null,
  ...extra,
});
const lista = (casos: CasoDaLista[], abertos = casos.length, urgentes = casos.filter((c) => c.urgente).length): ListaDeCasos => ({ casos, temMais: false, abertos, urgentes });

beforeEach(() => {
  adminListarCasos.mockReset().mockResolvedValue(
    lista([caso(), caso({ id: 2, tipo: "PAGOU_SEM_CONTA", urgente: false, aluno: null, centavos: null, detalhe: null, ficha: { conta: null, assinatura: null, visitante: "ficha-9" } }), caso({ id: 3, tipo: "DIVERGENCIA", urgente: false, aluno: null, ficha: { conta: null, assinatura: 7, visitante: null } })]),
  );
  adminFecharCaso.mockReset().mockResolvedValue(undefined);
});

describe("Precisa de você — os estados", () => {
  it("carregando", () => {
    adminListarCasos.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    adminListarCasos.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar os casos.");
    adminListarCasos.mockResolvedValue(lista([], 0, 0));
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Nada precisa de você agora.")).toBeTruthy();
  });

  it("nada fechado ainda, na aba dos fechados", async () => {
    adminListarCasos.mockResolvedValue(lista([], 0, 0));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Fechados" }));
    expect(await screen.findByText("Nenhum caso fechado ainda.")).toBeTruthy();
    await waitFor(() => expect(adminListarCasos).toHaveBeenLastCalledWith({ situacao: "fechados", pagina: 1 }));
  });
});

describe("Precisa de você — os casos", () => {
  it("quantos abertos e urgentes; e cada caso: o tipo, 'Urgente', quando, o valor, o resumo, a ficha certa e o que resolve", async () => {
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    expect(await screen.findByRole("heading", { name: "3 casos abertos · 1 urgente" })).toBeTruthy();
    expect(screen.getByText("Pix pago que não virou assinatura")).toBeTruthy();
    expect(screen.getAllByText("Urgente")).toHaveLength(1);
    expect(screen.getAllByText("Abriu em 20/11/2026, 12:30 · R$ 99,90")).toHaveLength(2);
    expect(screen.getAllByText("pagou 9990 centavos e o plano anual custa 99500")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Ana Souza" }).getAttribute("href")).toBe("/admin/cobranca/assinaturas/ficha?conta=u-1");
    const fichas = screen.getAllByRole("link", { name: "Abrir a ficha" }).map((l) => l.getAttribute("href"));
    expect(fichas).toEqual(["/admin/cobranca/assinaturas/ficha?visitante=ficha-9", "/admin/cobranca/assinaturas/ficha?assinatura=7"]);
    expect(screen.getByText("O que resolve: Aceitar este Pix · Devolver")).toBeTruthy();
    expect(screen.getByText("O que resolve: Conferir na Stripe")).toBeTruthy();
  });

  it("fechar: manda o id e a nota aparada, e a lista é pedida de novo", async () => {
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    await screen.findByText("Pix pago que não virou assinatura");
    fireEvent.click(screen.getAllByRole("button", { name: "Fechar" })[0] as HTMLElement);
    fireEvent.change(screen.getByLabelText("O que foi feito (opcional)"), { target: { value: "  devolvi pelo painel  " } });
    const pedidosAntes = adminListarCasos.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Fechar o caso" }));
    await waitFor(() => expect(adminFecharCaso).toHaveBeenCalledWith(1, "devolvi pelo painel"));
    await waitFor(() => expect(adminListarCasos.mock.calls.length).toBeGreaterThan(pedidosAntes));
  });

  it("fechar falhou: diz isso, e o caso continua aberto na tela", async () => {
    adminFecharCaso.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    await screen.findByText("Pix pago que não virou assinatura");
    fireEvent.click(screen.getAllByRole("button", { name: "Fechar" })[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Fechar o caso" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível fechar o caso.");
    expect(screen.getByText("Pix pago que não virou assinatura")).toBeTruthy();
  });

  it("os fechados dizem quando, quem fechou e a nota — sem 'Urgente' nem 'Fechar'", async () => {
    adminListarCasos.mockResolvedValue(lista([caso({ aberto: false, fechadoEm: "2026-11-21T15:30:00.000Z", fechadoPor: "OPERADOR", nota: "devolvido" })], 0, 0));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    expect(await screen.findByText("Fechado em 21/11/2026, 12:30 · por Você · devolvido")).toBeTruthy();
    expect(screen.queryByText("Urgente")).toBeNull();
    expect(screen.queryByRole("button", { name: "Fechar" })).toBeNull();
  });
});

describe("Precisa de você — reenviar (passo 3a)", () => {
  it("só o e-mail que não saiu tem 'Reenviar'; ele manda o caso e diz o que aconteceu", async () => {
    adminReenviarEmail.mockReset().mockResolvedValue({ detalhe: "o e-mail saiu" });
    adminListarCasos.mockResolvedValue(lista([caso({ id: 5, tipo: "EMAIL_NAO_SAIU", urgente: false }), caso({ id: 6 })]));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Reenviar" }));
    expect(await screen.findByText("Feito: o e-mail saiu.")).toBeTruthy();
    expect(adminReenviarEmail.mock.calls).toEqual([[5]]);
    expect(screen.getAllByRole("button", { name: "Reenviar" })).toHaveLength(1);
  });
});

describe("Precisa de você — os consertos (passo 3b)", () => {
  it("cada caso com conserto mostra o botão; a confirmação diz o efeito; o conserto vai ao servidor e a lista é relida", async () => {
    adminResolverCaso.mockReset().mockResolvedValue({ detalhe: "a cobrança em aberto foi anulada" });
    adminListarCasos.mockResolvedValue(
      lista([
        caso({ id: 11, tipo: "COBRANCA_EM_ABERTO", urgente: false, conserto: "anular-cobranca" }),
        caso({ id: 12, tipo: "TROCA_DE_PLANO", urgente: false, conserto: "soltar-agendamento" }),
        caso({ id: 13, tipo: "ATIVA_SEM_PERIODO_PAGO", urgente: false, conserto: "encerrar-na-hora" }),
        caso({ id: 14, tipo: "CONTESTACAO" }),
      ]),
    );
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    expect(await screen.findByRole("button", { name: "Soltar o agendamento" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Encerrar agora, sem devolver" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anular a cobrança em aberto" }));
    expect(screen.getByText("A cobrança em aberto é anulada: ela não será mais tentada.")).toBeTruthy();
    expect(adminResolverCaso).not.toHaveBeenCalled();
    const pedidosAntes = adminListarCasos.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Feito: a cobrança em aberto foi anulada.")).toBeTruthy();
    expect(adminResolverCaso.mock.calls).toEqual([[11, "anular-cobranca"]]);
    await waitFor(() => expect(adminListarCasos.mock.calls.length).toBeGreaterThan(pedidosAntes));
  });

  it("a assinatura ainda viva: diz por que não anula", async () => {
    adminResolverCaso.mockReset().mockRejectedValue({ response: { data: { error: "AssinaturaViva" } } });
    adminListarCasos.mockResolvedValue(lista([caso({ id: 11, tipo: "COBRANCA_EM_ABERTO", urgente: false, conserto: "anular-cobranca" })]));
    renderWithProviders(<CobrancaPrecisaDeVocePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Anular a cobrança em aberto" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("anular a cobrança dela a reativaria sem pagamento");
  });
});
