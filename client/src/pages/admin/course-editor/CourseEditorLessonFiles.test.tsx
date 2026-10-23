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
          bunnyVideoPendingId: null, bunnyVideoReady: false, videoDurationSeconds: null,
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
  // A aula sem vídeo já começa aberta (operador, 29/09/2026).
  const seta = await screen.findByRole("button", { name: /^(Abrir|Recolher) a aula Abertura$/ });
  if (seta.getAttribute("aria-expanded") === "false") fireEvent.click(seta);
}

const escolher = (arquivo: File) => fireEvent.change(screen.getByTestId("lesson-file-11"), { target: { files: [arquivo] } });

describe("arquivos da aula", () => {
  it("aula sem arquivo: diz isso", async () => {
    await abrirArquivos();
    expect(await screen.findByText("Nenhum arquivo.")).toBeTruthy();
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
    await screen.findByText("Nenhum arquivo.");
    const arquivo = new File(["x"], "tabela.xlsx", { type: "application/vnd.ms-excel" });
    escolher(arquivo);

    await waitFor(() => expect(uploadLessonFile).toHaveBeenCalledWith(11, arquivo, expect.any(Function)));
    await waitFor(() => expect(listLessonFiles).toHaveBeenCalledTimes(2));
  });

  it("tipo fora da lista nem sai da tela", async () => {
    await abrirArquivos();
    escolher(new File(["x"], "virus.exe"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Use um dos tipos aceitos/);
    expect(uploadLessonFile).not.toHaveBeenCalled();
  });

  // Sem limite de tamanho (operador, 29/09/2026: em geral um .zip por curso).
  it("um .zip acima dos 50 MB de antes é enviado", async () => {
    uploadLessonFile.mockResolvedValue({ id: 8, originalName: "curso.zip", sizeBytes: 1, createdAt: "2026-09-29" });
    await abrirArquivos();
    const grande = new File(["x"], "curso.zip");
    Object.defineProperty(grande, "size", { value: 3 * 1024 * 1024 * 1024 });
    escolher(grande);
    await waitFor(() => expect(uploadLessonFile).toHaveBeenCalledWith(11, grande, expect.any(Function)));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mostra a porcentagem do envio", async () => {
    uploadLessonFile.mockImplementation((_id: number, _arquivo: File, aoProgredir: (p: number) => void) => {
      aoProgredir(37);
      return new Promise(() => {});
    });
    await abrirArquivos();
    escolher(new File(["x"], "curso.zip"));
    expect(await screen.findByRole("button", { name: "Enviando… 37%" })).toBeTruthy();
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

  // Como a Udemy (operador, 28/09/2026): a aula aberta mostra o vídeo e, embaixo,
  // os arquivos; recolher a aula esconde tudo.
  it("a aula aberta mostra os arquivos junto com o vídeo; recolher esconde", async () => {
    await abrirArquivos();
    expect(await screen.findByText("Arquivos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar vídeo" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Recolher a aula Abertura" }));
    expect(screen.queryByText("Arquivos")).toBeNull();
    expect(screen.queryByRole("button", { name: "Enviar vídeo" })).toBeNull();
  });
});

describe("uploadLessonFile em partes de até 30 MB com nova tentativa", () => {
  it("corta arquivo maior que 30 MB em partes sequenciais e tenta de novo a parte que falhar", async () => {
    const apiReal = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const { client, TAMANHO_DA_PARTE_DO_ARQUIVO } = apiReal;

    const postSpy = vi.spyOn(client, "post").mockResolvedValueOnce({
      data: { id: 42, originalName: "grande.zip", sizeBytes: TAMANHO_DA_PARTE_DO_ARQUIVO, createdAt: "2026-10-22" },
    } as never);
    let tentativasDaParte2 = 0;
    const putSpy = vi.spyOn(client, "put").mockImplementation(async (url, corpo) => {
      if (url === "/admin/lesson-files/42/partes/2") {
        tentativasDaParte2 += 1;
        if (tentativasDaParte2 === 1) {
          throw { response: { status: 502 } };
        }
      }
      return {
        data: {
          id: 42,
          originalName: "grande.zip",
          sizeBytes: TAMANHO_DA_PARTE_DO_ARQUIVO + (corpo as Blob).size,
          createdAt: "2026-10-22",
        },
      } as never;
    });

    try {
      const arquivoGrande = new File(["abc"], "grande.zip");
      const tamanhoSimulado = TAMANHO_DA_PARTE_DO_ARQUIVO * 2 + 1234;
      Object.defineProperty(arquivoGrande, "size", { value: tamanhoSimulado });
      const fatias: Array<[number, number]> = [];
      arquivoGrande.slice = ((inicio = 0, fim = tamanhoSimulado) => {
        fatias.push([inicio, fim]);
        const b = new Blob(["x"]);
        Object.defineProperty(b, "size", { value: fim - inicio });
        return b;
      }) as typeof arquivoGrande.slice;

      const resultado = await apiReal.uploadLessonFile(11, arquivoGrande);

      expect(resultado.id).toBe(42);
      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy.mock.calls[0]?.[0]).toBe("/admin/lessons/11/files");
      expect(postSpy.mock.calls[0]?.[2]?.headers).toMatchObject({
        "Content-Type": "application/octet-stream",
        "X-Nome-Do-Arquivo": "grande.zip",
        "X-Total-De-Partes": "3",
      });
      // Parte 2 falhou 1 vez com 502 e passou na 2ª tentativa; parte 3 passou de primeira.
      expect(tentativasDaParte2).toBe(2);
      expect(putSpy).toHaveBeenCalledTimes(3);
      expect(putSpy.mock.calls.map((c) => c[0])).toEqual([
        "/admin/lesson-files/42/partes/2",
        "/admin/lesson-files/42/partes/2",
        "/admin/lesson-files/42/partes/3",
      ]);
      expect(fatias).toEqual([
        [0, TAMANHO_DA_PARTE_DO_ARQUIVO],
        [TAMANHO_DA_PARTE_DO_ARQUIVO, TAMANHO_DA_PARTE_DO_ARQUIVO * 2],
        [TAMANHO_DA_PARTE_DO_ARQUIVO * 2, tamanhoSimulado],
      ]);
    } finally {
      postSpy.mockRestore();
      putSpy.mockRestore();
    }
  });
});
