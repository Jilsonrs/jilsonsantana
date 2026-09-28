import { describe, it, expect } from "vitest";
import { moverAula, moverModulo, type Estrutura } from "./course-structure";

// A ordem nova que as setas calculam (Bloco E, etapa 2). Função pura, sem I/O e
// sem tela — o caso em que o repo aceita teste unitário (CLAUDE.md → Testing).

const ESTRUTURA: Estrutura = [
  { id: 1, aulas: [11, 12, 13] },
  { id: 2, aulas: [21] },
];

describe("moverModulo", () => {
  it("desce e sobe um módulo", () => {
    expect(moverModulo(ESTRUTURA, 0, 1).map((m) => m.id)).toEqual([2, 1]);
    expect(moverModulo(ESTRUTURA, 1, -1).map((m) => m.id)).toEqual([2, 1]);
  });

  it("na ponta, não muda nada", () => {
    expect(moverModulo(ESTRUTURA, 0, -1)).toEqual(ESTRUTURA);
    expect(moverModulo(ESTRUTURA, 1, 1)).toEqual(ESTRUTURA);
  });

  it("as aulas vão junto com o módulo", () => {
    expect(moverModulo(ESTRUTURA, 0, 1)[1]).toEqual({ id: 1, aulas: [11, 12, 13] });
  });
});

describe("moverAula", () => {
  it("move só dentro do módulo dela", () => {
    expect(moverAula(ESTRUTURA, 1, 0, 1)).toEqual([
      { id: 1, aulas: [12, 11, 13] },
      { id: 2, aulas: [21] },
    ]);
  });

  it("na ponta, não muda nada", () => {
    expect(moverAula(ESTRUTURA, 1, 2, 1)).toEqual(ESTRUTURA);
    expect(moverAula(ESTRUTURA, 2, 0, -1)).toEqual(ESTRUTURA);
  });

  it("não mexe na lista original", () => {
    moverAula(ESTRUTURA, 1, 0, 1);
    expect(ESTRUTURA[0].aulas).toEqual([11, 12, 13]);
  });
});
