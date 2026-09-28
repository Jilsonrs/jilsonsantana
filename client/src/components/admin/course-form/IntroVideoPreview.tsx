import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { BunnyPlayer } from "@/components/content/BunnyPlayer";

// A cada 15 s o admin pergunta se o Bunny terminou; desiste depois de 20 min.
const INTERVALO = 15_000;
const LIMITE = 20 * 60_000;

/**
 * A prévia do vídeo de apresentação no admin, que se atualiza sozinha quando o
 * Bunny termina de processar (pedido do operador, 27/09/2026). Sem isto, o
 * player carregado durante o processamento ficava em "Processing video" até
 * recarregar a página: o player do Bunny não se atualiza por conta própria.
 */
export function IntroVideoPreview({
  videoId,
  embedUrl,
  titulo = "Prévia do vídeo de apresentação",
  consultarEstado = api.getIntroVideoStatus,
}: {
  videoId: string;
  embedUrl: string;
  /** O nome do quadro para o leitor de tela. */
  titulo?: string;
  /** De onde vem o estado: a apresentação ou a aula (Bloco U, etapa 3). */
  consultarEstado?: (videoId: string) => Promise<{ pronto: boolean; falhou: boolean }>;
}) {
  const [inicio] = useState(() => Date.now());
  const estado = useQuery({
    queryKey: ["video-status", titulo, videoId],
    queryFn: () => consultarEstado(videoId),
    refetchInterval: (query) => {
      const dados = query.state.data;
      if (dados?.pronto || dados?.falhou || Date.now() - inicio > LIMITE) return false;
      return INTERVALO;
    },
  });

  const pronto = estado.data?.pronto ?? false;
  const falhou = estado.data?.falhou ?? false;
  const desistiu = !pronto && !falhou && Date.now() - inicio > LIMITE;

  return (
    <div className="space-y-2">
      {/* A `key` muda quando o vídeo fica pronto: o quadro é recarregado, e o
          player do Bunny sai do "Processing video" para o vídeo. */}
      <BunnyPlayer key={`${videoId}-${pronto || desistiu ? "pronto" : "processando"}`} src={embedUrl} title={titulo} />
      {falhou ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          O Bunny não conseguiu processar este vídeo. Envie de novo.
        </p>
      ) : (
        estado.data && !pronto && !desistiu && (
          <p className="text-sm text-muted-foreground">
            O Bunny está processando o vídeo. A prévia atualiza sozinha quando terminar.
          </p>
        )
      )}
    </div>
  );
}
