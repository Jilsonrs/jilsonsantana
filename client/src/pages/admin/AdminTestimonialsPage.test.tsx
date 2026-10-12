// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AdminTestimonialsPage } from "./AdminTestimonialsPage";
import * as api from "@/lib/api";

// Esta tela exercita o editor COMUM das listas da home (HomeListEditor). A de
// perguntas frequentes usa o mesmo editor; lá o teste confere só a fiação.
// Mock na NOSSA fronteira (@/lib/api), nunca no axios — CLAUDE.md → Testing.
vi.mock("@/lib/api");

const base = { createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z" };
const lista: api.AdminTestimonial[] = [
  { ...base, id: 1, text: "Curso excelente, muito prático.", name: "Edson Garcia Fernandes", displayOrder: 10, status: "PUBLISHED" },
  { ...base, id: 2, text: "Ainda estou escrevendo este.", name: "Nicole Silveira Manoel", displayOrder: 20, status: "DRAFT" },
];

beforeEach(() => {
  // Sem isto, `mock.calls` de um teste carrega as chamadas do anterior.
  vi.clearAllMocks();
  vi.mocked(api.adminCreateTestimonial).mockResolvedValue(lista[0]);
  vi.mocked(api.adminUpdateTestimonial).mockResolvedValue(lista[0]);
  vi.mocked(api.adminDeleteTestimonial).mockResolvedValue(undefined);
});

const listaPt = () => screen.findByRole("list", { name: "Depoimentos" });

describe("Depoimentos — estados", () => {
  it("mostra carregando enquanto a lista não chega", () => {
    vi.mocked(api.adminGetTestimonials).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AdminTestimonialsPage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("mostra erro quando a lista falha", async () => {
    vi.mocked(api.adminGetTestimonials).mockRejectedValue(new Error("500"));
    renderWithProviders(<AdminTestimonialsPage />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/não foi possível carregar/i);
  });

  it("sem depoimento mostra o vazio — e avisa que a seção some da home", async () => {
    vi.mocked(api.adminGetTestimonials).mockResolvedValue([]);
    renderWithProviders(<AdminTestimonialsPage />);
    expect((await screen.findByText(/nenhum depoimento ainda/i)).textContent).toMatch(/não aparece na home/i);
  });
});

describe("Depoimentos — a lista", () => {
  beforeEach(() => {
    vi.mocked(api.adminGetTestimonials).mockResolvedValue(lista);
  });

  it("mostra os depoimentos, com o status de cada um em palavras", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    const ul = await listaPt();

    expect(within(ul).getByText("Curso excelente, muito prático.")).toBeTruthy();
    expect(within(ul).getByText("Publicado")).toBeTruthy();
    expect(within(ul).getByText("Rascunho")).toBeTruthy();
    // Depoimento não tem ordem: a home sorteia (decisão do operador, 23/09/2026).
    expect(within(ul).queryByText(/^Ordem/)).toBeNull();
  });

  it("não há abas de idioma", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    await listaPt();

    expect(screen.queryByRole("button", { name: "Inglês" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Português" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Idioma" })).toBeNull();
  });
});

describe("Depoimentos — criar", () => {
  beforeEach(() => {
    vi.mocked(api.adminGetTestimonials).mockResolvedValue(lista);
  });

  it("cria e manda os campos certos — sem ordem", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Novo depoimento" }));
    expect(screen.queryByLabelText("Ordem")).toBeNull();

    fireEvent.change(screen.getByLabelText("Depoimento"), { target: { value: "Aprendi muito." } });
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Maria da Silva" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "PUBLISHED" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(api.adminCreateTestimonial).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.adminCreateTestimonial).mock.calls[0][0]).toEqual({
      text: "Aprendi muito.",
      name: "Maria da Silva",
      status: "PUBLISHED",
    });
  });

  it("item novo nasce como Rascunho — nada vai para a home por acidente", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Novo depoimento" }));

    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("DRAFT");
  });

  it("campo vazio (ou só espaço) não é enviado e diz o que falta", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Novo depoimento" }));
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect((await screen.findAllByText("Campo obrigatório.")).length).toBe(2);
    expect(api.adminCreateTestimonial).not.toHaveBeenCalled();
  });

  it("falha ao salvar aparece para o operador", async () => {
    vi.mocked(api.adminCreateTestimonial).mockRejectedValue(new Error("500"));
    renderWithProviders(<AdminTestimonialsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Novo depoimento" }));
    fireEvent.change(screen.getByLabelText("Depoimento"), { target: { value: "Texto." } });
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Maria da Silva" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/não foi possível salvar/i);
  });
});

describe("Depoimentos — editar e excluir", () => {
  beforeEach(() => {
    vi.mocked(api.adminGetTestimonials).mockResolvedValue(lista);
  });

  it("editar abre com o texto atual e salva no item certo", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    const ul = await listaPt();
    fireEvent.click(within(ul).getAllByRole("button", { name: "Editar" })[0]);

    const texto = screen.getByLabelText("Depoimento") as HTMLTextAreaElement;
    expect(texto.value).toBe("Curso excelente, muito prático.");
    fireEvent.change(texto, { target: { value: "Curso excelente." } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(api.adminUpdateTestimonial).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.adminUpdateTestimonial).mock.calls[0]).toEqual([
      1,
      { text: "Curso excelente.", name: "Edson Garcia Fernandes", status: "PUBLISHED" },
    ]);
  });

  it("Excluir pede confirmação — o primeiro clique não apaga nada", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    const ul = await listaPt();
    fireEvent.click(within(ul).getAllByRole("button", { name: "Excluir" })[0]);

    expect(screen.getByText("Apagar de vez? Não dá para desfazer.")).toBeTruthy();
    expect(api.adminDeleteTestimonial).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Excluir de vez" }));
    await waitFor(() => expect(api.adminDeleteTestimonial).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.adminDeleteTestimonial).mock.calls[0][0]).toBe(1);
  });

  it("Cancelar na confirmação não apaga", async () => {
    renderWithProviders(<AdminTestimonialsPage />);
    const ul = await listaPt();
    fireEvent.click(within(ul).getAllByRole("button", { name: "Excluir" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Apagar de vez? Não dá para desfazer.")).toBeNull();
    expect(api.adminDeleteTestimonial).not.toHaveBeenCalled();
  });

  it("falha ao excluir aparece para o operador", async () => {
    vi.mocked(api.adminDeleteTestimonial).mockRejectedValue(new Error("500"));
    renderWithProviders(<AdminTestimonialsPage />);
    const ul = await listaPt();
    fireEvent.click(within(ul).getAllByRole("button", { name: "Excluir" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Excluir de vez" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/não foi possível excluir/i);
  });
});
