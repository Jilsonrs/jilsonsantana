import type { LucideIcon } from "lucide-react";
import { AVAILABLE_ICONS, ICONS } from "../content/icon-registry";
import { desenhoDoLucide } from "../content/todos-os-icones";
import { NOME_DO_ICONE, SINONIMOS_DO_ICONE } from "./nomes-dos-icones";

// O CATÁLOGO do seletor de ícones dos Destaques: os 55 de sempre + todos os do
// Lucide (pedido do operador, 05/10/2026). Este arquivo carrega TODOS os
// desenhos, então só entra pelo `lazy()` do seletor — nunca importe direto de
// uma tela do aluno (HighlightIcon.tsx é o caminho do aluno).

/**
 * Nomes do Lucide que são o MESMO desenho de um dos 55 antigos. Ficam fora da
 * lista para o ícone não aparecer duas vezes; o curso grava o nome antigo.
 */
export const REPETIDOS_DO_REGISTRO: Record<string, string> = {
  layers: "stack-2",
  zap: "bolt",
  "wand-sparkles": "wand",
  "bar-chart-3": "bar-chart",
  "circle-check": "check-circle",
};

/** Quantos resultados a lista mostra de uma vez. */
export const LIMITE_DE_RESULTADOS = 60;

export type IconeDoCatalogo = { token: string; nome: string; Icone: LucideIcon; busca: string };

/** Minúsculas, sem acento e sem hífen: "Construção" e "construcao" se encontram. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/-/g, " ");
}

/** O desenho de um nome gravado; os 55 antigos ganham do Lucide (ver icon-registry.ts). */
export function desenhoDoIcone(token: string): LucideIcon | null {
  if (Object.prototype.hasOwnProperty.call(ICONS, token)) return ICONS[token];
  return desenhoDoLucide(token);
}

function item(token: string): IconeDoCatalogo | null {
  const Icone = desenhoDoIcone(token);
  const nome = NOME_DO_ICONE[token];
  if (!Icone || !nome) return null;
  return { token, nome, Icone, busca: normalizar(`${nome} ${SINONIMOS_DO_ICONE[token] ?? ""} ${token}`) };
}

const porNome = (a: IconeDoCatalogo, b: IconeDoCatalogo) => a.nome.localeCompare(b.nome, "pt");

export const CATALOGO: IconeDoCatalogo[] = Object.keys(NOME_DO_ICONE)
  .filter((token) => !Object.prototype.hasOwnProperty.call(REPETIDOS_DO_REGISTRO, token))
  .map(item)
  .filter((i): i is IconeDoCatalogo => i !== null)
  .sort(porNome);

/** Com a busca vazia: os 55 de sempre, pelo nome. */
export const SUGERIDOS: IconeDoCatalogo[] = CATALOGO.filter((i) => AVAILABLE_ICONS.includes(i.token));

/**
 * Cada palavra digitada tem que aparecer no nome, num sinônimo ou no nome em
 * inglês. Primeiro os que COMEÇAM com a busca, depois os que a têm no nome,
 * depois os achados só por sinônimo ou pelo inglês.
 */
export function buscarIcones(texto: string): IconeDoCatalogo[] {
  const consulta = normalizar(texto).trim().replace(/\s+/g, " ");
  if (!consulta) return SUGERIDOS;
  const palavras = consulta.split(" ");
  const nota = (i: IconeDoCatalogo) => {
    const nome = normalizar(i.nome);
    return nome.startsWith(consulta) ? 0 : nome.includes(consulta) ? 1 : 2;
  };
  return CATALOGO.filter((i) => palavras.every((p) => i.busca.includes(p))).sort(
    (a, b) => nota(a) - nota(b) || porNome(a, b),
  );
}
