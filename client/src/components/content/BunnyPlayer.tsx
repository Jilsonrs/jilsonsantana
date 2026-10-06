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

/** De quantos em quantos segundos o ponto é guardado enquanto o vídeo toca. */
const PASSO_DO_PONTO = 2;

export function BunnyPlayer({
  src,
  title,
  aoConcluir,
  aoTerminar,
  lembrarComo,
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
  // As funções mais recentes, sem voltar a ouvir o player a cada desenho da tela.
  const aoConcluirRef = useRef(aoConcluir);
  aoConcluirRef.current = aoConcluir;
  const aoTerminarRef = useRef(aoTerminar);
  aoTerminarRef.current = aoTerminar;
  const ouvir = aoConcluir !== undefined || aoTerminar !== undefined || chave !== undefined;

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
