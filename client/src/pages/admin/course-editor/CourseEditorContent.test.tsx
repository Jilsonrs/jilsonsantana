// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail, AdminModule } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const updateCourseStructure = vi.fn();
const insertLesson = vi.fn();
const insertModule = vi.fn();
const updateLesson = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  updateCourseStructure: (...args: unknown[]) => updateCourseStructure(...args),
  insertLesson: (...args: unknown[]) => insertLesson(...args),
  insertModule: (...args: unknown[]) => insertModule(...args),
  updateLesson: (...args: unknown[]) => updateLesson(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// O PASSO CONTEÚDO (Bloco E, etapa 2 — plano aprovado pelo operador em
// 28/09/2026): a ordem vai INTEIRA numa gravação só.

function modulo(id: number, titulo: string, aulas: [number, string][]): AdminModule {
  return {
    id,
    courseId: 1,
    title: titulo,
    layer: null,
    displayOrder: 0,
    status: "DRAFT",
    lessons: aulas.map(([aulaId, t]) => ({ id: aulaId, moduleId: id, title: t, kind: "VIDEO", content: null, bunnyVideoId: null, bunnyVideoPendingId: null, isFreePreview: false, tags: [], displayOrder: 0, status: "DRAFT" })),
  };
}

const COM_CONTEUDO: AdminCourseDetail = {
  ...CURSO_DE_TESTE,
  modules: [
    modulo(1, "Fundamentos", [[11, "Abertura"], [12, "Fórmulas"]]),
    modulo(2, "Automação", [[21, "Macros"]]),
  ],
};

beforeEach(() => {
  adminGetCourse.mockReset().mockResolvedValue(COM_CONTEUDO);
  updateCourseStructure.mockReset().mockResolvedValue(undefined);
  insertLesson.mockReset().mockResolvedValue({ id: 99 });
  insertModule.mockReset().mockResolvedValue({ id: 98 });
  updateLesson.mockReset().mockResolvedValue({ id: 12 });
});

async function abrir() {
  renderWithProviders(<CourseEditorLayout />, {
    route: "/admin/cursos/1/conteudo",
    path: "/admin/cursos/:id",
    filhas: ROTAS_DO_EDITOR,
  });
  await screen.findByRole("button", { name: "Descer o módulo Fundamentos" });
}

describe("Conteúdo — as setas mandam a ordem inteira", () => {
  it("descer um módulo manda a lista inteira, com as aulas junto", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Descer o módulo Fundamentos" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure).toHaveBeenCalledWith(1, {
      modulos: [
        { id: 2, aulas: [21] },
        { id: 1, aulas: [11, 12] },
      ],
    });
  });

  it("descer uma aula muda só o módulo dela", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Descer a aula Abertura" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure.mock.calls[0][1]).toEqual({
      modulos: [
        { id: 1, aulas: [12, 11] },
        { id: 2, aulas: [21] },
      ],
    });
  });

  it("o primeiro não sobe e o último não desce", async () => {
    await abrir();
    const botao = (nome: string) => screen.getByRole("button", { name: nome }) as HTMLButtonElement;
    expect(botao("Subir o módulo Fundamentos").disabled).toBe(true);
    expect(botao("Descer o módulo Automação").disabled).toBe(true);
    expect(botao("Subir a aula Abertura").disabled).toBe(true);
    expect(botao("Descer a aula Fórmulas").disabled).toBe(true);
  });

  it("falhou ao gravar a ordem: avisa", async () => {
    updateCourseStructure.mockRejectedValue(new Error("500"));
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Descer o módulo Fundamentos" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível mudar a ordem. Tente de novo.");
  });

  // O valor do banco (DRAFT) nunca aparece na tela.
  it("o status do módulo e da aula aparece em português", async () => {
    await abrir();
    const status = screen.getAllByLabelText("Status do módulo")[0] as HTMLSelectElement;
    expect([...status.options].map((o) => o.textContent)).toEqual(["Rascunho", "Publicado", "Arquivado"]);
    expect(screen.queryByText("DRAFT")).toBeNull();
  });
});

// O "+" ENTRE DOIS ITENS (Bloco E, etapa 2 — decisão do operador, 27/09/2026).
describe("Conteúdo — o \"+\" entre dois itens", () => {
  // Escondido por opacidade, nunca por `hidden`: é assim que o teclado o alcança.
  it("o \"+\" existe entre as aulas e é alcançável pelo teclado", async () => {
    await abrir();
    const mais = screen.getByRole("button", { name: "Inserir depois de Abertura" });
    expect(mais.hasAttribute("hidden")).toBe(false);
    expect(mais.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(mais.className).toContain("focus-visible:opacity-100");
  });

  it("aula de texto entre Abertura e Fórmulas nasce na posição 1", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Inserir depois de Abertura" }));
    fireEvent.click(screen.getByRole("button", { name: "Aula de texto" }));
    fireEvent.change(screen.getByLabelText("Título: Aula de texto"), { target: { value: "Leitura" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(insertLesson).toHaveBeenCalledWith(1, { title: "Leitura", kind: "TEXT", posicao: 1 }));
  });

  it("no começo do módulo, a posição é 0", async () => {
    await abrir();
    fireEvent.click(screen.getAllByRole("button", { name: "Inserir no começo do módulo" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Aula de vídeo" }));
    fireEvent.change(screen.getByLabelText("Título: Aula de vídeo"), { target: { value: "Intro" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(insertLesson).toHaveBeenCalledWith(2, { title: "Intro", kind: "VIDEO", posicao: 0 }));
  });

  // O quiz tem etapa própria: aparece, mas não faz nada.
  it("Quiz aparece como EM BREVE, sem botão", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Inserir depois de Abertura" }));
    expect(screen.queryByRole("button", { name: /Quiz/ })).toBeNull();
    expect(screen.getByText("EM BREVE")).toBeTruthy();
  });

  it("entre dois módulos, o \"+\" pede só o título do módulo", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Inserir módulo depois de Fundamentos" }));
    fireEvent.change(screen.getByLabelText("Título: Módulo"), { target: { value: "Revisão" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(insertModule).toHaveBeenCalledWith(1, { title: "Revisão", posicao: 1 }));
  });

  it("falhou ao inserir: avisa, e o que foi digitado fica", async () => {
    insertLesson.mockRejectedValue(new Error("500"));
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Inserir depois de Abertura" }));
    fireEvent.click(screen.getByRole("button", { name: "Aula de vídeo" }));
    fireEvent.change(screen.getByLabelText("Título: Aula de vídeo"), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível inserir. Tente de novo.");
    expect((screen.getByLabelText("Título: Aula de vídeo") as HTMLInputElement).value).toBe("X");
  });
});

// A AULA DE TEXTO tem o seu texto; a de vídeo, não (operador, 28/09/2026).
describe("Conteúdo — o texto da aula", () => {
  const COM_AULA_DE_TEXTO: AdminCourseDetail = {
    ...COM_CONTEUDO,
    modules: [
      {
        ...COM_CONTEUDO.modules[0],
        lessons: [
          { ...COM_CONTEUDO.modules[0].lessons[0] },
          { ...COM_CONTEUDO.modules[0].lessons[1], kind: "TEXT", content: "Texto antigo" },
        ],
      },
      COM_CONTEUDO.modules[1],
    ],
  };

  it("aula de texto: abre o texto, edita e salva só o texto", async () => {
    adminGetCourse.mockResolvedValue(COM_AULA_DE_TEXTO);
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Editar texto" }));
    const campo = screen.getByRole("textbox", { name: "Texto da aula" }) as HTMLTextAreaElement;
    expect(campo.value).toBe("Texto antigo");

    fireEvent.change(campo, { target: { value: "**Texto novo**" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar texto" }));

    await waitFor(() => expect(updateLesson).toHaveBeenCalledWith(12, { content: "**Texto novo**" }));
  });

  it("aula de vídeo não tem texto", async () => {
    await abrir();
    expect(screen.queryByRole("button", { name: "Editar texto" })).toBeNull();
    expect(screen.getAllByText("Vídeo").length).toBe(3);
  });
});

// ARRASTAR (dnd-kit, liberado pelo operador em 28/09/2026). O jsdom não calcula
// posição na tela: cada elemento ganha aqui uma posição falsa, na ordem em que
// aparece na página, para o teclado ter "o de baixo" para onde ir.
describe("Conteúdo — arrastar", () => {
  const original = Element.prototype.getBoundingClientRect;
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const ordem = [...document.querySelectorAll("*")].indexOf(this);
      const top = ordem * 10;
      return { x: 0, y: top, top, left: 0, right: 100, bottom: top + 10, width: 100, height: 10, toJSON: () => ({}) } as DOMRect;
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = original;
  });

  // O dnd-kit mede as posições no quadro seguinte da tela: sem a espera entre as
  // teclas, a seta chega antes da medida e o item "cai" sobre si mesmo.
  const quadro = () => act(() => new Promise((r) => setTimeout(r, 50)));

  async function arrastarPeloTeclado(alca: HTMLElement) {
    alca.focus();
    await act(async () => void fireEvent.keyDown(alca, { key: " ", code: "Space" }));
    await quadro();
    await act(async () => void fireEvent.keyDown(document, { key: "ArrowDown", code: "ArrowDown" }));
    await quadro();
    await act(async () => void fireEvent.keyDown(document, { key: " ", code: "Space" }));
  }

  it("a alça é um botão com nome, e as instruções saem em português", async () => {
    await abrir();
    const alca = screen.getByRole("button", { name: "Arrastar o módulo Fundamentos" });
    expect(screen.getByRole("button", { name: "Arrastar a aula Abertura" })).toBeTruthy();
    const instrucoes = document.getElementById(alca.getAttribute("aria-describedby") ?? "");
    expect(instrucoes?.textContent).toMatch(/^Para arrastar, aperte espaço/);
  });

  it("pelo teclado: o módulo desce, e a ordem inteira vai numa gravação só", async () => {
    await abrir();
    await arrastarPeloTeclado(screen.getByRole("button", { name: "Arrastar o módulo Fundamentos" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure.mock.calls[0][1]).toEqual({
      modulos: [
        { id: 2, aulas: [21] },
        { id: 1, aulas: [11, 12] },
      ],
    });
  });

  it("pelo teclado: a aula desce dentro do módulo", async () => {
    await abrir();
    await arrastarPeloTeclado(screen.getByRole("button", { name: "Arrastar a aula Abertura" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure.mock.calls[0][1].modulos[0]).toEqual({ id: 1, aulas: [12, 11] });
  });

  // A aula pode mudar de módulo DENTRO do curso (a rota confere no servidor).
  it("pelo teclado: a última aula de um módulo desce para o módulo seguinte", async () => {
    await abrir();
    await arrastarPeloTeclado(screen.getByRole("button", { name: "Arrastar a aula Fórmulas" }));

    await waitFor(() => expect(updateCourseStructure).toHaveBeenCalled());
    expect(updateCourseStructure.mock.calls[0][1]).toEqual({
      modulos: [
        { id: 1, aulas: [11] },
        { id: 2, aulas: [12, 21] },
      ],
    });
  });

  it("pegar e soltar no mesmo lugar não grava nada", async () => {
    await abrir();
    const alca = screen.getByRole("button", { name: "Arrastar o módulo Automação" });
    alca.focus();
    await act(async () => void fireEvent.keyDown(alca, { key: " ", code: "Space" }));
    await quadro();
    // A prova de que o arraste aconteceu (e caiu sobre ele mesmo): sem isto, o
    // teste passaria mesmo gravando, porque soltar antes da medida não tem alvo.
    expect(document.body.textContent).toContain("o módulo Automação está sobre o módulo Automação.");
    await act(async () => void fireEvent.keyDown(document, { key: " ", code: "Space" }));
    await quadro();

    expect(updateCourseStructure).not.toHaveBeenCalled();
  });
});
