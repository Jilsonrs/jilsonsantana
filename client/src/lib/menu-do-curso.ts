import { useSyncExternalStore } from "react";

// O MENU DO CURSO na página da aula, aberto ou fechado (decisão do operador,
// 03/10/2026: fechou, continua fechado nas próximas aulas, até a pessoa reabrir).
// Fica no navegador de cada pessoa, e não no endereço: assim o link de uma aula
// compartilhada abre com o menu normal. Se o navegador não guardar (armazenamento
// bloqueado), vale só nesta visita, e o menu abre normalmente na próxima.

const CHAVE = "jilsonsantana:menu-do-curso-fechado";
const ouvintes = new Set<() => void>();
let semArmazenamento = false;

function estaFechado(): boolean {
  try {
    return window.localStorage.getItem(CHAVE) === "1";
  } catch {
    return semArmazenamento;
  }
}

export function definirMenuDoCursoFechado(fechado: boolean): void {
  semArmazenamento = fechado;
  try {
    if (fechado) window.localStorage.setItem(CHAVE, "1");
    else window.localStorage.removeItem(CHAVE);
  } catch {
    // Sem armazenamento: o valor acima vale até a página recarregar.
  }
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void): () => void {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

/** O menu do curso está fechado? E a função que abre ou fecha. */
export function useMenuDoCursoFechado(): [boolean, (fechado: boolean) => void] {
  return [useSyncExternalStore(assinar, estaFechado, () => false), definirMenuDoCursoFechado];
}
