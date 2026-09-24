// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { pt, en } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import * as api from "@/lib/api";
import { AppFooter } from "./AppFooter";

vi.mock("@/lib/api");

// O idioma do app vem da CONTA, pela sessão (useAppLanguage).
const useSession = vi.fn();
const refetch = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  useSession: () => useSession(),
}));

function contaEm(preferredLanguage: string) {
  useSession.mockReturnValue({ data: { user: { preferredLanguage } }, refetch });
}

// O texto de "Contato" como o operador o editou em Admin → Textos. É diferente
// do de fábrica de propósito: é o que prova que o rodapé lê o servidor.
function comContatoEditado(texto: string): api.CommonTexts {
  const links = [...pt.common.footer.links];
  links[5] = texto;
  return { ...pt.common, footer: { ...pt.common.footer, links } };
}

function link(nome: string) {
  return screen.getByRole("link", { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
  contaEm("pt");
  refetch.mockResolvedValue(undefined);
  vi.mocked(api.updateMyLanguage).mockResolvedValue(undefined);
});

describe("AppFooter — de onde vem o texto", () => {
  it("mostra o texto EDITADO pelo operador, o mesmo do rodapé da home", async () => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(comContatoEditado("Fale comigo"));
    renderWithProviders(<AppFooter />);

    const editado = await screen.findByRole("link", { name: "Fale comigo" });
    expect(editado.getAttribute("href")).toBe("/contato");
    expect(screen.queryByRole("link", { name: pt.common.footer.links[5] })).toBeNull();
    expect(api.getCommonTexts).toHaveBeenCalledWith("pt");
  });

  it("enquanto a busca não volta, mostra o texto de fábrica — o rodapé não nasce vazio", () => {
    vi.mocked(api.getCommonTexts).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AppFooter />);

    expect(link(pt.common.footer.links[5])).toBeTruthy();
    expect(screen.getByText(pt.common.footer.copyright)).toBeTruthy();
  });

  it("se a busca falhar, continua com o texto de fábrica", async () => {
    vi.mocked(api.getCommonTexts).mockRejectedValue(new Error("rede"));
    renderWithProviders(<AppFooter />);

    await waitFor(() => expect(api.getCommonTexts).toHaveBeenCalled());
    expect(link(pt.common.footer.links[5])).toBeTruthy();
    expect(screen.getByText(pt.common.footer.copyright)).toBeTruthy();
  });
});

describe("AppFooter — para onde cada link leva", () => {
  beforeEach(() => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
  });

  it("cada texto aponta para a página certa", async () => {
    renderWithProviders(<AppFooter />);
    await waitFor(() => expect(api.getCommonTexts).toHaveBeenCalled());

    const [, , , faq, quemSomos, contato, termos, privacidade] = pt.common.footer.links;
    expect(link(faq).getAttribute("href")).toBe("/#faq");
    expect(link(quemSomos).getAttribute("href")).toBe("/quem-somos");
    expect(link(contato).getAttribute("href")).toBe("/contato");
    expect(link(termos).getAttribute("href")).toBe("/termos");
    expect(link(privacidade).getAttribute("href")).toBe("/privacidade");
  });

  it("não repete os links que o menu lateral já tem (Cursos, Trilhas, Assine)", () => {
    renderWithProviders(<AppFooter />);

    const [cursos, trilhas, assine] = pt.common.footer.links;
    for (const nome of [cursos, trilhas, assine]) {
      expect(screen.queryByRole("link", { name: nome })).toBeNull();
    }
  });

  it("o YouTube abre em nova aba, sem entregar a página de origem ao site de fora", () => {
    renderWithProviders(<AppFooter />);

    const youtube = link("YouTube");
    expect(youtube.getAttribute("href")).toBe("https://www.youtube.com/@JilsonSantanaBI/");
    expect(youtube.getAttribute("target")).toBe("_blank");
    expect(youtube.getAttribute("rel")).toContain("noopener");
    expect(youtube.getAttribute("rel")).toContain("noreferrer");
  });
});

// Decisão do operador (24/09/2026): o seletor troca o idioma do PRÓPRIO app,
// sem sair da tela, e a escolha fica na conta.
describe("AppFooter — seletor de idioma", () => {
  it("marca o idioma da conta", () => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
    renderWithProviders(<AppFooter />);

    expect(screen.getByRole("button", { name: "PT" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "EN" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("não é link: trocar o idioma não tira ninguém da tela", () => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
    renderWithProviders(<AppFooter />);

    expect(screen.queryByRole("link", { name: "EN" })).toBeNull();
    expect(screen.queryByRole("link", { name: "PT" })).toBeNull();
  });

  it("conta em inglês: textos, destinos e canal do YouTube em inglês", async () => {
    contaEm("en");
    vi.mocked(api.getCommonTexts).mockResolvedValue(en.common);
    renderWithProviders(<AppFooter />);

    await waitFor(() => expect(api.getCommonTexts).toHaveBeenCalledWith("en"));
    expect(link(en.common.footer.links[5]).getAttribute("href")).toBe("/en/contact");
    expect(link(en.common.footer.links[3]).getAttribute("href")).toBe("/en#faq");
    expect(link("YouTube").getAttribute("href")).toBe("https://www.youtube.com/@jilsonen");
    expect(screen.getByText(en.common.footer.copyright)).toBeTruthy();
    expect(screen.getByRole("button", { name: "EN" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("enquanto a busca em inglês não volta, o texto de fábrica é o INGLÊS", () => {
    contaEm("en");
    vi.mocked(api.getCommonTexts).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AppFooter />);

    expect(link(en.common.footer.links[5])).toBeTruthy();
    expect(screen.queryByRole("link", { name: pt.common.footer.links[5] })).toBeNull();
  });

  it("escolher EN grava na conta e atualiza a sessão", async () => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
    renderWithProviders(<AppFooter />);

    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    await waitFor(() => expect(api.updateMyLanguage).toHaveBeenCalled());
    expect(vi.mocked(api.updateMyLanguage).mock.calls[0][0]).toBe("en");
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it("clicar no idioma que já está escolhido não grava nada", () => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
    renderWithProviders(<AppFooter />);

    fireEvent.click(screen.getByRole("button", { name: "PT" }));
    expect(api.updateMyLanguage).not.toHaveBeenCalled();
  });
});
