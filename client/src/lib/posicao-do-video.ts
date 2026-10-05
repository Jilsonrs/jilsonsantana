// O PONTO DA AULA (decisão do operador, 05/10/2026): quem sai no meio de um vídeo
// e volta abre no mesmo ponto — pausado se tinha pausado, tocando se saiu tocando.
// Fica no NAVEGADOR da pessoa, por aula: outro aparelho começa do início. Ver até
// o fim apaga o ponto. Sem armazenamento (modo anônimo, bloqueado), só não lembra.

export type PontoDoVideo = { segundos: number; pausado: boolean };

const PREFIXO = "jilson:ponto-da-aula:";
/** Abaixo disto, é o começo: não vale pular. */
const MINIMO = 5;

function guardado(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** O ponto guardado desta aula, ou nada. Dado estranho conta como nada. */
export function lerPonto(chave: string): PontoDoVideo | null {
  try {
    const texto = guardado()?.getItem(PREFIXO + chave);
    if (!texto) return null;
    const dado: unknown = JSON.parse(texto);
    if (typeof dado !== "object" || dado === null) return null;
    // Seguro: a linha acima provou que é um objeto; os dois campos são conferidos abaixo.
    const { segundos, pausado } = dado as { segundos?: unknown; pausado?: unknown };
    return typeof segundos === "number" && Number.isFinite(segundos) && typeof pausado === "boolean" ? { segundos, pausado } : null;
  } catch {
    return null;
  }
}

export function guardarPonto(chave: string, ponto: PontoDoVideo): void {
  try {
    guardado()?.setItem(PREFIXO + chave, JSON.stringify(ponto));
  } catch {
    // Sem espaço ou bloqueado: só não lembra.
  }
}

export function esquecerPonto(chave: string): void {
  try {
    guardado()?.removeItem(PREFIXO + chave);
  } catch {
    // Idem.
  }
}

/**
 * O endereço do player abrindo no ponto: `t` (início, em segundos) e, se estava
 * pausado, `autoplay=false` — parâmetros do embed do Bunny Stream. O token assina só
 * o vídeo e a validade, então o endereço continua válido.
 */
export function enderecoNoPonto(src: string, ponto: PontoDoVideo | null): string {
  if (!ponto) return src;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (ponto.segundos >= MINIMO) url.searchParams.set("t", `${Math.floor(ponto.segundos)}s`);
  if (ponto.pausado) url.searchParams.set("autoplay", "false");
  return url.toString();
}
