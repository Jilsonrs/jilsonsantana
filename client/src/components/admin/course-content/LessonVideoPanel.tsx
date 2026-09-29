import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { enviarVideo } from "@/lib/video-upload";
import { codigoDoErro } from "@/lib/course-form";
import { Button } from "@/components/ui/button";
import { IntroVideoPreview } from "@/components/admin/course-form/IntroVideoPreview";

/**
 * O VÍDEO de uma aula de vídeo (Bloco U, etapa 3 — plano aprovado pelo operador
 * em 28/09/2026): a prévia, o envio e a chave "Prévia grátis".
 *
 * A prévia vem SEMPRE assinada do servidor (a biblioteca de aulas tem token):
 * este componente não monta endereço nenhum. O envio é o mesmo da apresentação
 * (em partes, retomável, direto para o Bunny), e o vídeo só entra na aula
 * quando o envio termina.
 */
export function LessonVideoPanel({ lesson, onChanged }: { lesson: AdminLesson; onChanged: () => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [porcentagem, setPorcentagem] = useState(0);
  const [recemEnviado, setRecemEnviado] = useState<{ videoId: string; playerUrl: string | null } | null>(null);

  const player = useQuery({
    queryKey: ["lesson-player", lesson.id, lesson.bunnyVideoId],
    queryFn: () => api.getLessonPlayer(lesson.id),
    enabled: lesson.bunnyVideoId !== null && recemEnviado === null,
  });

  const envio = useMutation({
    mutationFn: async (arquivo: File) => {
      setPorcentagem(0);
      // O nome do arquivo vira o nome do vídeo no Bunny (operador, 27/09/2026).
      const dados = await api.startLessonVideoUpload(lesson.id, arquivo.name);
      await enviarVideo(arquivo, dados, setPorcentagem).concluido;
      const concluido = await api.completeLessonVideoUpload(lesson.id, dados.videoId);
      return { videoId: concluido.bunnyVideoId, playerUrl: concluido.playerUrl };
    },
    onSuccess: (video) => {
      setRecemEnviado(video);
      onChanged();
    },
  });

  const previaGratis = useMutation({
    mutationFn: (ligada: boolean) => api.updateLesson(lesson.id, { isFreePreview: ligada }),
    onSuccess: onChanged,
  });

  const videoId = recemEnviado?.videoId ?? lesson.bunnyVideoId;
  const playerUrl = recemEnviado ? recemEnviado.playerUrl : (player.data?.playerUrl ?? null);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      {/* Do tamanho de uma miniatura (pedido do operador, 28/09/2026): aqui é só
          a conferência do vídeo; assistir de verdade é na tela da aula do aluno. */}
      <div className="max-w-sm">
        {videoId && playerUrl ? (
          <IntroVideoPreview
            videoId={videoId}
            embedUrl={playerUrl}
            titulo={`Prévia do vídeo da aula ${lesson.title}`}
            consultarEstado={api.getLessonVideoStatus}
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-border/60 bg-muted p-4 text-center">
            <span className="text-sm text-muted-foreground">
              {videoId
                ? player.isLoading
                  ? "Carregando…"
                  : "Vídeo enviado. A prévia aparece onde a biblioteca de aulas está configurada (no site no ar)."
                : "Sem vídeo"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={entrada}
          type="file"
          accept="video/*"
          className="hidden"
          data-testid={`lesson-video-file-${lesson.id}`}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) envio.mutate(arquivo);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" disabled={envio.isPending} onClick={() => entrada.current?.click()}>
          {envio.isPending ? `Enviando… ${porcentagem}%` : videoId ? "Trocar o vídeo" : "Enviar vídeo"}
        </Button>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={lesson.isFreePreview}
            disabled={previaGratis.isPending}
            onChange={(e) => previaGratis.mutate(e.target.checked)}
            className="h-4 w-4 rounded border-border/60"
          />
          Prévia grátis (toca para qualquer visitante)
        </label>
      </div>

      {envio.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {codigoDoErro(envio.error) === "StreamNaoConfigurado"
            ? "A biblioteca de aulas não está configurada neste ambiente."
            : "Não foi possível enviar o vídeo. Tente de novo."}
        </p>
      )}
      {previaGratis.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível mudar a prévia grátis. Tente de novo.
        </p>
      )}
    </div>
  );
}
