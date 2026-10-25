import { useEffect, useRef } from "react";
import { PONTO_COMECO } from "@jilson/core";

// O ENDEREÇO DO PLAYER do Bunny Stream: o que a tela acrescenta ao endereço ASSINADO que
// vem do servidor (nunca montado aqui: a tela não conhece chave, biblioteca nem token), e
// quando ele vence. Funções puras, usadas pelo `BunnyPlayer` (saíram dele em 07/10/2026,
// Bloco AULA, etapa 6, quando o componente passou do limite de ~200 linhas).

/** O vídeo do endereço, sem o token e a validade, que mudam a cada resposta do servidor. */
export function videoDoEndereco(src: string): string {
  return src.split("?")[0];
}

/**
 * O endereço do player com o que a TELA acrescenta ao endereço assinado (parâmetros de embed do
 * Bunny Player, fora do token — doc do Bunny):
 * - `t=<segundos>s`: abrir no ponto. Antes do começo útil, ou sem ponto, sem `t`;
 * - `captions=<idioma>` ou `captions=off`: a legenda que a CONTA do aluno escolheu (Bloco AULA,
 *   etapa 6, 07/10/2026). Vence a memória do próprio player no aparelho (medido, `bunny.md`). Sem
 *   ela (visitante), o player decide;
 * - `lang=<idioma>`: o idioma dos botões do player — a escola manda sempre `pt` (12/10/2026).
 */
export function enderecoDoPlayer(
  src: string,
  { comecarEm, legenda, idioma }: { comecarEm: number | null; legenda: string | null; idioma: string | null },
): string {
  const comPonto = comecarEm !== null && comecarEm >= PONTO_COMECO;
  if (!comPonto && !legenda && !idioma) return src;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (comPonto) url.searchParams.set("t", `${Math.floor(comecarEm)}s`);
  if (legenda) url.searchParams.set("captions", legenda);
  if (idioma) url.searchParams.set("lang", idioma);
  return url.toString();
}

/**
 * O ENDEREÇO VENCIDO (decisão do operador, 06/10/2026: "se expirar, recarrega a
 * aula"). O endereço assinado vale 24 h (`expires`, em segundos); a doc do Bunny diz
 * que abrir o player com ele vencido dá 403. Uma aba aberta de um dia para o outro
 * ficaria com ele: então, um pouco antes de vencer — ou se a pessoa der play num
 * vencido —, a aula pede um endereço novo ao servidor e o player recarrega no
 * mesmo ponto.
 */
export const FOLGA_DO_VENCIMENTO = 10 * 60;

/** Quando o endereço vence (segundos), ou `null` se ele não disser. */
export function vencimento(endereco: string): number | null {
  try {
    const expira = Number(new URL(endereco).searchParams.get("expires"));
    return Number.isFinite(expira) && expira > 0 ? expira : null;
  } catch {
    return null;
  }
}

/** O endereço já venceu (ou vence nos próximos minutos)? Sem `expires`, nunca. */
export function venceu(endereco: string, agora = Date.now()): boolean {
  const expira = vencimento(endereco);
  return expira !== null && agora / 1000 >= expira - FOLGA_DO_VENCIMENTO;
}

/** Depois de pedir um endereço novo, quanto esperar antes de pedir outra vez (se o primeiro pedido falhou). */
const INTERVALO_ENTRE_PEDIDOS = 30_000;

/**
 * O RELÓGIO DO VENCIMENTO (saiu do `BunnyPlayer` em 25/10/2026, quando ele chegou ao limite
 * de ~200 linhas — sem mudar o que faz): pede um endereço novo ao servidor um pouco antes de
 * o atual vencer, e devolve o pedido para quem também precisa dele (o play num endereço
 * vencido — o relógio pode atrasar com a aba em segundo plano). Um pedido por vez: o play
 * avisa várias vezes por segundo, e cada pedido novo cancelaria o anterior antes de ele
 * chegar. Sem `aoVencer`, nada é renovado.
 */
export function useRenovarNoVencimento(endereco: string, aoVencer: (() => void) | undefined): () => void {
  const aoVencerRef = useRef(aoVencer);
  aoVencerRef.current = aoVencer;
  const ultimoPedido = useRef(0);
  const pedir = useRef(() => {
    if (Date.now() - ultimoPedido.current < INTERVALO_ENTRE_PEDIDOS) return;
    ultimoPedido.current = Date.now();
    aoVencerRef.current?.();
  }).current;
  const renova = aoVencer !== undefined;

  // Efeito: o relógio até o endereço vencer é do navegador, fora do React.
  useEffect(() => {
    const expira = vencimento(endereco);
    if (!renova || expira === null) return;
    const espera = Math.max(0, (expira - FOLGA_DO_VENCIMENTO) * 1000 - Date.now());
    // O `setTimeout` não aceita mais que ~24,8 dias; o endereço vale 24 h.
    const relogio = window.setTimeout(pedir, Math.min(espera, 2 ** 31 - 1));
    return () => window.clearTimeout(relogio);
  }, [endereco, renova, pedir]);

  return pedir;
}
