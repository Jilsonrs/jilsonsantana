import { describe, it, expect } from "vitest";
import { aplicarArraste, idDoArraste, lerIdDoArraste, moverAula, moverModulo, type Estrutura } from "./course-structure";

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

describe("aplicarArraste", () => {
  const modulo = (id: number) => ({ tipo: "modulo" as const, id });
  const aula = (id: number) => ({ tipo: "aula" as const, id });

  it("módulo sobre módulo: vai para aquele lugar, com as aulas", () => {
    expect(aplicarArraste(ESTRUTURA, modulo(1), modulo(2))).toEqual([
      { id: 2, aulas: [21] },
      { id: 1, aulas: [11, 12, 13] },
    ]);
  });

  it("módulo sobre uma aula de outro módulo: vai para o lugar daquele módulo", () => {
    expect(aplicarArraste(ESTRUTURA, modulo(1), aula(21)).map((m) => m.id)).toEqual([2, 1]);
  });

  it("aula sobre aula do mesmo módulo: muda de lugar ali", () => {
    expect(aplicarArraste(ESTRUTURA, aula(11), aula(13))[0].aulas).toEqual([12, 13, 11]);
    expect(aplicarArraste(ESTRUTURA, aula(13), aula(11))[0].aulas).toEqual([13, 11, 12]);
  });

  it("aula sobre aula de OUTRO módulo: entra no lugar dela, e sai do módulo de origem", () => {
    expect(aplicarArraste(ESTRUTURA, aula(12), aula(21))).toEqual([
      { id: 1, aulas: [11, 13] },
      { id: 2, aulas: [12, 21] },
    ]);
  });

  it("aula sobre um módulo: vai para o fim dele", () => {
    expect(aplicarArraste(ESTRUTURA, aula(11), modulo(2))).toEqual([
      { id: 1, aulas: [12, 13] },
      { id: 2, aulas: [21, 11] },
    ]);
  });

  it("soltar sobre si mesmo não muda nada", () => {
    expect(aplicarArraste(ESTRUTURA, aula(12), aula(12))).toEqual(ESTRUTURA);
    expect(aplicarArraste(ESTRUTURA, modulo(2), modulo(2))).toEqual(ESTRUTURA);
  });

  it("nenhuma aula some nem se repete", () => {
    const depois = aplicarArraste(ESTRUTURA, aula(12), aula(21)).flatMap((m) => m.aulas).sort();
    expect(depois).toEqual([11, 12, 13, 21]);
  });
});

describe("id do arraste", () => {
  it("vai e volta", () => {
    expect(lerIdDoArraste(idDoArraste({ tipo: "aula", id: 11 }))).toEqual({ tipo: "aula", id: 11 });
    expect(lerIdDoArraste("modulo-3")).toEqual({ tipo: "modulo", id: 3 });
  });

  it("id estranho não vira item", () => {
    expect(lerIdDoArraste("aula-")).toBeNull();
    expect(lerIdDoArraste("curso-1")).toBeNull();
  });
});
