import { describe, it, expect } from "vitest";
import type { AdminCourseDetail, AdminModule } from "@/lib/api";
import { blankValues } from "@/lib/course-form";
import { passosConcluidos, payloadDoPasso, PASSOS_DO_CURSO } from "./course-steps";

// A regra do ✓ de cada passo é do operador (28/09/2026). Função pura, sem I/O e
// sem tela — o caso em que o repo aceita teste unitário (CLAUDE.md → Testing).

const VAZIO: AdminCourseDetail = {
  id: 1,
  slug: "curso",
  title: "Curso",
  subtitle: null,
  description: null,
  level: null,
  learnTags: [],
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

const palavras = (n: number) => Array.from({ length: n }, () => "palavra").join(" ");

function modulo(status: AdminModule["status"], aulas: AdminModule["status"][]): AdminModule {
  return {
    id: 1,
    courseId: 1,
    title: "M",
    layer: null,
    displayOrder: 0,
    status,
    lessons: aulas.map((s, i) => ({ id: i, moduleId: 1, title: "A", kind: "VIDEO", content: null, tags: [], displayOrder: i, status: s })),
  };
}

describe("passosConcluidos — o ✓ de cada passo", () => {
  it("curso vazio não tem passo completo", () => {
    expect([...passosConcluidos(VAZIO)]).toEqual([]);
  });

  const basicoCompleto = { ...VAZIO, subtitle: "Resultado", level: "INICIANTE" as const, description: palavras(200) };

  it("Informações básicas: título, subtítulo, nível e descrição com 200 palavras", () => {
    expect(passosConcluidos(basicoCompleto).has("basico")).toBe(true);
    expect(passosConcluidos({ ...basicoCompleto, description: palavras(199) }).has("basico")).toBe(false);
    expect(passosConcluidos({ ...basicoCompleto, subtitle: "  " }).has("basico")).toBe(false);
    expect(passosConcluidos({ ...basicoCompleto, level: null }).has("basico")).toBe(false);
  });

  // A descrição é Markdown: marcador de lista e de negrito não é palavra.
  it("marcadores de Markdown não contam como palavra", () => {
    const comMarcadores = `${palavras(199)}\n- **`;
    expect(passosConcluidos({ ...basicoCompleto, description: comMarcadores }).has("basico")).toBe(false);
  });

  it("Para quem é: pelo menos um item em CADA lista", () => {
    const tres = { ...VAZIO, learnTags: ["a"], requirements: ["b"], personas: ["c"] };
    expect(passosConcluidos(tres).has("para-quem-e")).toBe(true);
    expect(passosConcluidos({ ...tres, personas: [] }).has("para-quem-e")).toBe(false);
  });

  // Aula publicada dentro de módulo em rascunho não aparece para o aluno.
  it("Conteúdo: aula publicada DENTRO de módulo publicado", () => {
    expect(passosConcluidos({ ...VAZIO, modules: [modulo("PUBLISHED", ["PUBLISHED"])] }).has("conteudo")).toBe(true);
    expect(passosConcluidos({ ...VAZIO, modules: [modulo("DRAFT", ["PUBLISHED"])] }).has("conteudo")).toBe(false);
    expect(passosConcluidos({ ...VAZIO, modules: [modulo("PUBLISHED", ["DRAFT"])] }).has("conteudo")).toBe(false);
  });

  it("Página do curso: imagem E vídeo promocional (destaques e perguntas são opcionais)", () => {
    const comMidia = { ...VAZIO, thumbnailUrl: "/img/c.jpg", introVideoId: "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe" };
    expect(passosConcluidos(comMidia).has("pagina")).toBe(true);
    expect(passosConcluidos({ ...comMidia, introVideoId: null }).has("pagina")).toBe(false);
  });

  it("Publicar: o curso está publicado", () => {
    expect(passosConcluidos({ ...VAZIO, status: "PUBLISHED" }).has("publicar")).toBe(true);
    expect(passosConcluidos({ ...VAZIO, status: "ARCHIVED" }).has("publicar")).toBe(false);
  });

  it("Legendas e Mensagens nunca ganham ✓ (ainda não existem)", () => {
    const tudo = passosConcluidos({ ...VAZIO, status: "PUBLISHED" });
    expect(tudo.has("legendas")).toBe(false);
    expect(tudo.has("mensagens")).toBe(false);
  });
});

describe("payloadDoPasso — cada passo envia só a parte dele", () => {
  it("nenhum campo aparece em dois passos", () => {
    const todos = PASSOS_DO_CURSO.flatMap((p) => p.envia);
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("o payload tem exatamente os campos do passo", () => {
    for (const passo of PASSOS_DO_CURSO) {
      expect(Object.keys(payloadDoPasso(blankValues, passo.slug)).sort(), passo.slug).toEqual([...passo.envia].sort());
    }
  });
});
