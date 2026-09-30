import { describe, it, expect } from "vitest";
import type { AdminLesson, AdminModule } from "@/lib/api";
import { horasEMinutos, segundosDeVideo, textoDaDuracao } from "./duracao-do-curso";

// Função pura, sem I/O e sem tela: o caso em que o repo aceita teste unitário
// (CLAUDE.md → Testing).

function aula(parcial: Partial<AdminLesson>): AdminLesson {
  return {
    id: 1,
    moduleId: 1,
    title: "Aula",
    kind: "VIDEO",
    content: null,
    bunnyVideoId: "aaaaaaaa-0cda-46be-b47d-1118ad7c2ffe",
    bunnyVideoPendingId: null,
    bunnyVideoReady: true,
    videoDurationSeconds: 60,
    isFreePreview: false,
    tags: [],
    displayOrder: 0,
    status: "PUBLISHED",
    ...parcial,
  };
}

function modulo(lessons: AdminLesson[], status: AdminModule["status"] = "PUBLISHED"): AdminModule {
  return { id: 1, courseId: 1, title: "M", layer: null, displayOrder: 0, status, lessons };
}

// A soma: TODO vídeo enviado, como a Udemy (decisão do operador, 29/09/2026).
describe("segundosDeVideo", () => {
  it("soma aula publicada e aula em RASCUNHO, em módulo de qualquer status", () => {
    const total = segundosDeVideo([
      modulo([aula({ videoDurationSeconds: 600 }), aula({ status: "DRAFT", videoDurationSeconds: 300 })]),
      modulo([aula({ videoDurationSeconds: 120 })], "DRAFT"),
    ]);
    expect(total).toBe(1020);
  });

  it("a aula de texto e a aula sem vídeo não contam", () => {
    const total = segundosDeVideo([
      modulo([
        aula({ videoDurationSeconds: 100 }),
        aula({ kind: "TEXT", videoDurationSeconds: 999 }),
        aula({ bunnyVideoId: null, videoDurationSeconds: 999 }),
      ]),
    ]);
    expect(total).toBe(100);
  });

  it("vídeo ainda sem duração (processando) conta zero, sem quebrar", () => {
    expect(segundosDeVideo([modulo([aula({ videoDurationSeconds: null })])])).toBe(0);
    expect(segundosDeVideo([])).toBe(0);
  });
});

// O formato: "2h 35min de vídeo" (decisão do operador, 29/09/2026).
describe("textoDaDuracao", () => {
  it.each([
    [0, "0min de vídeo"],
    [45 * 60, "45min de vídeo"],
    [2 * 3600 + 35 * 60, "2h 35min de vídeo"],
    [3600 + 5 * 60, "1h 05min de vídeo"],
    [3600, "1h 00min de vídeo"],
    [89, "1min de vídeo"],
    [91, "2min de vídeo"],
  ])("%i segundos → %s", (segundos, texto) => {
    expect(textoDaDuracao(segundos)).toBe(texto);
  });

  // Com vídeo enviado, o topo nunca diz "0min".
  it("um vídeo curto (menos de 1 min) conta como 1min", () => {
    expect(textoDaDuracao(20)).toBe("1min de vídeo");
  });
});

// O formato curto do catálogo e da página do curso: "2 módulos · 4 aulas · 1h 05min"
// (operador, 30/09/2026), igual nos dois idiomas.
describe("horasEMinutos", () => {
  it.each([
    [0, "0min"],
    [45 * 60, "45min"],
    [3600 + 5 * 60, "1h 05min"],
    [20, "1min"],
  ])("%i segundos → %s", (segundos, texto) => {
    expect(horasEMinutos(segundos)).toBe(texto);
  });
});
