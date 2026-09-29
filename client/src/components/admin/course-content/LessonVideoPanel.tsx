import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { enviarVideo } from "@/lib/video-upload";
import { codigoDoErro } from "@/lib/course-form";
import { Button } from "@/components/ui/button";
import { LessonVideoSummary } from "./LessonVideoSummary";

/**
 * O VÍDEO de uma aula de vídeo, dentro da aula aberta (Bloco U, etapa 3). Como a
 * Udemy (decisão do operador, 28/09/2026): a miniatura, o nome do arquivo e a
 * duração, o envio e a chave "Prévia grátis" — SEM player. Assistir é na página
 * da aula do aluno (etapa 4).
 *
 * O envio é o mesmo da apresentação (em partes, retomável, direto para o Bunny),
 * e o vídeo só entra na aula quando o envio termina.
 */
export function LessonVideoPanel({ lesson, onChanged }: { lesson: AdminLesson; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [porcentagem, setPorcentagem] = useState(0);

  const envio = useMutation({
    mutationFn: async (arquivo: File) => {
      setPorcentagem(0);
      // O nome do arquivo vira o nome do vídeo no Bunny (operador, 27/09/2026).
      const dados = await api.startLessonVideoUpload(lesson.id, arquivo.name);
      await enviarVideo(arquivo, dados, setPorcentagem).concluido;
      await api.completeLessonVideoUpload(lesson.id, dados.videoId);
    },
    // A aula recarrega com o vídeo novo, e o resumo dele é lido de novo.
    onSuccess: () => {
      onChanged();
      queryClient.invalidateQueries({ queryKey: ["lesson-video", lesson.id] });
    },
  });

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
              if (arquivo) envio.mutate(arquivo);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" disabled={envio.isPending} onClick={() => entrada.current?.click()}>
            {envio.isPending ? `Enviando… ${porcentagem}%` : lesson.bunnyVideoId ? "Trocar o vídeo" : "Enviar vídeo"}
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
