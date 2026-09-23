import { pt, type Dict } from "./pt.js";

/**
 * O dicionário como lista de pares `caminho → texto`.
 *
 * O caminho é a CHAVE do texto em todo o resto do sistema: é o que a tabela
 * `SiteText` guarda, o que a tela de admin lista e o que o gerador de revisão
 * imprime. Formato: `home.hero.subtitle`, `home.pricing.features[0]`.
 *
 * Vive no `core` porque servidor, teste e script precisam da MESMA função —
 * três cópias divergem, e a que diverge é a que ninguém está olhando.
 */
export function flattenDict(valor: unknown, prefixo = ""): [string, string][] {
  if (Array.isArray(valor)) {
    return valor.flatMap((v, i) => flattenDict(v, `${prefixo}[${i}]`));
  }
  if (valor && typeof valor === "object") {
    return Object.entries(valor).flatMap(([k, v]) =>
      flattenDict(v, prefixo ? `${prefixo}.${k}` : k),
    );
  }
  return [[prefixo, String(valor)]];
}

/**
 * Toda chave que existe no dicionário. É a LISTA BRANCA das sobrescritas: o
 * servidor recusa gravar chave que não esteja aqui, senão a tabela vira
 * lixeira e ninguém descobre — a tela simplesmente ignora a linha órfã.
 */
export const DICT_KEYS: ReadonlySet<string> = new Set(flattenDict(pt).map(([k]) => k));

/**
 * Escreve `valor` no caminho `chave` de um dicionário, no lugar. Entende índice
 * de array (`home.pricing.features[0]`), que é como as listas aparecem no caminho.
 *
 * Silencioso por desenho: caminho que não existe **não cria** estrutura nova.
 * A validação de chave é da rota de escrita (`DICT_KEYS`); aqui, uma chave
 * inválida que tenha escapado não pode inventar um ramo no dicionário.
 */
export function setByPath(dict: Dict, chave: string, valor: string): void {
  const partes = chave.split(".").flatMap((p) => {
    const m = p.match(/^([^[]+)((\[\d+\])*)$/);
    if (!m) return [p];
    const indices = [...m[2].matchAll(/\[(\d+)\]/g)].map((i) => i[1]);
    return [m[1], ...indices];
  });

  // `unknown` + narrowing a cada passo: o dicionário é um objeto tipado, e
  // percorrê-lo por string exige afrouxar o tipo sem usar `any`.
  let alvo: unknown = dict;
  for (const parte of partes.slice(0, -1)) {
    if (alvo === null || typeof alvo !== "object") return;
    alvo = (alvo as Record<string, unknown>)[parte];
  }
  const ultima = partes[partes.length - 1];
  if (alvo === null || typeof alvo !== "object") return;
  const container = alvo as Record<string, unknown>;
  if (typeof container[ultima] !== "string") return;
  container[ultima] = valor;
}
