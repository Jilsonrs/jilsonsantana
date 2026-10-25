import { pt, setByPath, type Dict } from "@jilson/core";
import { prisma } from "./prisma.js";

// ── A ÚNICA porta para o texto do site ──────────────────────────────────────
//
// Nenhum template importa o dicionário direto: todos pedem `getDict()`. Se
// importarem o dicionário, a edição do operador no /admin deixa de aparecer
// naquela tela — sem erro, sem log, sem teste vermelho.
//
//     texto exibido = sobrescrita do banco ?? valor de fábrica do código
//
// O raciocínio, as alternativas pesadas e o gatilho de reabertura estão em
// docs/content.md § 16.

/**
 * Cache em memória, limpo ao salvar. Sem ele, a home pública faria uma consulta
 * ao banco a cada visita só para montar texto que quase nunca muda — e o banco
 * dorme por ociosidade (o cold start do Neon já custa ~1,2 s na primeira).
 *
 * O cache é POR CÓPIA do servidor, e o Cloud Run tem até 3 (25/10/2026): a cópia que
 * recebeu a edição limpa o dela na hora; as OUTRAS releem o banco quando o cache passa
 * de 1 minuto (`VALIDADE_DO_CACHE_DE_TEXTO`). O operador, no Admin → Textos, vê a
 * edição em todas as cópias em até 1 minuto (plano aprovado por ele no mesmo dia).
 * *Gatilho para trocar por aviso entre cópias (canal do Postgres): o minuto de espera
 * atrapalhar de verdade.*
 */
export const VALIDADE_DO_CACHE_DE_TEXTO = 60_000;
let cache: { dict: Dict; lidoEm: number } | null = null;

export function invalidarCacheDeTexto(): void {
  cache = null;
}

/** O dicionário, com as sobrescritas do operador já aplicadas. */
export async function getDict(): Promise<Dict> {
  if (cache && Date.now() - cache.lidoEm < VALIDADE_DO_CACHE_DE_TEXTO) return cache.dict;

  // Clone profundo: `setByPath` escreve no lugar, e o dicionário de fábrica é
  // um módulo compartilhado — mutá-lo vazaria a edição para o próximo que
  // importasse `pt`.
  const dict = structuredClone(pt);

  const sobrescritas = await prisma.siteText.findMany({ select: { key: true, value: true } });
  for (const { key, value } of sobrescritas) {
    setByPath(dict, key, value);
  }

  cache = { dict, lidoEm: Date.now() };
  return dict;
}
