import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { codigoDoErro } from "@/lib/course-form";

// A cada 15 s pergunta se o Bunny terminou; desiste depois de 20 min (a mesma
// regra da prévia da apresentação).
const INTERVALO = 15_000;
const LIMITE = 20 * 60_000;

/** "1:51", "12:05", "1:02:03": a duração do vídeo, como a Udemy mostra. */
export function duracaoLegivel(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = String(segundos % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const CAIXA = "flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted text-center";

/**
 * A miniatura, o nome do arquivo e a duração do vídeo da aula — o que a Udemy
 * mostra no editor, SEM player (decisão do operador, 28/09/2026: assistir é na
 * página da aula do aluno). Recebe a `key` do vídeo: um vídeo novo recomeça a
 * contagem dos 20 min.
 */
export function LessonVideoSummary({ lessonId, videoId }: { lessonId: number; videoId: string | null }) {
  const [inicio] = useState(() => Date.now());
  const resumo = useQuery({
    queryKey: ["lesson-video", lessonId, videoId],
    queryFn: () => api.getLessonVideo(lessonId),
    enabled: videoId !== null,
    refetchInterval: (query) => {
      const video = query.state.data?.video;
      if (!video || video.pronto || video.falhou || Date.now() - inicio > LIMITE) return false;
      return INTERVALO;
    },
  });
  const video = resumo.data?.video ?? null;

  let quadro = "Sem vídeo";
  if (videoId && resumo.isLoading) quadro = "Carregando…";
  else if (video && !video.pronto && !video.falhou) quadro = "Processando…";
  else if (video?.pronto && !video.miniaturaUrl) quadro = "Sem miniatura";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
      <div className="w-32 shrink-0">
        {video?.pronto && video.miniaturaUrl ? (
          // A mesma política do player (bunny.md §7): com o bloqueio de acesso
          // direto, o Bunny só entrega a quem vem do domínio da escola.
          <img
            src={video.miniaturaUrl}
            alt={`Miniatura do vídeo${video.nome ? ` ${video.nome}` : ""}`}
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full rounded-lg border border-border/60 object-cover"
          />
        ) : (
          <div className={CAIXA}>
            <span className="px-1 text-xs text-muted-foreground">{quadro}</span>
          </div>
        )}
      </div>
      {video && (
        <div className="min-w-0 space-y-1">
          {video.nome && <p className="truncate text-sm font-medium">{video.nome}</p>}
          {video.duracaoEmSegundos !== null && <p className="text-sm text-muted-foreground">{duracaoLegivel(video.duracaoEmSegundos)}</p>}
        </div>
      )}
      {video?.falhou && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          O Bunny não conseguiu processar este vídeo. Envie de novo.
        </p>
      )}
      {resumo.isError && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          {codigoDoErro(resumo.error) === "StreamNaoConfigurado"
            ? "A biblioteca de aulas não está configurada neste ambiente."
            : "Não foi possível ler o vídeo no Bunny."}
        </p>
      )}
    </div>
  );
}
