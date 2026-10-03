// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const updateCourse = vi.fn();
const uploadCourseThumbnail = vi.fn();
const startIntroVideoUpload = vi.fn();
const completeIntroVideoUpload = vi.fn();
const getIntroVideoStatus = vi.fn();
const enviarVideo = vi.fn();
const getCommonTexts = vi.fn();
vi.mock("@/lib/video-upload", () => ({
  enviarVideo: (...args: unknown[]) => enviarVideo(...args),
}));
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  updateCourse: (...args: unknown[]) => updateCourse(...args),
  uploadCourseThumbnail: (...args: unknown[]) => uploadCourseThumbnail(...args),
  startIntroVideoUpload: (...args: unknown[]) => startIntroVideoUpload(...args),
  completeIntroVideoUpload: (...args: unknown[]) => completeIntroVideoUpload(...args),
  getIntroVideoStatus: (...args: unknown[]) => getIntroVideoStatus(...args),
  getCommonTexts: (...args: unknown[]) => getCommonTexts(...args),
  COMMON_TEXTS_QUERY: "site-text-common",
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";
import { pt } from "@jilson/core";
import { AVAILABLE_ICONS } from "@/components/content/icon-registry";
import { NOME_DO_ICONE } from "@/components/admin/nomes-dos-icones";

beforeEach(() => {
  adminGetCourse.mockReset();
  updateCourse.mockReset();
  uploadCourseThumbnail.mockReset();
  startIntroVideoUpload.mockReset();
  completeIntroVideoUpload.mockReset();
  getIntroVideoStatus.mockReset().mockResolvedValue({ pronto: true, falhou: false });
  enviarVideo.mockReset();
  // Sem resposta do servidor, valem os textos de fábrica.
  getCommonTexts.mockReset().mockRejectedValue(new Error("sem servidor"));
});

/** Abre o passo Mídia e destaques (imagem, vídeo, destaques, perguntas e camadas). */
async function abrirPagina(curso: AdminCourseDetail = CURSO_DE_TESTE) {
  adminGetCourse.mockResolvedValue(curso);
  renderWithProviders(<CourseEditorLayout />, {
    route: "/admin/cursos/1/pagina",
    path: "/admin/cursos/:id",
    filhas: ROTAS_DO_EDITOR,
  });
  await screen.findByLabelText("Imagem do curso");
}

const salvar = () => fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

// Imagem do curso (C4, etapa 1 — plano aprovado pelo operador em 23/09/2026):
// o formato das imagens da home (`/img/curso.jpg`) tem que salvar, e o que o
// navegador leria como código ou como outro site nem sai da tela.
describe("Mídia e destaques — imagem", () => {
  const AVISO = "Use um caminho do site que comece com / (ex.: /img/curso.jpg) ou um endereço que comece com https://";

  it.each(["/img/curso.jpg", "https://img.jilsonsantana.com/cursos/curso.webp"])(
    "aceita %s e envia só a parte da página",
    async (imagem) => {
      updateCourse.mockResolvedValue(CURSO_DE_TESTE);
      await abrirPagina();
      fireEvent.change(screen.getByLabelText("Imagem do curso"), { target: { value: imagem } });
      salvar();

      await waitFor(() => expect(updateCourse).toHaveBeenCalled());
      expect(updateCourse.mock.calls[0][1]).toMatchObject({ thumbnailUrl: imagem });
      expect(Object.keys(updateCourse.mock.calls[0][1]).sort()).toEqual([
        "camadas",
        "faq",
        "highlights",
        "introVideoId",
        "thumbnailUrl",
      ]);
      expect(screen.queryByText(AVISO)).toBeNull();
    },
  );

  it.each(["javascript:alert(1)", "//outro-site.com/x.jpg", "img/curso.jpg"])(
    "recusa %s: mostra o aviso e não envia",
    async (imagem) => {
      await abrirPagina();
      fireEvent.change(screen.getByLabelText("Imagem do curso"), { target: { value: imagem } });
      salvar();

      expect(await screen.findByText(AVISO)).toBeTruthy();
      expect(updateCourse).not.toHaveBeenCalled();
    },
  );
});

// Capa enviada pelo admin para o Bunny (bloco de envio, etapa 1 — plano aprovado
// pelo operador em 27/09/2026).
describe("Mídia e destaques — enviar a capa", () => {
  const ERRO = "Não foi possível enviar a imagem. Use WebP, JPG ou PNG de até 5 MB.";
  const ENDERECO = "https://img.jilsonsantana.com/cursos/exemplo-fundamentos-excel-ia-3f9a1c2b7d4e.webp";

  const escolher = (arquivo: File) =>
    fireEvent.change(screen.getByTestId("thumbnail-file"), { target: { files: [arquivo] } });

  const webp = () => new File(["RIFF....WEBP"], "capa.webp", { type: "image/webp" });

  it("enviando: o botão avisa e trava; no fim, o endereço vai para o campo e para a prévia, e o curso recarrega", async () => {
    let terminar: (v: { thumbnailUrl: string }) => void = () => {};
    uploadCourseThumbnail.mockReturnValue(new Promise((r) => (terminar = r)));
    await abrirPagina();
    expect(adminGetCourse).toHaveBeenCalledTimes(1);

    const arquivo = webp();
    escolher(arquivo);

    const botao = await screen.findByRole("button", { name: "Enviando…" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    expect(uploadCourseThumbnail).toHaveBeenCalledWith(1, arquivo);

    terminar({ thumbnailUrl: ENDERECO });
    await waitFor(() =>
      expect((screen.getByLabelText("Imagem do curso") as HTMLInputElement).value).toBe(ENDERECO),
    );
    expect(screen.getByAltText("Thumbnail preview").getAttribute("src")).toBe(ENDERECO);
    expect(screen.queryByText(ERRO)).toBeNull();
    // O servidor já gravou a capa: o curso recarrega, para o ✓ do passo ver.
    await waitFor(() => expect(adminGetCourse).toHaveBeenCalledTimes(2));
  });

  it("o servidor recusou: aparece o aviso, e o campo não muda", async () => {
    uploadCourseThumbnail.mockRejectedValue(new Error("400"));
    await abrirPagina();

    escolher(webp());

    expect((await screen.findByRole("alert")).textContent).toBe(ERRO);
    expect((screen.getByLabelText("Imagem do curso") as HTMLInputElement).value).toBe("");
  });

  it("GIF ou arquivo grande demais nem sai da tela", async () => {
    await abrirPagina();

    escolher(new File(["GIF89a"], "capa.gif", { type: "image/gif" }));
    expect((await screen.findByRole("alert")).textContent).toBe(ERRO);

    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "capa.webp", { type: "image/webp" });
    escolher(grande);
    await screen.findByRole("alert");

    expect(uploadCourseThumbnail).not.toHaveBeenCalled();
  });
});

// Vídeo de apresentação enviado pelo admin (Bloco U, etapa 2 — plano aprovado
// pelo operador em 27/09/2026). O envio em si é do Bunny (TUS); aqui se prova o
// que a TELA faz com ele: porcentagem, erro, gravar o id só no fim, e o player.
describe("Mídia e destaques — vídeo de apresentação", () => {
  const GUID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
  const EMBED = `https://iframe.mediadelivery.net/embed/999/${GUID}`;
  const credenciais = { videoId: GUID, titulo: "Curso", libraryId: "999", expirationTime: 1, signature: "s", embedUrl: EMBED };

  const escolher = () =>
    fireEvent.change(screen.getByTestId("intro-video-file"), {
      target: { files: [new File(["mp4"], "apresentacao.mp4", { type: "video/mp4" })] },
    });

  it("mostra a porcentagem; no fim grava o id no curso e o vídeo toca na prévia", async () => {
    let progredir: (p: number) => void = () => {};
    let terminar: () => void = () => {};
    startIntroVideoUpload.mockResolvedValue(credenciais);
    enviarVideo.mockImplementation((_f: File, _c: unknown, aoProgredir: (p: number) => void) => {
      progredir = aoProgredir;
      return { concluido: new Promise<void>((r) => (terminar = r)), cancelar: () => {} };
    });
    completeIntroVideoUpload.mockResolvedValue({ introVideoId: GUID, introVideoEmbedUrl: EMBED });
    await abrirPagina();

    escolher();
    await waitFor(() => expect(enviarVideo).toHaveBeenCalled());
    // O nome do arquivo escolhido vira o nome do vídeo no Bunny.
    expect(startIntroVideoUpload).toHaveBeenCalledWith(1, "apresentacao.mp4");
    expect(enviarVideo.mock.calls[0][1]).toBe(credenciais);

    act(() => progredir(42));
    expect(await screen.findByRole("button", { name: "Enviando… 42%" })).toBeTruthy();
    // Antes de terminar, o curso ainda não aponta para o vídeo novo.
    expect(completeIntroVideoUpload).not.toHaveBeenCalled();

    act(() => terminar());
    await waitFor(() => expect(completeIntroVideoUpload).toHaveBeenCalledWith(1, GUID));
    const player = await screen.findByTitle("Prévia do vídeo de apresentação");
    expect(player.getAttribute("src")).toBe(EMBED);
    expect((screen.getByLabelText("Vídeo promocional") as HTMLInputElement).value).toBe(GUID);
  });

  it("o envio caiu de vez: aparece o aviso, e o curso NÃO grava o vídeo", async () => {
    startIntroVideoUpload.mockResolvedValue(credenciais);
    enviarVideo.mockImplementation(() => ({ concluido: Promise.reject(new Error("rede")), cancelar: () => {} }));
    await abrirPagina();

    escolher();

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível enviar o vídeo. Tente de novo.");
    expect(completeIntroVideoUpload).not.toHaveBeenCalled();
    expect(screen.queryByTitle("Prévia do vídeo de apresentação")).toBeNull();
  });

  it("curso que já tem vídeo: o player aparece ao abrir", async () => {
    await abrirPagina({ ...CURSO_DE_TESTE, introVideoId: GUID, introVideoEmbedUrl: EMBED });

    const player = await screen.findByTitle("Prévia do vídeo de apresentação");
    expect(player.getAttribute("src")).toBe(EMBED);
  });

  it("id colado fora do formato do Bunny: aviso no campo, e nada é salvo", async () => {
    await abrirPagina();

    fireEvent.change(screen.getByLabelText("Vídeo promocional"), { target: { value: "meu-video" } });
    salvar();

    expect(await screen.findByText(/Cole o ID do vídeo como aparece no Bunny/)).toBeTruthy();
    expect(updateCourse).not.toHaveBeenCalled();
  });
});

// O SELETOR DE ÍCONE dos Destaques (desenho do Antigravity, 30/09/2026; nomes em
// português por decisão do operador, 03/10/2026): o operador escolhe pelo nome em
// português, e o curso grava o nome técnico, que é o que o site do aluno lê.
describe("Mídia e destaques — o ícone do destaque", () => {
  const seletor = () => screen.getByRole("button", { name: /^Ícone/ });

  it("escolhe pelo nome em português e grava o nome técnico", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    await abrirPagina();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar destaque" }));

    fireEvent.click(seletor());
    expect(seletor().getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Varinha mágica" }));
    expect(seletor().getAttribute("aria-expanded")).toBe("false");
    expect(seletor().textContent).toBe("Varinha mágica");

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Projeto final" } });
    fireEvent.change(screen.getByLabelText("Texto descritivo"), { target: { value: "Um painel do zero." } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({
      highlights: [{ icon: "wand", title: "Projeto final", text: "Um painel do zero." }],
    });
  });

  it("Esc fecha a grade e devolve o foco ao botão", async () => {
    await abrirPagina();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar destaque" }));
    fireEvent.click(seletor());
    const escolhido = document.activeElement;
    expect(escolhido?.getAttribute("aria-pressed")).not.toBeNull();

    fireEvent.keyDown(escolhido as Element, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "Varinha mágica" })).toBeNull();
    expect(document.activeElement).toBe(seletor());
  });

  it("o ícone já salvo aparece pelo nome, marcado na grade", async () => {
    await abrirPagina({ ...CURSO_DE_TESTE, highlights: [{ icon: "bolt", title: "Rápido", text: "Direto ao ponto." }] });

    expect(seletor().textContent).toBe("Raio");
    fireEvent.click(seletor());
    expect(screen.getByRole("button", { name: "Raio" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Varinha mágica" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("a lixeira tem nome e remove o destaque", async () => {
    await abrirPagina({ ...CURSO_DE_TESTE, highlights: [{ icon: "bolt", title: "Rápido", text: "Direto ao ponto." }] });

    fireEvent.click(screen.getByRole("button", { name: "Remover destaque" }));

    expect(screen.queryByLabelText("Título")).toBeNull();
  });

  it("todo ícone da lista tem nome em português", () => {
    const semNome = AVAILABLE_ICONS.filter((icone) => !NOME_DO_ICONE[icone]);
    expect(semNome).toEqual([]);
  });
});

// As caixas das CAMADAS mostram o nome que o aluno vê (pendência de 01/10/2026),
// sempre em português e com as edições de Admin → Textos; o curso continua
// gravando o valor do sistema.
describe("Mídia e destaques — as camadas", () => {
  it("cada caixa pelo nome do aluno; marcar grava o valor do sistema", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    await abrirPagina();

    expect(screen.queryByLabelText("UNIVERSAL")).toBeNull();
    fireEvent.click(screen.getByLabelText("Fundamentos sólidos"));
    fireEvent.click(screen.getByLabelText("Com IA do seu lado"));
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1].camadas).toEqual(["UNIVERSAL", "IA"]);
  });

  it("o nome editado em Admin → Textos aparece editado", async () => {
    getCommonTexts.mockResolvedValue({
      ...pt.common,
      camadas: { ...pt.common.camadas, MODERNO: { ...pt.common.camadas.MODERNO, nome: "Recursos novos" } },
    });
    await abrirPagina();

    expect(await screen.findByLabelText("Recursos novos")).toBeTruthy();
    expect(getCommonTexts).toHaveBeenCalledWith("pt");
  });
});
