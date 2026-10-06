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
import { anotarVersaoDoServidor, esquecerVersaoDoServidor, trocarDeVersaoAgora } from "@/lib/versao";
import { ROTAS_DO_EDITOR } from "./steps";
import { pt } from "@jilson/core";

beforeEach(() => {
  adminGetCourse.mockReset();
  updateCourse.mockReset();
  uploadCourseThumbnail.mockReset();
  startIntroVideoUpload.mockReset();
  completeIntroVideoUpload.mockReset();
  getIntroVideoStatus.mockReset().mockResolvedValue({ pronto: true, falhou: false });
  enviarVideo.mockReset();
  esquecerVersaoDoServidor();
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

  it("uma atualização do site no meio não corta o envio: a versão nova espera ele terminar", async () => {
    let terminar: () => void = () => {};
    startIntroVideoUpload.mockResolvedValue(credenciais);
    enviarVideo.mockImplementation(() => ({ concluido: new Promise<void>((r) => (terminar = r)), cancelar: () => {} }));
    completeIntroVideoUpload.mockResolvedValue({ introVideoId: GUID, introVideoEmbedUrl: EMBED });
    await abrirPagina();
    anotarVersaoDoServidor("outra-versao");

    escolher();
    await waitFor(() => expect(enviarVideo).toHaveBeenCalled());
    expect(trocarDeVersaoAgora()).toBe(false);

    act(() => terminar());
    await screen.findByTitle("Prévia do vídeo de apresentação");
    expect(trocarDeVersaoAgora()).toBe(true);
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
// português, 03/10; busca entre todos os ícones do Lucide, 05/10 — decisões do
// operador): o operador busca e escolhe pelo nome em português, e o curso grava
// o nome técnico, que é o que o site do aluno lê.
describe("Mídia e destaques — o ícone do destaque", () => {
  const seletor = () => screen.getByRole("button", { name: /^Ícone/ });
  const busca = () => screen.getByRole("combobox", { name: "Buscar ícone" });
  const opcoes = () => screen.getAllByRole("option").map((o) => o.textContent);
  const buscar = (texto: string) => fireEvent.change(busca(), { target: { value: texto } });

  /** Abre o editor com um destaque novo e abre o seletor (que chega por lazy). */
  async function abrirSeletor(curso?: AdminCourseDetail) {
    await abrirPagina(curso);
    if (!curso) fireEvent.click(screen.getByRole("button", { name: "Adicionar destaque" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Ícone/ }));
  }

  it("busca em português, escolhe pelo nome e grava o nome técnico", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    await abrirSeletor();
    expect(seletor().getAttribute("aria-expanded")).toBe("true");

    buscar("construção");
    fireEvent.click(screen.getByRole("option", { name: "Construção" }));
    expect(seletor().getAttribute("aria-expanded")).toBe("false");
    expect(seletor().textContent).toBe("Construção");

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Projeto final" } });
    fireEvent.change(screen.getByLabelText("Texto descritivo"), { target: { value: "Um painel do zero." } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({
      highlights: [{ icon: "construction", title: "Projeto final", text: "Um painel do zero." }],
    });
  });

  it("acha sem acento, em inglês e pelo sinônimo", async () => {
    await abrirSeletor();

    buscar("construcao");
    expect(opcoes()).toContain("Construção");
    buscar("package");
    expect(opcoes()[0]).toBe("Pacote");
    // "caixa" é o nome de um e sinônimo de outros: os que COMEÇAM com a busca vêm antes.
    buscar("caixa");
    expect(opcoes()[0]).toBe("Caixa");
    expect(opcoes()).toEqual(expect.arrayContaining(["Pacote", "Arquivo morto", "Caixa de entrada"]));
  });

  it("busca vazia mostra os sugeridos; busca larga mostra só os primeiros", async () => {
    await abrirSeletor();
    expect(opcoes()).toContain("Varinha mágica");
    expect(opcoes()).not.toContain("Construção");
    expect(screen.getByText(/Sugeridos\. Digite para buscar entre os .+ ícones\./)).toBeTruthy();

    buscar("seta");
    expect(opcoes()).toHaveLength(60);
    expect(screen.getByText(/^Mostrando 60 de \d+\. Continue digitando para filtrar\.$/)).toBeTruthy();
  });

  it("nada encontrado: a lista diz o que foi buscado", async () => {
    await abrirSeletor();

    buscar("xyzqw");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe("Nenhum ícone encontrado para “xyzqw”.");
  });

  it("pelo teclado: o cursor já está na busca, as setas andam e o Enter escolhe sem enviar o curso", async () => {
    await abrirSeletor();
    expect(document.activeElement).toBe(busca());

    buscar("foguete");
    // O navegador envia o formulário no Enter de um campo de texto; o jsdom não.
    // O que prova que o curso NÃO é enviado é o seletor consumir o Enter.
    const enterSeguiu = fireEvent.keyDown(busca(), { key: "Enter" });

    expect(enterSeguiu).toBe(false);
    expect(seletor().textContent).toBe("Foguete");
    expect(document.activeElement).toBe(seletor());

    fireEvent.click(seletor());
    buscar("seta para baixo");
    const primeira = screen.getAllByRole("option")[0];
    const segunda = screen.getAllByRole("option")[1];
    expect(primeira.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(busca(), { key: "ArrowDown" });
    expect(segunda.getAttribute("aria-selected")).toBe("true");
    expect(busca().getAttribute("aria-activedescendant")).toBe(segunda.id);
    fireEvent.keyDown(busca(), { key: "Enter" });
    expect(seletor().textContent).toBe(segunda.textContent);
  });

  it("Esc fecha a lista e devolve o foco ao botão", async () => {
    await abrirSeletor();

    fireEvent.keyDown(busca(), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(seletor());
  });

  it("o ícone já salvo aparece pelo nome, marcado na lista", async () => {
    await abrirSeletor({ ...CURSO_DE_TESTE, highlights: [{ icon: "bolt", title: "Rápido", text: "Direto ao ponto." }] });

    expect(seletor().textContent).toBe("Raio");
    expect(screen.getByRole("option", { name: "Raio" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("option", { name: "Varinha mágica" }).getAttribute("aria-selected")).toBe("false");
  });

  it("um ícone novo já salvo aparece pelo nome em português", async () => {
    await abrirPagina({ ...CURSO_DE_TESTE, highlights: [{ icon: "hard-hat", title: "Obra", text: "Na prática." }] });

    expect((await screen.findByRole("button", { name: /^Ícone/ })).textContent).toBe("Capacete de obra");
  });

  it("a lixeira tem nome e remove o destaque", async () => {
    await abrirPagina({ ...CURSO_DE_TESTE, highlights: [{ icon: "bolt", title: "Rápido", text: "Direto ao ponto." }] });

    fireEvent.click(screen.getByRole("button", { name: "Remover destaque" }));

    expect(screen.queryByLabelText("Título")).toBeNull();
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
