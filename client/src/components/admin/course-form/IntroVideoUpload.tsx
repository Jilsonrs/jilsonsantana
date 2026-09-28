import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import * as api from "@/lib/api";
import { enviarVideo } from "@/lib/video-upload";
import type { CourseFormValues } from "@/lib/course-form";
import { Button } from "@/components/ui/button";

/**
 * O botão "Enviar vídeo" da apresentação do curso (Bloco U, etapa 2). O arquivo
 * vai inteiro, sem recompressão, direto para o Bunny, e retoma se a conexão cair.
 * Só DEPOIS que o envio termina o id entra no curso: um envio abandonado no meio
 * não deixa o curso apontando para um vídeo vazio. Ao reenviar, o servidor apaga
 * no Bunny o envio incompleto e, no fim, o vídeo substituído (operador, 27/09).
 */
export function IntroVideoUpload({
  courseId,
  aoEnviar,
}: {
  courseId: number;
  aoEnviar: (video: { videoId: string; embedUrl: string }) => void;
}) {
  const { setValue } = useFormContext<CourseFormValues>();
  const queryClient = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [porcentagem, setPorcentagem] = useState(0);

  const envio = useMutation({
    mutationFn: async (arquivo: File) => {
      setPorcentagem(0);
      // O nome do arquivo vira o nome do vídeo no Bunny (operador, 27/09/2026).
      const credenciais = await api.startIntroVideoUpload(courseId, arquivo.name);
      await enviarVideo(arquivo, credenciais, setPorcentagem).concluido;
      const concluido = await api.completeIntroVideoUpload(courseId, credenciais.videoId);
      return { videoId: concluido.introVideoId, embedUrl: concluido.introVideoEmbedUrl ?? credenciais.embedUrl };
    },
    // O servidor já gravou o vídeo no curso: o curso recarrega para o ✓ do passo
    // (sem reiniciar o formulário do editor).
    onSuccess: (video) => {
      setValue("introVideoId", video.videoId, { shouldDirty: true });
      aoEnviar(video);
      queryClient.invalidateQueries({ queryKey: ["admin-course", courseId] });
    },
  });

  return (
    <div className="space-y-2">
      <input
        ref={entrada}
        type="file"
        accept="video/*"
        className="hidden"
        data-testid="intro-video-file"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) envio.mutate(arquivo);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" disabled={envio.isPending} onClick={() => entrada.current?.click()}>
        {envio.isPending ? `Enviando… ${porcentagem}%` : "Enviar vídeo"}
      </Button>
      {envio.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível enviar o vídeo. Tente de novo.
        </p>
      )}
    </div>
  );
}
