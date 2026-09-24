// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AdminSiteTextPage } from "./AdminSiteTextPage";
import { AppFooter } from "@/components/layout/AppFooter";
import { pt } from "@jilson/core";
import * as api from "@/lib/api";

// Mock na NOSSA fronteira (@/lib/api), nunca no axios — CLAUDE.md → Testing.
vi.mock("@/lib/api");

const campos: api.SiteTextField[] = [
  // Primeiro, como no dicionário real — é isto que prova que ele vai para o fim.
  {
    key: "home.a11y.hero",
    section: "home.a11y",
    pt: { factory: "Apresentação da escola", override: null },
    en: { factory: "School introduction", override: null },
  },
  {
    key: "home.hero.subtitle",
    section: "home.hero",
    pt: { factory: "Texto de fábrica em português.", override: null },
    en: { factory: "Factory text in English.", override: null },
  },
  {
    key: "home.cta.title",
    section: "home.cta",
    pt: { factory: "Pronto para começar?", override: "Bora começar?" },
    en: { factory: "Ready to start?", override: null },
  },
];

beforeEach(() => {
  // Sem isto, `mock.calls[0]` de um teste é a chamada do teste ANTERIOR — o
  // Vitest não limpa entre testes por padrão, e a asserção passa ou falha por
  // ordem de execução, que é o tipo de teste que não se consegue confiar.
  vi.clearAllMocks();
  vi.mocked(api.adminUpdateSiteText).mockResolvedValue(undefined);
});

describe("AdminSiteTextPage — estados", () => {
  it("mostra o estado de carregando enquanto a lista não chega", () => {
    vi.mocked(api.adminGetSiteText).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminSiteTextPage />);

    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("mostra o estado de erro quando a lista falha", async () => {
    vi.mocked(api.adminGetSiteText).mockRejectedValue(new Error("500"));
    renderWithProviders(<AdminSiteTextPage />);

    expect((await screen.findByRole("alert")).textContent).toMatch(/não foi possível carregar/i);
  });

  it("mostra o estado vazio quando não há campo nenhum", async () => {
    vi.mocked(api.adminGetSiteText).mockResolvedValue([]);
    renderWithProviders(<AdminSiteTextPage />);

    expect(await screen.findByText("Nenhum texto cadastrado.")).toBeTruthy();
  });

  it("a busca que não encontra nada diz o que foi procurado", async () => {
    vi.mocked(api.adminGetSiteText).mockResolvedValue(campos);
    renderWithProviders(<AdminSiteTextPage />);

    fireEvent.change(await screen.findByLabelText("Buscar"), { target: { value: "zzzz" } });

    expect(screen.getByText(/nenhum texto encontrado para “zzzz”/i)).toBeTruthy();
  });
});

describe("AdminSiteTextPage — o que a tela precisa mostrar", () => {
  beforeEach(() => {
    vi.mocked(api.adminGetSiteText).mockResolvedValue(campos);
  });

  it("agrupa por seção, com o nome curto — a página já está na aba", async () => {
    renderWithProviders(<AdminSiteTextPage />);

    expect(await screen.findByText("Topo")).toBeTruthy();
    expect(screen.getByText("Chamada final")).toBeTruthy();
  });

  it("campo NUNCA editado aparece na lista — a tela serve para a primeira edição", async () => {
    renderWithProviders(<AdminSiteTextPage />);

    const campo = await screen.findByDisplayValue("Texto de fábrica em português.");
    expect(campo).toBeTruthy();
  });

  it("campo editado mostra o texto no ar, a marca de editado e o valor de fábrica", async () => {
    renderWithProviders(<AdminSiteTextPage />);

    expect(await screen.findByDisplayValue("Bora começar?")).toBeTruthy();
    expect(screen.getByText("editado por você")).toBeTruthy();
    // O padrão fica visível: é o que o operador precisa saber que volta se limpar.
    expect(screen.getByText("Pronto para começar?")).toBeTruthy();
  });

  it("a busca filtra pelo texto, não só pela chave — e mostra o nome completo", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    await screen.findByText("Topo");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "Bora" } });

    expect(screen.queryByText("Home · Topo")).toBeNull();
    expect(screen.getByText("Home · Chamada final")).toBeTruthy();
  });
});

describe("AdminSiteTextPage — salvar", () => {
  beforeEach(() => {
    vi.mocked(api.adminGetSiteText).mockResolvedValue(campos);
  });

  it("o botão de salvar só aparece depois de mudar o texto", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    const campo = await screen.findByDisplayValue("Texto de fábrica em português.");

    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    fireEvent.change(campo, { target: { value: "Texto novo" } });

    expect(screen.getByRole("button", { name: "Salvar" })).toBeTruthy();
  });

  // O rodapé do app mostra os textos comuns (decisão do operador, 24/09/2026).
  // Ele fica montado enquanto o operador edita: sem o aviso, o rodapé da
  // própria tela continuaria com o texto velho até recarregar a página.
  it("salvar faz o rodapé do app buscar o texto de novo", async () => {
    vi.mocked(api.getCommonTexts).mockResolvedValue(pt.common);
    renderWithProviders(
      <>
        <AdminSiteTextPage />
        <AppFooter />
      </>,
    );
    const campo = await screen.findByDisplayValue("Texto de fábrica em português.");
    await waitFor(() => expect(api.getCommonTexts).toHaveBeenCalledTimes(1));

    fireEvent.change(campo, { target: { value: "Texto novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(api.getCommonTexts).toHaveBeenCalledTimes(2));
  });

  it("salvar manda a chave, o idioma e o valor", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    const campo = await screen.findByDisplayValue("Texto de fábrica em português.");

    fireEvent.change(campo, { target: { value: "Texto novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    // Só o PRIMEIRO argumento: o React Query v5 passa um contexto como segundo,
    // e `toHaveBeenCalledWith` exigiria descrevê-lo — acoplando o teste ao
    // formato interno da biblioteca em vez de ao que a tela manda.
    await waitFor(() => expect(api.adminUpdateSiteText).toHaveBeenCalled());
    expect(vi.mocked(api.adminUpdateSiteText).mock.calls[0][0]).toEqual({
      key: "home.hero.subtitle",
      language: "pt",
      value: "Texto novo",
    });
  });

  it("“Voltar ao padrão” manda valor vazio — é assim que a sobrescrita é apagada", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    await screen.findByDisplayValue("Bora começar?");

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao padrão" }));

    await waitFor(() => expect(api.adminUpdateSiteText).toHaveBeenCalled());
    expect(vi.mocked(api.adminUpdateSiteText).mock.calls[0][0]).toEqual({
      key: "home.cta.title",
      language: "pt",
      value: "",
    });
  });

  it("quando o salvamento falha, a tela avisa em vez de fingir que deu certo", async () => {
    vi.mocked(api.adminUpdateSiteText).mockRejectedValue(new Error("403"));
    renderWithProviders(<AdminSiteTextPage />);
    const campo = await screen.findByDisplayValue("Texto de fábrica em português.");

    fireEvent.change(campo, { target: { value: "Texto novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/não foi possível salvar/i);
  });
});

// Uma aba por página (decisão do operador, 23/09/2026).
describe("AdminSiteTextPage — uma aba por página", () => {
  const menu: api.SiteTextField = {
    key: "common.nav.cursos",
    section: "common.nav",
    pt: { factory: "Cursos", override: null },
    en: { factory: "Courses", override: null },
  };

  beforeEach(() => {
    // "Toda página" vem DEPOIS no array de propósito: a ordem das abas é a das
    // páginas, não a de chegada dos dados.
    vi.mocked(api.adminGetSiteText).mockResolvedValue([...campos, menu]);
  });

  it("abre em Toda página, com a aba marcada, e só as seções dela", async () => {
    renderWithProviders(<AdminSiteTextPage />);

    expect(await screen.findByText("Menu do topo")).toBeTruthy();
    const todaPagina = screen.getByRole("button", { name: "Toda página" });
    expect(todaPagina.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("Topo")).toBeNull();
  });

  it("clicar em Home troca o conteúdo", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    await screen.findByText("Menu do topo");

    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    expect(screen.getByText("Topo")).toBeTruthy();
    expect(screen.queryByText("Menu do topo")).toBeNull();
  });

  it("dentro da aba, Leitor de tela vem por último", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    await screen.findByText("Menu do topo");
    fireEvent.click(screen.getByRole("button", { name: "Home" }));

    // Cada seção é um título de nível 2; o primeiro é o bloco de busca e abas.
    const titulos = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim())
      .filter((t) => t !== "Navegação e Busca");
    expect(titulos).toEqual(["Topo", "Chamada final", "Leitor de tela"]);
  });

  it("a busca atravessa as abas — acha texto da Home estando em Toda página", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    await screen.findByText("Menu do topo");

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "Bora" } });

    expect(screen.getByText("Home · Chamada final")).toBeTruthy();
    // Com busca, as abas saem da frente: o resultado vem de todas as páginas.
    expect(screen.queryByRole("button", { name: "Home" })).toBeNull();
  });
});
