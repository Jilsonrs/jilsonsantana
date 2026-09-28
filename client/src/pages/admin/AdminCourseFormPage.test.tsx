// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail } from "@/lib/api";

const adminGetCourse = vi.fn();
const createCourse = vi.fn();
const updateCourse = vi.fn();
const createModule = vi.fn();
const uploadCourseThumbnail = vi.fn();
const startIntroVideoUpload = vi.fn();
const completeIntroVideoUpload = vi.fn();
const getIntroVideoStatus = vi.fn();
const enviarVideo = vi.fn();
vi.mock("@/lib/video-upload", () => ({
  enviarVideo: (...args: unknown[]) => enviarVideo(...args),
}));
vi.mock("@/lib/api", () => ({
  startIntroVideoUpload: (...args: unknown[]) => startIntroVideoUpload(...args),
  completeIntroVideoUpload: (...args: unknown[]) => completeIntroVideoUpload(...args),
  getIntroVideoStatus: (...args: unknown[]) => getIntroVideoStatus(...args),
  uploadCourseThumbnail: (...args: unknown[]) => uploadCourseThumbnail(...args),
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  createCourse: (...args: unknown[]) => createCourse(...args),
  updateCourse: (...args: unknown[]) => updateCourse(...args),
  createModule: (...args: unknown[]) => createModule(...args),
}));

import { AdminCourseFormPage } from "./AdminCourseFormPage";

const existingCourse: AdminCourseDetail = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  subtitle: null,
  description: null,
  level: null,
  learnTags: ["PROCX"],
  requirements: [],
  personas: [],
  highlights: null,
  faq: null,
  camadas: [],
  thumbnailUrl: null,
  introVideoId: null,
  introVideoEmbedUrl: null,
  displayOrder: 0,
  status: "DRAFT",
  language: "pt",
  modules: [],
};

beforeEach(() => {
  adminGetCourse.mockReset();
  createCourse.mockReset();
  updateCourse.mockReset();
  createModule.mockReset();
  uploadCourseThumbnail.mockReset();
  startIntroVideoUpload.mockReset();
  completeIntroVideoUpload.mockReset();
  getIntroVideoStatus.mockReset().mockResolvedValue({ pronto: true, falhou: false });
  enviarVideo.mockReset();
});

describe("AdminCourseFormPage", () => {
  it("create mode: submits a new course with learnTags parsed from lines", async () => {
    createCourse.mockResolvedValue({ ...existingCourse, id: 2 });
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "curso-teste" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Curso Teste" } });
    fireEvent.change(screen.getByLabelText(/learnTags/), {
      target: { value: "Fórmulas\nPROCX" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() =>
      expect(createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "curso-teste",
          title: "Curso Teste",
          learnTags: ["Fórmulas", "PROCX"],
        }),
      ),
    );
  });

  it("edit mode: prefills from the fetched course and submits an update", async () => {
    adminGetCourse.mockResolvedValue(existingCourse);
    updateCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, {
      route: "/admin/cursos/1",
      path: "/admin/cursos/:id",
    });

    const titleInput = (await screen.findByLabelText("Título")) as HTMLInputElement;
    await waitFor(() =>
      expect(titleInput.value).toBe("Exemplo — Fundamentos de Excel + IA"),
    );

    fireEvent.change(titleInput, { target: { value: "Título Editado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() =>
      expect(updateCourse).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Título Editado", learnTags: ["PROCX"] }),
      ),
    );
  });

  it("edit mode: adding a module calls createModule with the courseId", async () => {
    adminGetCourse.mockResolvedValue(existingCourse);
    createModule.mockResolvedValue({ id: 10 });
    renderWithProviders(<AdminCourseFormPage />, {
      route: "/admin/cursos/1",
      path: "/admin/cursos/:id",
    });

    const input = await screen.findByPlaceholderText("Título do novo módulo");
    fireEvent.change(input, { target: { value: "Módulo Novo" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar módulo/ }));

    await waitFor(() =>
      expect(createModule).toHaveBeenCalledWith({
        courseId: 1,
        title: "Módulo Novo",
        displayOrder: 0,
      }),
    );
  });
});

// Idioma do curso (decisões do operador: campo na criação, 14/09; troca só
// enquanto rascunho, 24/09/2026).
describe("AdminCourseFormPage — idioma", () => {
  it("criar: nasce em Português e pode virar English", async () => {
    createCourse.mockResolvedValue({ ...existingCourse, id: 2 });
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });

    const idioma = screen.getByLabelText("Idioma") as HTMLSelectElement;
    expect(idioma.value).toBe("pt");

    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "curso-en" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "English course" } });
    fireEvent.change(idioma, { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() => expect(createCourse).toHaveBeenCalled());
    expect(createCourse.mock.calls[0][0]).toMatchObject({ slug: "curso-en", language: "en" });
  });

  it("rascunho: o idioma troca", async () => {
    adminGetCourse.mockResolvedValue(existingCourse);
    updateCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });

    const idioma = (await screen.findByLabelText("Idioma")) as HTMLSelectElement;
    await waitFor(() => expect(idioma.value).toBe("pt"));
    fireEvent.change(idioma, { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ language: "en" });
  });

  it("publicado: o idioma aparece travado, com o motivo, e vai o mesmo no envio", async () => {
    const publicado = { ...existingCourse, status: "PUBLISHED" as const, language: "en" as const };
    adminGetCourse.mockResolvedValue(publicado);
    updateCourse.mockResolvedValue(publicado);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });

    expect(await screen.findByText("O idioma trava depois que o curso é publicado.")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.queryByLabelText("Idioma")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ language: "en" });
  });
});

// Antes a tela não dizia nada quando o salvamento falhava (achado da etapa 3c,
// consertado a pedido do operador em 24/09/2026).
describe("AdminCourseFormPage — quando salvar falha", () => {
  function recusa(codigo?: string) {
    return { response: { status: 409, data: codigo ? { error: codigo } : {} } };
  }

  async function salvarEdicao() {
    adminGetCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });
    const titulo = (await screen.findByLabelText("Título")) as HTMLInputElement;
    await waitFor(() => expect(titulo.value).toBe(existingCourse.title));
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
  }

  it.each([
    ["SlugTaken", "Este slug já está em uso por outro curso."],
    ["LanguageLocked", "O idioma trava depois que o curso é publicado."],
    ["LanguageInUse", "Este curso está numa trilha de outro idioma. Tire-o da trilha antes de trocar o idioma."],
    [undefined, "Não foi possível salvar o curso. Tente de novo."],
  ])("recusa %s mostra a frase certa", async (codigo, frase) => {
    updateCourse.mockRejectedValue(recusa(codigo));
    await salvarEdicao();

    expect((await screen.findByRole("alert")).textContent).toBe(frase);
  });

  it("queda de rede (sem resposta do servidor) também avisa", async () => {
    updateCourse.mockRejectedValue(new Error("Network Error"));
    await salvarEdicao();

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível salvar o curso. Tente de novo.");
  });

  it("o aviso some quando o salvamento seguinte dá certo", async () => {
    updateCourse.mockRejectedValueOnce(recusa("SlugTaken")).mockResolvedValue(existingCourse);
    await salvarEdicao();
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

// Imagem do curso (C4, etapa 1 — plano aprovado pelo operador em 23/09/2026):
// o formato das imagens da home (`/img/curso.jpg`) tem que salvar, e o que o
// navegador leria como código ou como outro site nem sai da tela.
describe("AdminCourseFormPage — imagem do curso", () => {
  const AVISO = "Use um caminho do site que comece com / (ex.: /img/curso.jpg) ou um endereço que comece com https://";

  function preencher(imagem: string) {
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "curso-imagem" } });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Curso com imagem" } });
    fireEvent.change(screen.getByLabelText("Imagem do curso"), { target: { value: imagem } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));
  }

  it.each(["/img/curso.jpg", "https://img.jilsonsantana.com/cursos/curso.webp"])(
    "aceita %s e envia",
    async (imagem) => {
      createCourse.mockResolvedValue({ ...existingCourse, id: 2 });
      preencher(imagem);

      await waitFor(() => expect(createCourse).toHaveBeenCalled());
      expect(createCourse.mock.calls[0][0]).toMatchObject({ thumbnailUrl: imagem });
      expect(screen.queryByText(AVISO)).toBeNull();
    },
  );

  it.each(["javascript:alert(1)", "//outro-site.com/x.jpg", "img/curso.jpg"])(
    "recusa %s: mostra o aviso e não envia",
    async (imagem) => {
      preencher(imagem);

      expect(await screen.findByText(AVISO)).toBeTruthy();
      expect(createCourse).not.toHaveBeenCalled();
    },
  );
});

// Capa enviada pelo admin para o Bunny (bloco de envio, etapa 1 — plano aprovado
// pelo operador em 27/09/2026).
describe("AdminCourseFormPage — enviar a capa", () => {
  const ERRO = "Não foi possível enviar a imagem. Use WebP, JPG ou PNG de até 5 MB.";
  const ENDERECO = "https://img.jilsonsantana.com/cursos/exemplo-fundamentos-excel-ia-3f9a1c2b7d4e.webp";

  async function abrirEdicao() {
    adminGetCourse.mockResolvedValue(existingCourse);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });
    await screen.findByRole("button", { name: "Enviar imagem" });
  }

  const escolher = (arquivo: File) =>
    fireEvent.change(screen.getByTestId("thumbnail-file"), { target: { files: [arquivo] } });

  const webp = () => new File(["RIFF....WEBP"], "capa.webp", { type: "image/webp" });

  it("curso novo, ainda sem salvar: não há botão de enviar", () => {
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });
    expect(screen.queryByRole("button", { name: "Enviar imagem" })).toBeNull();
  });

  it("enviando: o botão avisa e trava; no fim, o endereço vai para o campo e para a prévia", async () => {
    let terminar: (v: { thumbnailUrl: string }) => void = () => {};
    uploadCourseThumbnail.mockReturnValue(new Promise((r) => (terminar = r)));
    await abrirEdicao();

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
  });

  it("o servidor recusou: aparece o aviso, e o campo não muda", async () => {
    uploadCourseThumbnail.mockRejectedValue(new Error("400"));
    await abrirEdicao();

    escolher(webp());

    expect((await screen.findByRole("alert")).textContent).toBe(ERRO);
    expect((screen.getByLabelText("Imagem do curso") as HTMLInputElement).value).toBe("");
  });

  it("GIF ou arquivo grande demais nem sai da tela", async () => {
    await abrirEdicao();

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
describe("AdminCourseFormPage — vídeo de apresentação", () => {
  const GUID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
  const EMBED = `https://iframe.mediadelivery.net/embed/999/${GUID}`;
  const credenciais = { videoId: GUID, titulo: "Curso", libraryId: "999", expirationTime: 1, signature: "s", embedUrl: EMBED };

  async function abrirEdicao(curso = existingCourse) {
    adminGetCourse.mockResolvedValue(curso);
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/1", path: "/admin/cursos/:id" });
    await screen.findByRole("button", { name: "Enviar vídeo" });
    // Espera o curso chegar: o formulário é preenchido com ele (reset), e o que
    // fosse digitado antes disso seria apagado.
    await waitFor(() => expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(curso.title));
  }

  const escolher = () =>
    fireEvent.change(screen.getByTestId("intro-video-file"), {
      target: { files: [new File(["mp4"], "apresentacao.mp4", { type: "video/mp4" })] },
    });

  it("curso novo, ainda sem salvar: não há botão de enviar vídeo", () => {
    renderWithProviders(<AdminCourseFormPage />, { route: "/admin/cursos/novo" });
    expect(screen.queryByRole("button", { name: "Enviar vídeo" })).toBeNull();
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
    await abrirEdicao();

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
    await abrirEdicao();

    escolher();

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível enviar o vídeo. Tente de novo.");
    expect(completeIntroVideoUpload).not.toHaveBeenCalled();
    expect(screen.queryByTitle("Prévia do vídeo de apresentação")).toBeNull();
  });

  it("curso que já tem vídeo: o player aparece ao abrir", async () => {
    await abrirEdicao({ ...existingCourse, introVideoId: GUID, introVideoEmbedUrl: EMBED });

    const player = await screen.findByTitle("Prévia do vídeo de apresentação");
    expect(player.getAttribute("src")).toBe(EMBED);
  });

  it("id colado fora do formato do Bunny: aviso no campo, e nada é salvo", async () => {
    await abrirEdicao();

    fireEvent.change(screen.getByLabelText("Vídeo promocional"), { target: { value: "meu-video" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados do curso" }));

    expect(await screen.findByText(/Cole o ID do vídeo como aparece no Bunny/)).toBeTruthy();
    expect(updateCourse).not.toHaveBeenCalled();
  });
});
