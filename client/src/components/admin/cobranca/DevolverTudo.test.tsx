// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AssinaturaDaLista } from "@jilson/core";

const adminPreviaDeDevolverTudo = vi.fn<(assinatura: number) => Promise<{ centavos: number; moeda: string | null; pagamentos: number }>>();
const adminDevolverTudo = vi.fn<(assinatura: number, centavos: number) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminPreviaDeDevolverTudo: (assinatura: number) => adminPreviaDeDevolverTudo(assinatura),
  adminDevolverTudo: (assinatura: number, centavos: number) => adminDevolverTudo(assinatura, centavos),
}));

import { DevolverTudo } from "./DevolverTudo";

// "CANCELAR E DEVOLVER O DINHEIRO" NA FICHA (etapa 4.7b, passo 4a — P114). O que protege: a prévia vem do servidor antes de
// qualquer coisa; a confirmação diz quanto volta, de quantos pagamentos, e que o acesso acaba; o valor MOSTRADO vai junto;
// nada a devolver não oferece confirmação; o que não deu diz por quê; a assinatura nunca paga não tem a ação.

const assinatura = (extra: Partial<AssinaturaDaLista> = {}): AssinaturaDaLista => ({ id: 7, aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" }, plano: "mensal", prePaga: false, situacao: "ativa", status: "active", pagoAte: "2026-11-20T15:00:00.000Z", acabaEm: null, daAcesso: true, codigo: null, deTeste: false, criadaEm: "2026-10-20T15:00:00.000Z", ...extra });
const abrir = (extra: Partial<AssinaturaDaLista> = {}) => renderWithProviders(<DevolverTudo assinatura={assinatura(extra)} quem="Ana Souza" />);

beforeEach(() => {
  adminPreviaDeDevolverTudo.mockReset().mockResolvedValue({ centavos: 9990, moeda: "brl", pagamentos: 1 });
  adminDevolverTudo.mockReset().mockResolvedValue({ detalhe: "R$ 99,90 devolvidos; a assinatura acabou agora" });
});

describe("cancelar e devolver o dinheiro", () => {
  it("a prévia primeiro; a confirmação diz o valor e o efeito; confirmar manda o valor MOSTRADO e diz o que o servidor fez", async () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar e devolver o dinheiro" }));
    expect(adminDevolverTudo).not.toHaveBeenCalled();
    expect((await screen.findByRole("group", { name: "Confirmar a devolução" })).textContent).toMatch(/^Devolve R\$\s99,90 \(1 pagamento\), a assinatura acaba agora e Ana Souza perde o acesso às aulas\./);
    expect(adminPreviaDeDevolverTudo.mock.calls).toEqual([[7]]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("Feito: R$ 99,90 devolvidos; a assinatura acabou agora.")).toBeTruthy();
    expect(adminDevolverTudo.mock.calls).toEqual([[7, 9990]]);
  });

  it("mais de um pagamento: o plural; 'Voltar' desiste sem devolver", async () => {
    adminPreviaDeDevolverTudo.mockResolvedValue({ centavos: 19980, moeda: "brl", pagamentos: 2 });
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar e devolver o dinheiro" }));
    expect((await screen.findByRole("group", { name: "Confirmar a devolução" })).textContent).toContain("(2 pagamentos)");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByRole("button", { name: "Cancelar e devolver o dinheiro" })).toBeTruthy();
    expect(adminDevolverTudo).not.toHaveBeenCalled();
  });

  it("nada a devolver: diz isso, sem confirmação", async () => {
    adminPreviaDeDevolverTudo.mockResolvedValue({ centavos: 0, moeda: null, pagamentos: 0 });
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar e devolver o dinheiro" }));
    expect(await screen.findByText("Nada a devolver nesta assinatura: o que foi pago já voltou, ou ela não cobrou nada.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });

  it("o valor mudou desde a prévia: diz isso", async () => {
    adminDevolverTudo.mockRejectedValue({ response: { data: { error: "ValorMudou" } } });
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar e devolver o dinheiro" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("O valor mudou desde que você abriu: confira de novo.");
  });

  it("carregando: 'Conferindo…' sem deixar clicar de novo; a assinatura nunca paga não tem a ação", async () => {
    adminPreviaDeDevolverTudo.mockReturnValue(new Promise(() => {}));
    const { unmount } = abrir();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar e devolver o dinheiro" }));
    expect(((await screen.findByRole("button", { name: "Conferindo…" })) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    abrir({ situacao: "aguardando" });
    expect(screen.queryByRole("button", { name: "Cancelar e devolver o dinheiro" })).toBeNull();
  });
});
