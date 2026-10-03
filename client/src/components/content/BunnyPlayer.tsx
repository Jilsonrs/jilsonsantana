import { useEffect, useRef } from "react";
import { ouvirConclusao } from "@/lib/player-do-bunny";

/**
 * O player do Bunny Stream, num quadro 16:9. O endereço vem SEMPRE do servidor
 * (derivado lá, nunca montado aqui), então este componente não conhece chave,
 * biblioteca nem token.
 *
 * `referrerPolicy="strict-origin-when-cross-origin"` é exigência do Bunny: com
 * "Block Direct URL File Access" ligado na biblioteca, uma política mais estrita
 * no site faz o Bunny ler o acesso como direto e recusar o vídeo (bunny.md §7).
 */
export function BunnyPlayer({
  src,
  title,
  aoConcluir,
}: {
  src: string;
  title: string;
  /**
   * Chamado UMA vez quando o aluno chega a 90% do vídeo (Fase 5, decisão do
   * operador de 03/10/2026). Sem ele, o player não é ouvido (o vídeo de apresentação).
   */
  aoConcluir?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // A função mais recente, sem voltar a ouvir o player a cada desenho da tela.
  const aoConcluirRef = useRef(aoConcluir);
  aoConcluirRef.current = aoConcluir;
  const ouvir = aoConcluir !== undefined;

  // Efeito: ouvir o player é conversar com o iframe do Bunny, fora do React.
  useEffect(() => {
    if (!ouvir || !iframeRef.current) return;
    return ouvirConclusao(iframeRef.current, () => aoConcluirRef.current?.());
  }, [src, ouvir]);

  return (
    <div className="aspect-video w-full overflow-hidden bg-muted">
      <iframe
        ref={iframeRef}
        src={src}
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
