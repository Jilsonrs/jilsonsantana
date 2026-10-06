// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { Role, courseUpdateSchema } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail } from "@/lib/api";
import { SecondaryNav } from "@/components/nav/SecondaryNav";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const updateCourse = vi.fn();
const insertModule = vi.fn();
const getCommonTexts = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  updateCourse: (...args: unknown[]) => updateCourse(...args),
  insertModule: (...args: unknown[]) => insertModule(...args),
  // As caixas das Camadas e dos materiais leem os textos comuns.
  getCommonTexts: (...args: unknown[]) => getCommonTexts(...args),
  COMMON_TEXTS_QUERY: "site-text-common",
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";
import { TEMPO_DO_SUCESSO } from "@/lib/aviso-flutuante";
import { pt } from "@jilson/core";

beforeEach(() => {
  adminGetCourse.mockReset();
  updateCourse.mockReset();
  insertModule.mockReset();
  // Sem resposta do servidor, valem os textos de fábrica.
  getCommonTexts.mockReset().mockRejectedValue(new Error("sem servidor"));
});

/**
 * Abre o editor como o app abre: as MESMAS rotas filhas (`ROTAS_DO_EDITOR`) e o
 * nível 2 da navegação ao lado, que é por onde o operador troca de passo.
 */
function abrir(rota: string, curso: AdminCourseDetail = CURSO_DE_TESTE) {
  adminGetCourse.mockResolvedValue(curso);
  return renderWithProviders(
    <>
      <SecondaryNav papel={Role.ADMIN} onSignOut={vi.fn()} />
      <CourseEditorLayout />
    </>,
    { route: rota, path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR },
  );
}

/** Espera o formulário chegar preenchido com o curso gravado. */
async function esperarTitulo(titulo = CURSO_DE_TESTE.title) {
  const campo = (await screen.findByLabelText("Título")) as HTMLInputElement;
  await waitFor(() => expect(campo.value).toBe(titulo));
  return campo;
}

const passo = (nome: string) => within(screen.getByRole("complementary")).getByRole("link", { name: new RegExp(nome) });
const salvar = () => fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
const chavesEnviadas = () => Object.keys(updateCourse.mock.calls[0][1]).sort();

describe("Editor do curso — estados da tela", () => {
  it("carregando", () => {
    adminGetCourse.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/basico", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("curso que não existe", async () => {
    adminGetCourse.mockRejectedValue({ response: { status: 404, data: { error: "NotFound" } } });
    renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/99/basico", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
    expect(await screen.findByText("Curso não encontrado")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("falha ao carregar avisa, sem mostrar formulário", async () => {
    adminGetCourse.mockRejectedValue(new Error("Network Error"));
    renderWithProviders(<CourseEditorLayout />, { route: "/admin/cursos/1/basico", path: "/admin/cursos/:id", filhas: ROTAS_DO_EDITOR });
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar o curso.");
    expect(screen.queryByLabelText("Título")).toBeNull();
  });

  it("topo: título do curso, status em português e o caminho de volta", async () => {
    abrir("/admin/cursos/1/basico");
    expect(await screen.findByRole("heading", { level: 1, name: CURSO_DE_TESTE.title })).toBeTruthy();
    expect(screen.getByText("Rascunho")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar para cursos" }).getAttribute("href")).toBe("/admin/cursos");
  });

  // A duração no topo, como a Udemy (decisão do operador, 29/09/2026): todo vídeo
  // enviado, inclusive de aula em rascunho; a aula de texto não conta.
  it("topo: a duração de todo vídeo enviado", async () => {
    const aula = (id: number, parcial: Partial<AdminCourseDetail["modules"][number]["lessons"][number]>) => ({
      id, moduleId: 1, title: `Aula ${id}`, kind: "VIDEO" as const, content: null,
      bunnyVideoId: "aaaaaaaa-0cda-46be-b47d-1118ad7c2ffe", bunnyVideoPendingId: null,
      bunnyVideoReady: true, videoDurationSeconds: 1800, isFreePreview: false, tags: [],
      displayOrder: id, status: "PUBLISHED" as const, ...parcial,
    });
    abrir("/admin/cursos/1/basico", {
      ...CURSO_DE_TESTE,
      modules: [{
        id: 1, courseId: 1, title: "M", layer: null, displayOrder: 0, status: "PUBLISHED",
        lessons: [
          aula(1, {}),
          aula(2, { status: "DRAFT", videoDurationSeconds: 2100 }),
          aula(3, { kind: "TEXT", bunnyVideoId: null, videoDurationSeconds: null }),
        ],
      }],
    });
    expect(await screen.findByText("1h 05min de vídeo")).toBeTruthy();
  });

  it("topo: curso sem vídeo mostra 0min", async () => {
    abrir("/admin/cursos/1/basico");
    expect(await screen.findByText("0min de vídeo")).toBeTruthy();
  });

  // O "Editar" do cartão da lista aponta para /admin/cursos/:id.
  it("o endereço do curso sem passo abre Informações básicas", async () => {
    abrir("/admin/cursos/1");
    await esperarTitulo();
    expect(passo("Informações básicas").getAttribute("aria-current")).toBe("page");
  });
});

describe("Editor do curso — o nível 2", () => {
  it("os passos levam ao passo DESTE curso", async () => {
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    expect(passo("Publicar").getAttribute("href")).toBe("/admin/cursos/1/publicar");
  });

  // Legendas e Mensagens ganharam as suas telas em 04/10/2026 (decisões do
  // operador): os sete passos são links, nenhum EM BREVE.
  it("Legendas e Mensagens são links, sem EM BREVE", async () => {
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    const coluna = within(screen.getByRole("complementary"));
    expect(coluna.getByRole("link", { name: /Mensagens/ }).getAttribute("href")).toBe("/admin/cursos/1/mensagens");
    expect(coluna.queryByText("EM BREVE")).toBeNull();
    expect(coluna.getByRole("link", { name: /Legendas/ }).getAttribute("href")).toBe("/admin/cursos/1/legendas");
  });

  it("o ✓ aparece quando o passo SALVO fica completo", async () => {
    const publicado = { ...CURSO_DE_TESTE, status: "PUBLISHED" as const };
    updateCourse.mockResolvedValue(publicado);
    abrir("/admin/cursos/1/publicar");
    await screen.findByLabelText("Status");
    expect(passo("Publicar").textContent).not.toContain("completo");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "PUBLISHED" } });
    // Escolher "Publicado" sem salvar não marca: o ✓ diz o que está gravado.
    expect(passo("Publicar").textContent).not.toContain("completo");

    adminGetCourse.mockResolvedValue(publicado);
    salvar();
    await waitFor(() => expect(passo("Publicar").textContent).toContain("completo"));
  });
});

describe("Editor do curso — cada passo salva só a parte dele", () => {
  it("Informações básicas envia título, subtítulo, slug, descrição, idioma e nível", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico");
    fireEvent.change(await esperarTitulo(), { target: { value: "Título Editado" } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][0]).toBe(1);
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ title: "Título Editado", language: "pt" });
    expect(chavesEnviadas()).toEqual(["description", "language", "level", "slug", "subtitle", "title"]);
  });

  // "Todos os níveis" (operador, 28/09/2026) e o nível em português: o código do
  // banco (INICIANTE) nunca aparece na tela.
  it("o Nível mostra os nomes em português, e Todos os níveis vai no envio", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    const nivel = screen.getByLabelText("Nível") as HTMLSelectElement;
    expect([...nivel.options].map((o) => o.textContent)).toEqual([
      "—",
      "Iniciante",
      "Intermediário",
      "Avançado",
      "Todos os níveis",
    ]);

    fireEvent.change(nivel, { target: { value: "TODOS_OS_NIVEIS" } });
    salvar();
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ level: "TODOS_OS_NIVEIS" });
  });

  it("Para quem é envia só as três listas", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/para-quem-e");
    const item = (await screen.findByLabelText("Entregáveis e Habilidades, item 1")) as HTMLInputElement;
    await waitFor(() => expect(item.value).toBe("PROCX"));
    fireEvent.change(item, { target: { value: "Fórmulas" } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toEqual({ learnTags: ["Fórmulas"], requirements: [], personas: [] });
  });

  // As mensagens do curso (operador, 04/10/2026): vão só as duas, e a apagada
  // vai como `null` (ausente o servidor leria "não mexe").
  it("Mensagens envia só as duas mensagens; a em branco vai como null", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/mensagens", { ...CURSO_DE_TESTE, congratsMessage: "Parabéns antigo" });
    const boasVindas = (await screen.findByLabelText("Mensagem de boas-vindas")) as HTMLTextAreaElement;
    const parabens = screen.getByLabelText("Mensagem de parabéns") as HTMLTextAreaElement;
    await waitFor(() => expect(parabens.value).toBe("Parabéns antigo"));
    expect(screen.getByText(/Chega quando o aluno abre a primeira aula do curso/)).toBeTruthy();
    fireEvent.change(boasVindas, { target: { value: "  Bem-vindo ao **curso**!  " } });
    fireEvent.change(parabens, { target: { value: "   " } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toEqual({ welcomeMessage: "Bem-vindo ao **curso**!", congratsMessage: null });
  });

  it("Mensagens: acima do limite não envia e diz o porquê", async () => {
    abrir("/admin/cursos/1/mensagens");
    const boasVindas = await screen.findByLabelText("Mensagem de boas-vindas");
    // O campo trava no limite ao digitar; colado por fora, o formulário confere.
    fireEvent.change(boasVindas, { target: { value: "a".repeat(2001) } });
    salvar();
    expect(await screen.findByText(/no máximo 2\.000 caracteres/)).toBeTruthy();
    expect(updateCourse).not.toHaveBeenCalled();
  });

  // Os materiais exclusivos também são do Publicar (decisão do operador, 04/10/2026).
  it("Publicar envia só status, ordem e materiais, com o status em português na tela", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/publicar");
    const status = (await screen.findByLabelText("Status")) as HTMLSelectElement;
    expect([...status.options].map((o) => o.textContent)).toEqual(["Rascunho", "Publicado", "Arquivado"]);
    fireEvent.change(status, { target: { value: "PUBLISHED" } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toEqual({ status: "PUBLISHED", displayOrder: 0, materiais: [] });
  });

  // A ORDEM EDITADA (defeito achado pelo operador em 05/10/2026): o campo guardava
  // o texto digitado ("3"), o Salvar do passo envia os valores crus, e o servidor
  // recusava (400) — com qualquer status. Vai o NÚMERO, e o envio passa no mesmo
  // schema que o servidor confere. Apagada, a ordem vale 0, como antes.
  it("Publicar: a Ordem editada vai como número, e o envio passa no schema do servidor", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/publicar");
    const ordem = (await screen.findByLabelText("Ordem")) as HTMLInputElement;
    fireEvent.change(ordem, { target: { value: "3" } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    const enviado = updateCourse.mock.calls[0][1];
    expect(enviado.displayOrder).toBe(3);
    expect(courseUpdateSchema.safeParse(enviado).success).toBe(true);

    fireEvent.change(ordem, { target: { value: "" } });
    salvar();
    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(2));
    expect(updateCourse.mock.calls[1][1].displayOrder).toBe(0);
  });

  // OS MATERIAIS EXCLUSIVOS (decisão do operador, 04/10/2026): cada caixa com o
  // nome global (em português, com as edições de Admin → Textos); o curso grava o
  // valor do sistema, que o quadro "Este curso inclui" lê.
  it("materiais: marcar Apostila grava o valor do sistema; o já marcado vem marcado", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/publicar", { ...CURSO_DE_TESTE, materiais: ["BIBLIOTECA_DE_PROMPTS"] });
    const prompts = (await screen.findByLabelText("Biblioteca de prompts")) as HTMLInputElement;
    expect(prompts.checked).toBe(true);

    fireEvent.click(screen.getByLabelText("Apostila"));
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect([...updateCourse.mock.calls[0][1].materiais].sort()).toEqual(["APOSTILA", "BIBLIOTECA_DE_PROMPTS"]);
  });

  it("materiais: o nome editado em Admin → Textos aparece na caixa", async () => {
    getCommonTexts.mockResolvedValue({ ...pt.common, materiais: { ...pt.common.materiais, APOSTILA: "Apostila em PDF" } });
    abrir("/admin/cursos/1/publicar");
    expect(await screen.findByLabelText("Apostila em PDF")).toBeTruthy();
    expect(getCommonTexts).toHaveBeenCalledWith("pt");
  });

  it("o que foi digitado e não salvo continua lá depois de trocar de passo, e não vai junto no salvar de outro", async () => {
    // O curso que volta do servidor é DIFERENTE do primeiro (mudou a ordem): é
    // isso que faria um formulário que se reinicia a cada recarga perder o título.
    const salvo = { ...CURSO_DE_TESTE, displayOrder: 3 };
    updateCourse.mockResolvedValue(salvo);
    abrir("/admin/cursos/1/basico");
    fireEvent.change(await esperarTitulo(), { target: { value: "Título ainda não salvo" } });

    fireEvent.click(passo("Publicar"));
    fireEvent.change(await screen.findByLabelText("Ordem"), { target: { value: "3" } });
    adminGetCourse.mockResolvedValue(salvo);
    salvar();
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).not.toHaveProperty("title");
    await waitFor(() => expect(adminGetCourse).toHaveBeenCalledTimes(2));

    fireEvent.click(passo("Informações básicas"));
    expect(((await screen.findByLabelText("Título")) as HTMLInputElement).value).toBe("Título ainda não salvo");
  });

  // Um erro num passo não trava os outros: cada passo confere os campos dele.
  it("campo inválido em outro passo não impede salvar este", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico");
    fireEvent.change(await esperarTitulo(), { target: { value: "" } });

    fireEvent.click(passo("Publicar"));
    await screen.findByLabelText("Status");
    salvar();
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
  });

  it("Conteúdo: adicionar módulo grava no curso certo", async () => {
    insertModule.mockResolvedValue({ id: 10 });
    abrir("/admin/cursos/1/conteudo");

    fireEvent.click(await screen.findByRole("button", { name: "Adicionar módulo no fim do curso" }));
    fireEvent.change(screen.getByLabelText("Título: Módulo"), { target: { value: "Módulo Novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar módulo" }));

    await waitFor(() => expect(insertModule).toHaveBeenCalledWith(1, { title: "Módulo Novo", posicao: 0 }));
    // O Conteúdo se salva item a item: não tem o Salvar do passo.
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });
});

// O passo Publicar reúne o que falta, o status, a ordem e o link (operador,
// 27–28/09/2026). O que falta e o link leem o curso GRAVADO.
describe("Editor do curso — Publicar", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  function areaDeTransferencia(writeText: (texto: string) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  }

  const linkDoCurso = async () => ((await screen.findByLabelText("Link")) as HTMLInputElement).value;

  it("mostra o que falta do curso, com a barra de preenchimento", async () => {
    abrir("/admin/cursos/1/publicar", { ...CURSO_DE_TESTE, thumbnailUrl: "/img/c.jpg", description: "Curta demais." });
    const barra = await screen.findByRole("progressbar", { name: `Preenchimento de ${CURSO_DE_TESTE.title}` });

    expect(barra.getAttribute("aria-valuenow")).toBe("20");
    expect(screen.getByText("Descrição curta (menos de 200 palavras)")).toBeTruthy();
    expect(screen.getByText("Falta o vídeo de apresentação")).toBeTruthy();
    expect(screen.queryByText("Falta a capa")).toBeNull();
  });

  it("o link é o endereço público do curso, no idioma dele", async () => {
    abrir("/admin/cursos/1/publicar");
    expect(await linkDoCurso()).toBe(`${window.location.origin}/curso/exemplo-fundamentos-excel-ia`);
    expect(screen.queryByText(/página dos cursos em inglês/)).toBeNull();
  });

  it("curso em inglês: link em /en/course, com o aviso de que a página ainda não existe", async () => {
    abrir("/admin/cursos/1/publicar", { ...CURSO_DE_TESTE, language: "en", slug: "excel-and-ai" });
    expect(await linkDoCurso()).toBe(`${window.location.origin}/en/course/excel-and-ai`);
    expect(screen.getByText(/página dos cursos em inglês ainda não existe/)).toBeTruthy();
  });

  it("copiar põe o link na área de transferência, avisa, e não salva nada", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    areaDeTransferencia(writeText);
    abrir("/admin/cursos/1/publicar");
    const link = await linkDoCurso();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Link copiado."));
    expect(writeText).toHaveBeenCalledWith(link);
    expect(updateCourse).not.toHaveBeenCalled();
  });

  it("sem área de transferência no navegador: diz para copiar à mão", async () => {
    abrir("/admin/cursos/1/publicar");
    await linkDoCurso();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(screen.getByRole("status").textContent).toBe("Não foi possível copiar. Selecione o link e copie.");
  });

  it("permissão negada: diz para copiar à mão", async () => {
    areaDeTransferencia(() => Promise.reject(new Error("NotAllowedError")));
    abrir("/admin/cursos/1/publicar");
    await linkDoCurso();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Não foi possível copiar. Selecione o link e copie."),
    );
  });
});

// Idioma do curso (decisões do operador: campo na criação, 14/09; troca só
// enquanto rascunho, 24/09/2026). A criação está em NewCoursePage.test.tsx.
describe("Editor do curso — idioma", () => {
  it("rascunho: o idioma troca", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico");

    const idioma = (await screen.findByLabelText("Idioma")) as HTMLSelectElement;
    await waitFor(() => expect(idioma.value).toBe("pt"));
    fireEvent.change(idioma, { target: { value: "en" } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ language: "en" });
  });

  it("publicado: o idioma aparece travado, com o motivo, e vai o mesmo no envio", async () => {
    const publicado = { ...CURSO_DE_TESTE, status: "PUBLISHED" as const, language: "en" as const };
    updateCourse.mockResolvedValue(publicado);
    abrir("/admin/cursos/1/basico", publicado);

    expect(await screen.findByText("O idioma trava depois que o curso é publicado.")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    expect(screen.queryByLabelText("Idioma")).toBeNull();

    salvar();
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][1]).toMatchObject({ language: "en" });
  });
});

// Antes a tela não dizia nada quando o salvamento falhava (achado da etapa 3c,
// consertado a pedido do operador em 24/09/2026).
describe("Editor do curso — quando salvar falha", () => {
  function recusa(codigo?: string) {
    return { response: { status: 409, data: codigo ? { error: codigo } : {} } };
  }

  async function salvarBasico() {
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    salvar();
  }

  it.each([
    ["SlugTaken", "Este slug já está em uso por outro curso."],
    ["LanguageLocked", "O idioma trava depois que o curso é publicado."],
    ["LanguageInUse", "Este curso está numa trilha de outro idioma. Tire-o da trilha antes de trocar o idioma."],
    ["BunnyNaoApagou", "Não foi possível tirar o vídeo de apresentação: o Bunny não apagou. Tente de novo."],
    [undefined, "Não foi possível salvar o curso. Tente de novo."],
  ])("recusa %s mostra a frase certa", async (codigo, frase) => {
    updateCourse.mockRejectedValue(recusa(codigo));
    await salvarBasico();

    expect((await screen.findByRole("alert")).textContent).toBe(frase);
  });

  it("queda de rede (sem resposta do servidor) também avisa", async () => {
    updateCourse.mockRejectedValue(new Error("Network Error"));
    await salvarBasico();

    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível salvar o curso. Tente de novo.");
  });

  it("o aviso some quando o salvamento seguinte dá certo", async () => {
    updateCourse.mockRejectedValueOnce(recusa("SlugTaken")).mockResolvedValue(CURSO_DE_TESTE);
    await salvarBasico();
    await screen.findByRole("alert");

    salvar();
    await waitFor(() => expect(updateCourse).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

// O defeito de 29/09/2026: apagar um campo JÁ SALVO e salvar não apagava nada.
// O vazio ia como "ausente", e o servidor lê ausente como "não mexe"; a tela
// dizia "salvo" e o valor antigo continuava lá. Agora o vazio vai como `null`.
describe("Editor do curso — apagar um campo já salvo", () => {
  it("apagar o subtítulo e a descrição e salvar envia os dois VAZIOS, não ausentes", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico", { ...CURSO_DE_TESTE, subtitle: "Um subtítulo", description: "Uma descrição" });
    await esperarTitulo();
    const subtitulo = screen.getByLabelText("Subtítulo") as HTMLInputElement;
    await waitFor(() => expect(subtitulo.value).toBe("Um subtítulo"));

    fireEvent.change(subtitulo, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "   " } });
    salvar();

    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    const enviado = updateCourse.mock.calls[0][1];
    expect(enviado).toHaveProperty("subtitle", null);
    expect(enviado).toHaveProperty("description", null);
  });
});

// O SALVAR NO TOPO, com a mensagem de "salvou" ou "não salvou" (decisões do
// operador, 03/10/2026, a partir da Udemy): o botão fica depois de "Voltar para
// cursos" e não há outro embaixo; o sucesso some sozinho, o erro fica até fechar.
describe("Editor do curso — o Salvar no topo e a mensagem", () => {
  const SALVOU = "Suas alterações foram salvas.";

  afterEach(() => {
    vi.useRealTimers();
  });

  // A ordem do topo (operador, 04/10/2026): Voltar para cursos, Visualizar, Salvar.
  it("um Salvar só, no topo: Voltar para cursos, Visualizar e Salvar, nessa ordem", async () => {
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();

    const salvarNoTopo = screen.getByRole("button", { name: "Salvar" });
    const voltar = screen.getByRole("link", { name: "Voltar para cursos" });
    const visualizar = screen.getByRole("link", { name: "Visualizar" });
    expect(screen.getAllByRole("button", { name: "Salvar" })).toHaveLength(1);
    // Mesmo grupo do topo; o Salvar mora no lugar que o topo reserva para o botão
    // do passo, que não ocupa espaço na tela.
    expect(voltar.parentElement?.contains(salvarNoTopo)).toBe(true);
    expect(voltar.nextElementSibling).toBe(visualizar);
    expect(visualizar.nextElementSibling?.contains(salvarNoTopo)).toBe(true);
  });

  // Visualizar (operador, 04/10/2026): a prévia DESTE curso, numa nova aba, para o
  // editor continuar aberto — em todo passo, inclusive o Conteúdo, que não tem Salvar.
  it("Visualizar abre a prévia deste curso em nova aba, em todo passo", async () => {
    for (const passo of ["publicar", "conteudo"]) {
      const { unmount } = abrir(`/admin/cursos/1/${passo}`);
      const link = await screen.findByRole("link", { name: "Visualizar" });
      expect(link.getAttribute("href"), passo).toBe("/admin/cursos/1/previa");
      expect(link.getAttribute("target"), passo).toBe("_blank");
      unmount();
    }
  });

  it("salvou: a mensagem aparece, some sozinha, e o Fechar também fecha", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    salvar();
    expect(await screen.findByText(SALVOU)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(TEMPO_DO_SUCESSO);
    });
    expect(screen.queryByText(SALVOU)).toBeNull();

    salvar();
    expect(await screen.findByText(SALVOU)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText(SALVOU)).toBeNull();
  });

  it("o servidor recusou: o erro aparece e FICA, até fechar", async () => {
    updateCourse.mockRejectedValue(new Error("Network Error"));
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    salvar();
    const erro = await screen.findByRole("alert");
    expect(erro.textContent).toBe("Não foi possível salvar o curso. Tente de novo.");
    act(() => {
      vi.advanceTimersByTime(TEMPO_DO_SUCESSO * 3);
    });
    expect(screen.getByRole("alert")).toBe(erro);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("campo inválido: a mensagem pede para conferir, e nada é enviado", async () => {
    abrir("/admin/cursos/1/basico");
    const titulo = await esperarTitulo();
    fireEvent.change(titulo, { target: { value: "" } });

    salvar();

    expect((await screen.findByRole("alert")).textContent).toBe("Confira os campos marcados antes de salvar.");
    expect(updateCourse).not.toHaveBeenCalled();
  });

  it("a mensagem continua quando o operador troca de passo", async () => {
    updateCourse.mockResolvedValue(CURSO_DE_TESTE);
    abrir("/admin/cursos/1/basico");
    await esperarTitulo();
    salvar();
    expect(await screen.findByText(SALVOU)).toBeTruthy();

    fireEvent.click(passo("Para quem é"));

    expect(await screen.findByText(SALVOU)).toBeTruthy();
  });

  it("o passo Conteúdo (salva aula por aula) não tem Salvar no topo", async () => {
    abrir("/admin/cursos/1/conteudo");
    await screen.findByRole("button", { name: "Adicionar módulo no fim do curso" });
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });
});
