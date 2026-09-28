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
