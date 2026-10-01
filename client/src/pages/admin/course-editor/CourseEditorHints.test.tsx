// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { DICAS_DO_CURSO } from "@/lib/course-hints";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// AS DICAS embaixo dos campos (Bloco E, etapa 1, parte 1e): cada uma LIGADA ao
// campo dela, para o leitor de tela ler a dica junto com o campo. Dica só na
// tela, sem a ligação, ninguém que navega por leitor de tela ouve.

beforeEach(() => {
  adminGetCourse.mockReset().mockResolvedValue(CURSO_DE_TESTE);
});

/** O texto que o leitor de tela lê como descrição do campo (`aria-describedby`). */
function descricao(campo: HTMLElement): string {
  return (campo.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

async function abrir(passo: string) {
  renderWithProviders(<CourseEditorLayout />, {
    route: `/admin/cursos/1/${passo}`,
    path: "/admin/cursos/:id",
    filhas: ROTAS_DO_EDITOR,
  });
  await screen.findByRole("heading", { level: 1, name: CURSO_DE_TESTE.title });
}

describe("dicas embaixo dos campos, ligadas a eles", () => {
  it.each([
    ["basico", "Título", DICAS_DO_CURSO.title],
    ["basico", "Subtítulo", DICAS_DO_CURSO.subtitle],
    ["basico", "Slug", DICAS_DO_CURSO.slug],
    ["basico", "Idioma", DICAS_DO_CURSO.language],
    ["basico", "Nível", DICAS_DO_CURSO.level],
    ["pagina", "Imagem do curso", DICAS_DO_CURSO.thumbnailUrl],
    ["pagina", "Vídeo promocional", DICAS_DO_CURSO.introVideoId],
    ["publicar", "Status", DICAS_DO_CURSO.status],
    ["publicar", "Ordem", DICAS_DO_CURSO.displayOrder],
  ])("%s → %s", async (passo, rotulo, dica) => {
    await abrir(passo);
    expect(descricao(screen.getByLabelText(rotulo))).toContain(dica);
  });

  // A descrição é a área de texto da aba Escrever, dentro do MarkdownField.
  it("basico → Descrição", async () => {
    await abrir("basico");
    expect(descricao(screen.getByRole("textbox", { name: "Descrição" }))).toContain(DICAS_DO_CURSO.description);
  });

  it.each([
    ["Entregáveis e Habilidades", DICAS_DO_CURSO.learnTags],
    ["Requisitos", DICAS_DO_CURSO.requirements],
    ["Perfil do aluno", DICAS_DO_CURSO.personas],
  ])("para-quem-e → %s (cada item da lista)", async (lista, dica) => {
    await abrir("para-quem-e");
    expect(descricao(screen.getByLabelText(`${lista}, item 1`))).toContain(dica);
  });

  // O contador continua na descrição junto com a dica: um não substitui o outro.
  it("o campo com contador anuncia a dica E o contador", async () => {
    await abrir("basico");
    const titulo = descricao(screen.getByLabelText("Título"));
    expect(titulo).toContain(DICAS_DO_CURSO.title);
    expect(titulo).toMatch(/\d+\/60/);
  });
});
