// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { pt } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import * as api from "@/lib/api";
import { AppFooter } from "./AppFooter";

vi.mock("@/lib/api");

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

// PROVISÓRIO até o bloco "app do aluno em inglês": o seletor leva à home
// pública em cada idioma, e o app só existe em português.
describe("AppFooter — seletor de idioma", () => {
  beforeEach(() => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
  });

  it("marca o português como idioma atual e oferece o inglês", () => {
    renderWithProviders(<AppFooter />);

    expect(link("PT").getAttribute("aria-current")).toBe("true");
    expect(link("EN").getAttribute("aria-current")).toBeNull();
    expect(link("EN").getAttribute("href")).toBe("/en");
  });
});
