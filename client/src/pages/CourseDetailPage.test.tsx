// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { CourseDetail } from "@/lib/api";

const getCourseBySlug = vi.fn();
// O selo das 3 camadas lê os textos comuns (editáveis em Textos) pela mesma rota
// do rodapé. `getCommonTexts` controla o que essa leitura devolve.
const getCommonTexts = vi.fn();
vi.mock("@/lib/api", () => ({
  getCourseBySlug: (...args: unknown[]) => getCourseBySlug(...args),
  getCommonTexts: (...args: unknown[]) => getCommonTexts(...args),
  COMMON_TEXTS_QUERY: "site-text-common",
}));

import { pt } from "@jilson/core";
import { CourseDetailPage } from "./CourseDetailPage";
import { IdiomaProvider } from "@/lib/language";

const rota = { route: "/curso/exemplo-fundamentos-excel-ia", path: "/curso/:slug" };

const NADA = { segundosDeVideo: 0, artigos: 0, aulasGratis: 0, arquivos: false, legendas: false };

const baseCourse: CourseDetail = {
  id: 1,
  slug: "exemplo-fundamentos-excel-ia",
  title: "Exemplo — Fundamentos de Excel + IA",
  subtitle: "Da lógica de fórmulas ao copiloto de IA",
  description: null,
  level: "INTERMEDIARIO",
  learnTags: ["PROCX", "Tabelas dinâmicas"],
  requirements: ["Ter o Excel instalado"],
  personas: ["Analistas de dados"],
  highlights: [{ icon: "sparkles", title: "IA do seu lado", text: "Gere lógica com o JilsonAI." }],
  faq: [],
  camadas: ["UNIVERSAL", "IA"],
  thumbnailUrl: null,
  introVideoId: null,
  introVideoEmbedUrl: null,
  moduleCount: 1,
  lessonCount: 2,
  videoSeconds: 3900, // 1h 05min
  language: "pt",
  materiais: [],
  inclui: NADA,
  modules: [
    {
      id: 10,
      title: "Base Lógica Inquebrável",
      layer: "UNIVERSAL",
      displayOrder: 0,
      status: "PUBLISHED",
      lessons: [
        { id: 100, title: "PROCV e ÍNDICE+CORRESP", tags: ["procv"], displayOrder: 0 },
      ],
    },
  ],
};

beforeEach(() => {
  getCourseBySlug.mockReset();
  // Padrão: a leitura dos textos comuns ainda não voltou → vale o de fábrica.
  getCommonTexts.mockReset().mockReturnValue(new Promise(() => {}));
});

describe("CourseDetailPage", () => {
  it("renders hero, selo (only the marked layers), learnTags and the module accordion", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, { route: "/curso/exemplo-fundamentos-excel-ia", path: "/curso/:slug" });

    expect(await screen.findByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
    expect(screen.getByText("Fundamentos sólidos")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^Nosso método/ })).toBeTruthy();
    expect(screen.getByText("Com IA do seu lado")).toBeTruthy();
    expect(screen.queryByText("Recursos modernos")).toBeNull();
    expect(screen.getByText("PROCX")).toBeTruthy();

    screen.getByText("Base Lógica Inquebrável").click();
    await waitFor(() => expect(screen.getByText("PROCV e ÍNDICE+CORRESP")).toBeTruthy());
  });

  // Cada aula leva à página da aula (etapa 4 do Bloco U, 29/09/2026).
  it("cada aula do conteúdo leva à página da aula", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, { route: "/curso/exemplo-fundamentos-excel-ia", path: "/curso/:slug" });
    (await screen.findByText("Base Lógica Inquebrável")).click();
    const link = await screen.findByRole("link", { name: "PROCV e ÍNDICE+CORRESP" });
    expect(link.getAttribute("href")).toBe("/aluno/aula/100");
  });

  it("does not render the FAQ accordion when faq is empty", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, { route: "/curso/exemplo-fundamentos-excel-ia", path: "/curso/:slug" });

    await screen.findByText("Exemplo — Fundamentos de Excel + IA");
    expect(screen.queryByText("Perguntas frequentes")).toBeNull();
  });

  it("shows a not-found state when the course doesn't exist", async () => {
    getCourseBySlug.mockRejectedValue(new Error("404"));
    renderWithProviders(<CourseDetailPage />, { route: "/curso/inexistente", path: "/curso/:slug" });

    expect(await screen.findByText("Curso não encontrado.")).toBeTruthy();
  });
});

// O texto da TELA segue o idioma do app; o CONTEÚDO do curso fica como o operador
// escreveu (decisão do operador, 24/09/2026).
describe("CourseDetailPage — idioma e textos", () => {
  it("em inglês: a tela em inglês, o conteúdo do curso intacto", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <CourseDetailPage />
      </IdiomaProvider>,
      rota,
    );

    expect(await screen.findByText("Exemplo — Fundamentos de Excel + IA")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Course content" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What you'll learn" })).toBeTruthy();
    expect(screen.getByText("Intermediate")).toBeTruthy();
    expect(screen.getByText("1 module · 2 lessons · 1h 05min")).toBeTruthy();
    expect(screen.getByText("Solid foundations")).toBeTruthy();
    // O título do quadro das camadas sai do dicionário, não fica em português.
    expect(screen.getByRole("heading", { name: /^Our method/ })).toBeTruthy();
    // Conteúdo não é traduzido: o módulo e a tag saem como foram escritos.
    expect(screen.getByText("Base Lógica Inquebrável")).toBeTruthy();
    expect(screen.queryByText("Conteúdo do curso")).toBeNull();
  });

  it("o nível aparece pelo nome, não pelo valor do sistema", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, rota);

    expect(await screen.findByText("Intermediário")).toBeTruthy();
    expect(screen.queryByText("INTERMEDIARIO")).toBeNull();
  });

  it("a camada EDITADA em Admin → Textos aparece editada", async () => {
    const camadas = { ...pt.common.camadas, UNIVERSAL: { nome: "Base que não quebra", texto: "Frase editada." } };
    getCommonTexts.mockResolvedValue({ ...pt.common, camadas });
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, rota);

    expect(await screen.findByText("Base que não quebra")).toBeTruthy();
    expect(screen.getByText("Frase editada.")).toBeTruthy();
    expect(screen.queryByText("Fundamentos sólidos")).toBeNull();
    expect(getCommonTexts).toHaveBeenCalledWith("pt");
  });

  it("curso publicado com 0 aulas: mostra 0 aulas e não quebra", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, modules: [], moduleCount: 0, lessonCount: 0, videoSeconds: 0 });
    renderWithProviders(<CourseDetailPage />, rota);

    // Sem vídeo, "0min" (operador, 30/09/2026).
    expect(await screen.findByText("0 módulos · 0 aulas · 0min")).toBeTruthy();
  });
});

// Vídeo de apresentação na página do curso (Bloco U, etapa 2 — plano aprovado
// pelo operador em 27/09/2026). É ativo de venda: toca para qualquer visitante.
describe("CourseDetailPage — vídeo de apresentação", () => {
  const EMBED = "https://player.mediadelivery.net/embed/999/eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";

  it("com vídeo: o player do Bunny, com o nome para leitor de tela e a política de referrer que o Bunny exige", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, introVideoEmbedUrl: EMBED });
    renderWithProviders(<CourseDetailPage />, rota);

    const player = await screen.findByTitle("Vídeo de apresentação do curso");
    expect(player.getAttribute("src")).toBe(`${EMBED}?lang=pt`);
    expect(player.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
  });

  it("sem vídeo: nenhum player", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, rota);

    await screen.findByText("Exemplo — Fundamentos de Excel + IA");
    expect(screen.queryByTitle("Vídeo de apresentação do curso")).toBeNull();
  });

  it("em inglês: o nome do player sai do dicionário", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, introVideoEmbedUrl: EMBED });
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <CourseDetailPage />
      </IdiomaProvider>,
      rota,
    );

    expect(await screen.findByTitle("Course introduction video")).toBeTruthy();
  });
});

// "ESTE CURSO INCLUI" (decisões do operador, 04/10/2026): os arquivos aparecem
// sozinhos quando existem; os materiais, os marcados no Publicar; sem nada, o
// quadro não aparece. Textos globais, editáveis em Admin → Textos.
describe("CourseDetailPage — este curso inclui", () => {
  it("os arquivos e os materiais marcados, cada um numa linha", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, inclui: { ...NADA, arquivos: true }, materiais: ["BIBLIOTECA_DE_PROMPTS", "APOSTILA"] });
    renderWithProviders(<CourseDetailPage />, rota);
    const quadro = (await screen.findByRole("heading", { name: "Este curso inclui:" })).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "Arquivos para acompanhar as aulas",
      "Biblioteca de prompts",
      "Apostila",
      "Certificado de conclusão",
    ]);
  });

  // As linhas calculadas (decisões do operador, 05/10/2026), na ordem: vídeo,
  // artigos, aulas grátis, arquivos, legendas, materiais. Zero não aparece.
  it("todas as linhas calculadas, com o número, antes dos materiais", async () => {
    getCourseBySlug.mockResolvedValue({
      ...baseCourse,
      inclui: { segundosDeVideo: 12_000, artigos: 4, aulasGratis: 2, arquivos: true, legendas: true },
      materiais: ["APOSTILA"],
    });
    renderWithProviders(<CourseDetailPage />, rota);
    const quadro = (await screen.findByRole("heading", { name: "Este curso inclui:" })).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "3h 20min de vídeo",
      "4 artigos",
      "2 aulas grátis para experimentar",
      "Arquivos para acompanhar as aulas",
      "Legendas em português",
      "Apostila",
      "Certificado de conclusão",
    ]);
  });

  it("um de cada: no singular; curso em inglês: legendas em inglês", async () => {
    getCourseBySlug.mockResolvedValue({
      ...baseCourse,
      language: "en",
      inclui: { segundosDeVideo: 0, artigos: 1, aulasGratis: 1, arquivos: false, legendas: true },
    });
    renderWithProviders(<CourseDetailPage />, rota);
    const quadro = (await screen.findByRole("heading", { name: "Este curso inclui:" })).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "1 artigo",
      "1 aula grátis para experimentar",
      "Legendas em inglês",
      "Certificado de conclusão",
    ]);
  });

  it("as linhas calculadas em inglês", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, inclui: { segundosDeVideo: 3900, artigos: 2, aulasGratis: 1, arquivos: false, legendas: true } });
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <CourseDetailPage />
      </IdiomaProvider>,
      rota,
    );
    const quadro = (await screen.findByRole("heading", { name: "This course includes:" })).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      "1h 05min of video",
      "2 articles",
      "1 free lesson to try",
      "Portuguese subtitles",
      "Certificate of completion",
    ]);
  });

  // Todo curso dá certificado (operador, 05/10/2026): sem nenhuma outra linha, o
  // quadro aparece só com ele — nunca mais escondido.
  it("sem nenhuma outra linha: o quadro aparece só com o certificado", async () => {
    getCourseBySlug.mockResolvedValue(baseCourse);
    renderWithProviders(<CourseDetailPage />, rota);
    const quadro = (await screen.findByRole("heading", { name: "Este curso inclui:" })).closest("section") as HTMLElement;
    expect([...quadro.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Certificado de conclusão"]);
  });

  // O ícone CC nas legendas (pedido do operador, 05/10/2026).
  it("Legendas com o ícone CC", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, inclui: { ...NADA, legendas: true } });
    renderWithProviders(<CourseDetailPage />, rota);
    const linha = (await screen.findByText("Legendas em português")).closest("li") as HTMLElement;
    expect(linha.querySelector('svg[data-icone="cc"]')).not.toBeNull();
  });

  it("só os materiais: sem a linha dos arquivos", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, materiais: ["APOSTILA"] });
    renderWithProviders(<CourseDetailPage />, rota);
    await screen.findByRole("heading", { name: "Este curso inclui:" });
    expect(screen.queryByText("Arquivos para acompanhar as aulas")).toBeNull();
    expect(screen.getByText("Apostila")).toBeTruthy();
  });

  it("o texto editado em Admin → Textos aparece editado", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, materiais: ["APOSTILA"] });
    getCommonTexts.mockResolvedValue({ ...pt.common, materiais: { ...pt.common.materiais, APOSTILA: "Apostila completa em PDF" } });
    renderWithProviders(<CourseDetailPage />, rota);
    expect(await screen.findByText("Apostila completa em PDF")).toBeTruthy();
  });

  it("em inglês", async () => {
    getCourseBySlug.mockResolvedValue({ ...baseCourse, inclui: { ...NADA, arquivos: true }, materiais: ["APOSTILA"] });
    renderWithProviders(
      <IdiomaProvider idioma="en">
        <CourseDetailPage />
      </IdiomaProvider>,
      rota,
    );
    expect(await screen.findByRole("heading", { name: "This course includes:" })).toBeTruthy();
    expect(screen.getByText("Files to follow along with the lessons")).toBeTruthy();
  });
});
