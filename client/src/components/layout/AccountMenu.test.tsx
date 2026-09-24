// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { IdiomaProvider } from "@/lib/language";
import { AccountMenu } from "./AccountMenu";

// O menu da conta no canto superior direito (decisão do operador, 24/09/2026):
// foto, nome, e-mail, Minha conta, Faturamento e assinatura e Sair.

const ana = { name: "Ana Souza", email: "ana@exemplo.com", image: null };
const onSignOut = vi.fn();

function abrir(usuario = ana) {
  renderWithProviders(<AccountMenu usuario={usuario} onSignOut={onSignOut} />);
  const botao = screen.getByRole("button", { name: "Abrir o menu da conta" });
  fireEvent.click(botao);
  return botao;
}

beforeEach(() => {
  onSignOut.mockReset();
});

describe("AccountMenu", () => {
  it("fechado, só o botão da foto aparece", () => {
    renderWithProviders(<AccountMenu usuario={ana} onSignOut={onSignOut} />);

    const botao = screen.getByRole("button", { name: "Abrir o menu da conta" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
  });

  it("aberto: nome, e-mail e os itens da conta, cada um no destino certo", () => {
    const botao = abrir();

    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("ana@exemplo.com")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Minha conta" }).getAttribute("href")).toBe("/conta");
    expect(screen.getByRole("link", { name: "Faturamento e Assinatura" }).getAttribute("href")).toBe("/conta/faturamento");
  });

  it("Sair encerra a sessão e fecha o painel", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
  });

  it("Esc fecha e devolve o foco ao botão", () => {
    const botao = abrir();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
    expect(document.activeElement).toBe(botao);
  });

  it("clique fora fecha", () => {
    abrir();
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("link", { name: "Minha conta" })).toBeNull();
  });

  it("escolher um item fecha o painel", () => {
    abrir();
    fireEvent.click(screen.getByRole("link", { name: "Minha conta" }));

    expect(screen.queryByRole("link", { name: "Faturamento e Assinatura" })).toBeNull();
  });

  it("sem foto, mostra as iniciais; com foto, mostra a foto", () => {
    renderWithProviders(<AccountMenu usuario={ana} onSignOut={onSignOut} />);
    expect(screen.getByText("AS")).toBeTruthy();
  });

  it("com foto, mostra a imagem da conta", () => {
    const { container } = renderWithProviders(
      <AccountMenu usuario={{ ...ana, image: "/img/ana.webp" }} onSignOut={onSignOut} />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/img/ana.webp");
  });

  it("em inglês, o menu fala inglês", () => {
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <AccountMenu usuario={ana} onSignOut={onSignOut} />
      </IdiomaProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByRole("link", { name: "My account" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Billing and subscription" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
