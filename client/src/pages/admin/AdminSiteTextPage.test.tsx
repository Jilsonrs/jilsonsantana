// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AdminSiteTextPage } from "./AdminSiteTextPage";
import * as api from "@/lib/api";

// Mock na NOSSA fronteira (@/lib/api), nunca no axios — CLAUDE.md → Testing.
vi.mock("@/lib/api");

const campos: api.SiteTextField[] = [
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

  it("agrupa por seção, com o nome amigável e a contagem", async () => {
    renderWithProviders(<AdminSiteTextPage />);

    expect(await screen.findByText("Home · Topo")).toBeTruthy();
    expect(screen.getByText("Home · Chamada final")).toBeTruthy();
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

  it("a busca filtra pelo texto, não só pela chave", async () => {
    renderWithProviders(<AdminSiteTextPage />);
    await screen.findByText("Home · Topo");

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
