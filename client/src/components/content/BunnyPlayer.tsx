import { useEffect, useRef, useState } from "react";
import { ouvirPlayer } from "@/lib/player-do-bunny";
import { enderecoNoPonto, esquecerPonto, guardarPonto, lerPonto } from "@/lib/posicao-do-video";

/**
 * O player do Bunny Stream, num quadro 16:9. O endereço vem SEMPRE do servidor
 * (derivado lá, nunca montado aqui), então este componente não conhece chave,
 * biblioteca nem token. A tela só acrescenta onde começar (`posicao-do-video.ts`).
 *
 * `referrerPolicy="strict-origin-when-cross-origin"` é exigência do Bunny: com
 * "Block Direct URL File Access" ligado na biblioteca, uma política mais estrita
 * no site faz o Bunny ler o acesso como direto e recusar o vídeo (bunny.md §7).
 */
/** O vídeo do endereço, sem o token e a validade, que mudam a cada resposta do servidor. */
function videoDoEndereco(src: string): string {
  return src.split("?")[0];
}

/** O id do vídeo no Bunny: o último pedaço do caminho do endereço. */
function idDoVideo(src: string): string {
  return videoDoEndereco(src).split("/").pop() ?? "";
}

/**
 * O ENDEREÇO VENCIDO (decisão do operador, 06/10/2026: "se expirar, recarrega a
 * aula"). O endereço assinado vale 24 h (`expires`, em segundos); a doc do Bunny diz
 * que abrir o player com ele vencido dá 403. Uma aba aberta de um dia para o outro
 * ficaria com ele: então, um pouco antes de vencer — ou se a pessoa der play num
 * vencido —, a aula pede um endereço novo ao servidor e o player recarrega no
 * mesmo ponto.
 */
const FOLGA_DO_VENCIMENTO = 10 * 60;

/** Quando o endereço vence (segundos), ou `null` se ele não disser. */
function vencimento(endereco: string): number | null {
  try {
    const expira = Number(new URL(endereco).searchParams.get("expires"));
    return Number.isFinite(expira) && expira > 0 ? expira : null;
  } catch {
    return null;
  }
}

/** O endereço já venceu (ou vence nos próximos minutos)? Sem `expires`, nunca. */
function venceu(endereco: string, agora = Date.now()): boolean {
  const expira = vencimento(endereco);
  return expira !== null && agora / 1000 >= expira - FOLGA_DO_VENCIMENTO;
}

/** Depois de pedir um endereço novo, quanto esperar antes de pedir outra vez (se o primeiro pedido falhou). */
const INTERVALO_ENTRE_PEDIDOS = 30_000;

/** De quantos em quantos segundos o ponto é guardado enquanto o vídeo toca. */
const PASSO_DO_PONTO = 2;

export function BunnyPlayer({
  src,
  title,
  aoConcluir,
  aoTerminar,
  lembrarComo,
  aoVencer,
}: {
  src: string;
  title: string;
  /**
   * Chamado UMA vez quando o aluno chega a 90% do vídeo (Fase 5, decisão do
   * operador de 03/10/2026).
   */
  aoConcluir?: () => void;
  /** O vídeo terminou: a página da aula abre a próxima (operador, 05/10/2026). */
  aoTerminar?: () => void;
  /**
   * Lembrar o ponto deste vídeo com este nome (a aula): quem sai e volta abre
   * onde parou, pausado se tinha pausado (operador, 05/10/2026). Sem ele (o vídeo
   * de apresentação), nada é lembrado.
   */
  lembrarComo?: string;
  /**
   * O endereço está vencendo: peça um novo ao servidor (06/10/2026). Quando ele
   * chegar no `src`, o player troca, no mesmo ponto. Sem ele, nada é renovado.
   */
  aoVencer?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // O ENDEREÇO FICA enquanto o vídeo for o mesmo (operador, 03/10/2026: trocar de
  // aba não pode recomeçar o vídeo). O servidor assina de novo a cada busca, com
  // token e validade novos; trocar o `src` recarregaria o player do zero, tocando
  // o que estava pausado. Só um vídeo DIFERENTE troca o endereço — e é nessa
  // hora, uma vez, que o ponto guardado entra.
  // O ponto é da AULA com ESTE vídeo (06/10/2026): se o operador troca o vídeo da
  // aula, o ponto do vídeo antigo não vale — num vídeo mais curto, ele cairia depois
  // do fim, e a aula pularia direto para a próxima.
  const chave = lembrarComo ? `${lembrarComo}:${idDoVideo(src)}` : undefined;
  const noPonto = (endereco: string) => (chave ? enderecoNoPonto(endereco, lerPonto(chave)) : endereco);
  const [endereco, setEndereco] = useState(() => noPonto(src));
  if (videoDoEndereco(src) !== videoDoEndereco(endereco)) setEndereco(noPonto(src));
  // O MESMO vídeo só troca de endereço quando o que está no player venceu e o
  // servidor mandou um que vale: recarrega no ponto guardado.
  else if (venceu(endereco) && !venceu(src)) setEndereco(noPonto(src));
  // As funções mais recentes, sem voltar a ouvir o player a cada desenho da tela.
  const aoConcluirRef = useRef(aoConcluir);
  aoConcluirRef.current = aoConcluir;
  const aoTerminarRef = useRef(aoTerminar);
  aoTerminarRef.current = aoTerminar;
  const aoVencerRef = useRef(aoVencer);
  aoVencerRef.current = aoVencer;
  const renova = aoVencer !== undefined;
  // Um pedido por vez: o play avisa várias vezes por segundo, e cada pedido novo
  // cancelaria o anterior antes de ele chegar.
  const ultimoPedido = useRef(0);
  const pedirEnderecoNovo = () => {
    if (Date.now() - ultimoPedido.current < INTERVALO_ENTRE_PEDIDOS) return;
    ultimoPedido.current = Date.now();
    aoVencerRef.current?.();
  };
  const pedirRef = useRef(pedirEnderecoNovo);
  pedirRef.current = pedirEnderecoNovo;

  // Efeito: o relógio até o endereço vencer é do navegador, fora do React.
  useEffect(() => {
    const expira = vencimento(endereco);
    if (!renova || expira === null) return;
    const espera = Math.max(0, (expira - FOLGA_DO_VENCIMENTO) * 1000 - Date.now());
    // O `setTimeout` não aceita mais que ~24,8 dias; o endereço vale 24 h.
    const relogio = window.setTimeout(() => pedirRef.current(), Math.min(espera, 2 ** 31 - 1));
    return () => window.clearTimeout(relogio);
  }, [endereco, renova]);
  const ouvir = aoConcluir !== undefined || aoTerminar !== undefined || chave !== undefined || renova;

  // Efeito: ouvir o player é conversar com o iframe do Bunny, fora do React.
  useEffect(() => {
    if (!ouvir || !iframeRef.current) return;
    let ultimo: { segundos: number; pausado: boolean } | null = null;
    // Depois do fim, nenhum ponto volta a ser guardado (um último aviso de tempo
    // chegando atrasado guardaria o fim, e a aula reabriria no fim).
    let terminou = false;
    return ouvirPlayer(iframeRef.current, {
      aoConcluir: () => aoConcluirRef.current?.(),
      aoTerminar: () => {
        // Viu até o fim: na próxima vez, a aula começa do início.
        terminou = true;
        if (chave) esquecerPonto(chave);
        aoTerminarRef.current?.();
      },
      aoMudar: (estado) => {
        // Play num endereço vencido (o relógio pode atrasar com a aba em segundo plano).
        if (!estado.pausado && venceu(endereco)) pedirRef.current();
        if (!chave || terminou) return;
        const mudou = !ultimo || ultimo.pausado !== estado.pausado || Math.abs(ultimo.segundos - estado.segundos) >= PASSO_DO_PONTO;
        if (!mudou) return;
        ultimo = estado;
        guardarPonto(chave, estado);
      },
    });
  }, [endereco, ouvir, chave]);

  return (
    <div className="aspect-video w-full overflow-hidden bg-muted">
      <iframe
        ref={iframeRef}
        src={endereco}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="h-full w-full border-0"
      />
    </div>
  );
}
