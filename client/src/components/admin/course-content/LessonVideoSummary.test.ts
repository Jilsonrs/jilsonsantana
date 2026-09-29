import { describe, it, expect } from "vitest";
import { duracaoLegivel } from "./LessonVideoSummary";

// Função pura (a exceção de teste unitário que o CLAUDE.md → Testing permite): a
// duração que a aula aberta mostra, como a Udemy.
describe("duração do vídeo", () => {
  it("minutos e segundos, com dois dígitos nos segundos", () => {
    expect(duracaoLegivel(111)).toBe("1:51");
    expect(duracaoLegivel(65)).toBe("1:05");
    expect(duracaoLegivel(9)).toBe("0:09");
  });

  it("com hora, os minutos também ganham dois dígitos", () => {
    expect(duracaoLegivel(3723)).toBe("1:02:03");
  });
});
