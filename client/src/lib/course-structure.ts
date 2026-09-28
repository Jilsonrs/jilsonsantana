import type { CourseStructureInput } from "@jilson/core";
import type { AdminModule } from "@/lib/api";

// A ORDEM DO CURSO como dado: a lista de módulos, cada um com as suas aulas. As
// setas, o "+" e o arrastar calculam a ordem nova AQUI (funções puras, com teste)
// e mandam a lista inteira numa gravação só (`PUT /admin/courses/:id/estrutura`).

export type Estrutura = CourseStructureInput["modulos"];

/** A ordem que está gravada, lida da árvore do curso. */
export function estruturaDe(modulos: AdminModule[]): Estrutura {
  return modulos.map((m) => ({ id: m.id, aulas: m.lessons.map((l) => l.id) }));
}

function trocar<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length) return lista;
  const nova = [...lista];
  const [item] = nova.splice(de, 1);
  nova.splice(para, 0, item);
  return nova;
}

/** Sobe (-1) ou desce (+1) um módulo. Na ponta, não muda nada. */
export function moverModulo(estrutura: Estrutura, indice: number, passo: -1 | 1): Estrutura {
  return trocar(estrutura, indice, indice + passo);
}

/** Sobe (-1) ou desce (+1) uma aula dentro do módulo dela. Na ponta, não muda nada. */
export function moverAula(estrutura: Estrutura, moduloId: number, indice: number, passo: -1 | 1): Estrutura {
  return estrutura.map((m) => (m.id === moduloId ? { ...m, aulas: trocar(m.aulas, indice, indice + passo) } : m));
}

// ── Arrastar (Bloco E, etapa 2 — dnd-kit liberado pelo operador em 28/09/2026) ──
// Cada item arrastável tem um id de texto com o tipo na frente: "modulo-3",
// "aula-11". É isso que deixa uma lista só de alvos misturar módulos e aulas.

export type ItemArrastavel = { tipo: "modulo" | "aula"; id: number };

export function idDoArraste(item: ItemArrastavel): string {
  return `${item.tipo}-${item.id}`;
}

export function lerIdDoArraste(id: string | number): ItemArrastavel | null {
  const achado = /^(modulo|aula)-(\d+)$/.exec(String(id));
  // Seguro: a expressão acima só casa com "modulo" ou "aula".
  return achado ? { tipo: achado[1] as ItemArrastavel["tipo"], id: Number(achado[2]) } : null;
}

function moduloDaAula(estrutura: Estrutura, aulaId: number): number | undefined {
  return estrutura.find((m) => m.aulas.includes(aulaId))?.id;
}

/**
 * A ordem nova depois de soltar `ativo` sobre `alvo`:
 * - módulo sobre módulo (ou sobre uma aula dele): o módulo vai para aquele lugar;
 * - aula sobre aula: a aula vai para o lugar da outra, MESMO em outro módulo
 *   do curso;
 * - aula sobre um módulo (vazio, ou fora das aulas): vai para o fim dele.
 * Soltar sobre si mesmo não muda nada.
 */
export function aplicarArraste(estrutura: Estrutura, ativo: ItemArrastavel, alvo: ItemArrastavel): Estrutura {
  if (ativo.tipo === "modulo") {
    const destinoId = alvo.tipo === "modulo" ? alvo.id : moduloDaAula(estrutura, alvo.id);
    const de = estrutura.findIndex((m) => m.id === ativo.id);
    const para = estrutura.findIndex((m) => m.id === destinoId);
    return de < 0 || para < 0 ? estrutura : trocar(estrutura, de, para);
  }

  const origemId = moduloDaAula(estrutura, ativo.id);
  const destinoId = alvo.tipo === "modulo" ? alvo.id : moduloDaAula(estrutura, alvo.id);
  if (origemId === undefined || destinoId === undefined || (alvo.tipo === "aula" && alvo.id === ativo.id)) {
    return estrutura;
  }

  if (origemId === destinoId && alvo.tipo === "aula") {
    const aulas = estrutura.find((m) => m.id === origemId)?.aulas ?? [];
    return moverDentro(estrutura, origemId, aulas.indexOf(ativo.id), aulas.indexOf(alvo.id));
  }

  return estrutura.map((m) => {
    const semAtiva = m.aulas.filter((a) => a !== ativo.id);
    if (m.id !== destinoId) return { ...m, aulas: semAtiva };
    const lugar = alvo.tipo === "aula" ? semAtiva.indexOf(alvo.id) : semAtiva.length;
    return { ...m, aulas: [...semAtiva.slice(0, lugar), ativo.id, ...semAtiva.slice(lugar)] };
  });
}

function moverDentro(estrutura: Estrutura, moduloId: number, de: number, para: number): Estrutura {
  return estrutura.map((m) => (m.id === moduloId ? { ...m, aulas: trocar(m.aulas, de, para) } : m));
}
