import { pt, en, setByPath, type Dict, type LanguageCode } from "@jilson/core";
import { prisma } from "./prisma.js";

// ── A ÚNICA porta para o texto do site ──────────────────────────────────────
//
// Nenhum template importa `pt`/`en` direto: todos pedem `getDict(lang)`. Se
// importarem o dicionário, a edição do operador no /admin deixa de aparecer
// naquela tela — sem erro, sem log, sem teste vermelho.
//
//     texto exibido = sobrescrita do banco ?? valor de fábrica do código
//
// O raciocínio, as alternativas pesadas e o gatilho de reabertura estão em
// docs/content.md § 16.

const FABRICA: Record<LanguageCode, Dict> = { pt, en };

/**
 * Cache em memória, limpo ao salvar. Sem ele, a home pública faria uma consulta
 * ao banco a cada visita só para montar texto que quase nunca muda — e o banco
 * dorme por ociosidade (o cold start do Neon já custa ~1,2 s na primeira).
 *
 * LIMITE CONHECIDO: o cache é POR INSTÂNCIA. Hoje o Railway roda uma só, então
 * limpar aqui basta. Com duas instâncias, a que não recebeu o PUT continuaria
 * servindo o texto velho até reiniciar. *Gatilho: quando houver mais de uma
 * instância, a invalidação precisa cruzar instâncias (canal do Postgres ou TTL
 * curto) — não é refatoração, é uma linha a mais no caminho de escrita.*
 */
const cache = new Map<LanguageCode, Dict>();

export function invalidarCacheDeTexto(): void {
  cache.clear();
}

/** O dicionário do idioma, com as sobrescritas do operador já aplicadas. */
export async function getDict(lang: LanguageCode): Promise<Dict> {
  const emCache = cache.get(lang);
  if (emCache) return emCache;

  // Clone profundo: `setByPath` escreve no lugar, e o dicionário de fábrica é
  // um módulo compartilhado — mutá-lo vazaria a edição para o outro idioma e
  // para o próximo processo que importasse `pt`.
  const dict = structuredClone(FABRICA[lang]);

  const sobrescritas = await prisma.siteText.findMany({
    where: { language: lang === "pt" ? "PT" : "EN" },
    select: { key: true, value: true },
  });
  for (const { key, value } of sobrescritas) {
    setByPath(dict, key, value);
  }

  cache.set(lang, dict);
  return dict;
}
