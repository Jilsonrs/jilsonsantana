// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { ListaDeTentativas } from "@jilson/core";

const adminListarTentativas = vi.fn<() => Promise<ListaDeTentativas>>();
vi.mock("@/lib/api", () => ({ adminListarTentativas: () => adminListarTentativas() }));

import { CobrancaTentativasPage } from "./CobrancaTentativasPage";

// ADMIN → COBRANÇA → TENTATIVAS (etapa 4.7b, passo 1e). O que estes testes protegem: os estados (carregando, erro
// com "tentar de novo", vazio); o que cada linha diz — o visitante (a última tentativa, o lembrete, quando some, se
// quer novidades; o pagamento achado que segurou a ficha) e a conta (esperando ou expirou) —; e que cada uma leva à
// ficha certa.

const VISITANTE = { id: "ficha-1", nome: "Vera Visitante", email: "vera@exemplo.com", ultimaTentativaEm: "2026-11-20T15:00:00.000Z", lembreteEm: "2026-11-20T17:00:00.000Z", someEm: "2026-11-27T15:00:00.000Z", novidades: true, naoApagada: false };

beforeEach(() => {
  adminListarTentativas.mockReset().mockResolvedValue({
    tentativas: [
      { tipo: "conta", assinatura: 9, conta: { id: "u-1", nome: null, email: "tiago@exemplo.com" }, situacao: "aguardando", em: "2026-11-21T15:00:00.000Z" },
      { tipo: "visitante", visitante: VISITANTE },
      { tipo: "visitante", visitante: { ...VISITANTE, id: "ficha-2", nome: null, email: "sem@exemplo.com", lembreteEm: null, novidades: false, naoApagada: true } },
      { tipo: "conta", assinatura: 8, conta: { id: "u-2", nome: "Ana", email: "ana@exemplo.com" }, situacao: "expirou", em: "2026-11-10T15:00:00.000Z" },
    ],
    temMais: true,
  });
});

describe("Cobrança → Tentativas", () => {
  it("carregando", () => {
    adminListarTentativas.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CobrancaTentativasPage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    adminListarTentativas.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<CobrancaTentativasPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar as tentativas.");
    adminListarTentativas.mockResolvedValue({ tentativas: [], temMais: false });
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Ninguém deixou uma assinatura pela metade.")).toBeTruthy();
  });

  it("cada linha diz o que aconteceu e leva à ficha certa", async () => {
    renderWithProviders(<CobrancaTentativasPage />);
    expect((await screen.findByRole("link", { name: "tiago@exemplo.com" })).getAttribute("href")).toBe("/admin/cobranca/assinaturas/ficha?conta=u-1");
    expect(screen.getByText("Esperando o primeiro pagamento · 21/11/2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Vera Visitante" }).getAttribute("href")).toBe("/admin/cobranca/assinaturas/ficha?visitante=ficha-1");
    expect(screen.getByText("Visitante sem conta · última tentativa em 20/11/2026 · lembrete saiu em 20/11/2026 · some em 27/11/2026 · quer receber novidades")).toBeTruthy();
    expect(screen.getByText("Visitante sem conta · última tentativa em 20/11/2026 · lembrete ainda não saiu · pagamento achado: a ficha não foi apagada")).toBeTruthy();
    expect(screen.getByText("Expirou sem pagar · 10/11/2026")).toBeTruthy();
    expect(screen.getByText("Há mais tentativas que não aparecem aqui.")).toBeTruthy();
  });
});
