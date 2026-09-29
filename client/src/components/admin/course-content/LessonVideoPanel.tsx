import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { enviarVideoDaAula, useEnvioDeVideo } from "@/lib/envios-de-video";
import { Button } from "@/components/ui/button";
import { LessonVideoSummary } from "./LessonVideoSummary";

/**
 * O VÍDEO de uma aula de vídeo, dentro da aula aberta (Bloco U, etapa 3). Como a
 * Udemy (decisão do operador, 28/09/2026): a miniatura, o nome do arquivo e a
 * duração, o envio e a chave "Prévia grátis" — SEM player. Assistir é na página
 * da aula do aluno (etapa 4).
 *
 * O envio é o mesmo da apresentação (em partes, retomável, direto para o Bunny),
 * e o vídeo só entra na aula quando o envio termina. O estado dele mora em
 * `lib/envios-de-video.ts`, fora do componente: recolher a aula ou trocar de
 * passo no meio não interrompe nem esconde a porcentagem (operador, 29/09/2026).
 */
export function LessonVideoPanel({ lesson, onChanged }: { lesson: AdminLesson; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const envio = useEnvioDeVideo(lesson.id);
  const enviando = envio?.tipo === "enviando";

  // Continua valendo mesmo que esta tela já tenha saído: a aula recarrega com o
  // vídeo novo, e o resumo dele é lido de novo.
  function enviar(arquivo: File) {
    void enviarVideoDaAula(lesson.id, arquivo).then((entrou) => {
      if (!entrou) return;
      onChanged();
      queryClient.invalidateQueries({ queryKey: ["lesson-video", lesson.id] });
    });
  }

  const previaGratis = useMutation({
    mutationFn: (ligada: boolean) => api.updateLesson(lesson.id, { isFreePreview: ligada }),
    onSuccess: onChanged,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        <LessonVideoSummary key={lesson.bunnyVideoId ?? "sem-video"} lessonId={lesson.id} videoId={lesson.bunnyVideoId} />
        <div className="ml-auto flex flex-col items-end gap-3">
          <input
            ref={entrada}
            type="file"
            accept="video/*"
            className="hidden"
            data-testid={`lesson-video-file-${lesson.id}`}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviar(arquivo);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" disabled={enviando} onClick={() => entrada.current?.click()}>
            {envio?.tipo === "enviando"
              ? `Enviando… ${envio.porcentagem}%`
              : lesson.bunnyVideoId
                ? "Trocar o vídeo"
                : "Enviar vídeo"}
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
      </div>

      {envio?.tipo === "falhou" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {envio.codigo === "StreamNaoConfigurado"
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
