import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import * as api from "@/lib/api";
import { enviarVideo } from "@/lib/video-upload";
import type { CourseFormValues } from "@/lib/course-form";
import { Button } from "@/components/ui/button";

/**
 * O botão "Enviar vídeo" da apresentação do curso (Bloco U, etapa 2). O arquivo
 * vai inteiro, sem recompressão, direto para o Bunny, e retoma se a conexão cair.
 * Só DEPOIS que o envio termina o id entra no curso: um envio abandonado no meio
 * não deixa o curso apontando para um vídeo vazio.
 */
export function IntroVideoUpload({
  courseId,
  aoEnviar,
}: {
  courseId: number;
  aoEnviar: (embedUrl: string) => void;
}) {
  const { setValue } = useFormContext<CourseFormValues>();
  const entrada = useRef<HTMLInputElement>(null);
  const [porcentagem, setPorcentagem] = useState(0);

  const envio = useMutation({
    mutationFn: async (arquivo: File) => {
      setPorcentagem(0);
      const credenciais = await api.startIntroVideoUpload(courseId);
      await enviarVideo(arquivo, credenciais, setPorcentagem).concluido;
      await api.updateCourse(courseId, { introVideoId: credenciais.videoId });
      return credenciais;
    },
    onSuccess: ({ videoId, embedUrl }) => {
      setValue("introVideoId", videoId, { shouldDirty: true });
      aoEnviar(embedUrl);
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
      {envio.isSuccess && (
        <p className="text-sm text-muted-foreground">
          Vídeo enviado. O Bunny pode levar alguns minutos para processar.
        </p>
      )}
    </div>
  );
}
