// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const listLessonFiles = vi.fn();
const uploadLessonFile = vi.fn();
const deleteLessonFile = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  listLessonFiles: (...args: unknown[]) => listLessonFiles(...args),
  uploadLessonFile: (...args: unknown[]) => uploadLessonFile(...args),
  deleteLessonFile: (...args: unknown[]) => deleteLessonFile(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// OS ARQUIVOS PARA BAIXAR de cada aula (Bloco E, etapa 2, parte 2e — plano
// aprovado pelo operador em 28/09/2026): o admin envia e exclui; a tela confere
// tipo e tamanho antes de enviar.

const CURSO: AdminCourseDetail = {
  ...CURSO_DE_TESTE,
  modules: [
    {
      id: 1,
      courseId: 1,
      title: "Fundamentos",
      layer: null,
      displayOrder: 0,
      status: "DRAFT",
      lessons: [
        {
          id: 11,
          moduleId: 1,
          title: "Abertura",
          kind: "VIDEO",
          content: null,
          bunnyVideoId: null,
          bunnyVideoPendingId: null,
          isFreePreview: false,
          tags: [],
          displayOrder: 0,
          status: "DRAFT",
        },
      ],
    },
  ],
};

beforeEach(() => {
  adminGetCourse.mockReset().mockResolvedValue(CURSO);
  listLessonFiles.mockReset().mockResolvedValue([]);
  uploadLessonFile.mockReset().mockResolvedValue({ id: 1 });
  deleteLessonFile.mockReset().mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

async function abrirArquivos() {
  renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/conteudo", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
  fireEvent.click(await screen.findByRole("button", { name: "Arquivos" }));
}

const escolher = (arquivo: File) => fireEvent.change(screen.getByTestId("lesson-file-11"), { target: { files: [arquivo] } });

describe("arquivos da aula", () => {
  it("aula sem arquivo: diz isso", async () => {
    await abrirArquivos();
    expect(await screen.findByText("Nenhum arquivo nesta aula.")).toBeTruthy();
    expect(listLessonFiles).toHaveBeenCalledWith(11);
  });

  it("lista o nome e o tamanho", async () => {
    listLessonFiles.mockResolvedValue([
      { id: 1, originalName: "Vendas.xlsx", sizeBytes: 1572864, createdAt: "2026-09-28" },
      { id: 2, originalName: "Roteiro.pdf", sizeBytes: 2048, createdAt: "2026-09-28" },
    ]);
    await abrirArquivos();
    expect(await screen.findByText("Vendas.xlsx")).toBeTruthy();
    expect(screen.getByText("· 1,5 MB")).toBeTruthy();
    expect(screen.getByText("· 2 KB")).toBeTruthy();
  });

  it("enviar: manda o arquivo da aula e recarrega a lista", async () => {
    await abrirArquivos();
    await screen.findByText("Nenhum arquivo nesta aula.");
    const arquivo = new File(["x"], "tabela.xlsx", { type: "application/vnd.ms-excel" });
    escolher(arquivo);

    await waitFor(() => expect(uploadLessonFile).toHaveBeenCalledWith(11, arquivo));
    await waitFor(() => expect(listLessonFiles).toHaveBeenCalledTimes(2));
  });

  it("tipo fora da lista ou acima de 50 MB nem sai da tela", async () => {
    await abrirArquivos();
    escolher(new File(["x"], "virus.exe"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Use um dos tipos aceitos/);

    escolher(new File([new Uint8Array(50 * 1024 * 1024 + 1)], "grande.zip"));
    await screen.findByRole("alert");
    expect(uploadLessonFile).not.toHaveBeenCalled();
  });

  it("zona não configurada (o computador do operador): diz isso", async () => {
    uploadLessonFile.mockRejectedValue({ response: { status: 503, data: { error: "StorageNaoConfigurado" } } });
    await abrirArquivos();
    escolher(new File(["x"], "a.pdf"));
    expect((await screen.findByRole("alert")).textContent).toBe("O armazenamento de arquivos não está configurado neste ambiente.");
  });

  it("excluir, depois de confirmar", async () => {
    listLessonFiles.mockResolvedValue([{ id: 7, originalName: "Roteiro.pdf", sizeBytes: 2048, createdAt: "2026-09-28" }]);
    await abrirArquivos();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir o arquivo Roteiro.pdf" }));
    await waitFor(() => expect(deleteLessonFile.mock.calls[0]?.[0]).toBe(7));
  });

  it("um painel por vez: abrir os arquivos fecha o vídeo", async () => {
    await abrirArquivos();
    fireEvent.click(screen.getByRole("button", { name: "Vídeo da aula" }));
    expect(screen.queryByText("Arquivos para baixar")).toBeNull();
  });
});
