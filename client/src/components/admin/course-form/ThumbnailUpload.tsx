import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import * as api from "@/lib/api";
import type { CourseFormValues } from "@/lib/course-form";
import { Button } from "@/components/ui/button";

// WebP é o padrão; JPG e PNG entram sem conversão (decisão do operador,
// 27/09/2026). O servidor confere o conteúdo de novo — isto aqui só poupa o
// envio de um arquivo que seria recusado.
const TIPOS = ["image/webp", "image/jpeg", "image/png"];
const LIMITE = 5 * 1024 * 1024;

/** O botão "Enviar imagem": manda a capa para o Bunny e põe o endereço no campo. */
export function ThumbnailUpload({ courseId }: { courseId: number }) {
  const { setValue } = useFormContext<CourseFormValues>();
  const queryClient = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);

  const envio = useMutation({
    mutationFn: (arquivo: File) => {
      if (!TIPOS.includes(arquivo.type) || arquivo.size > LIMITE) {
        return Promise.reject(new Error("ArquivoRecusado"));
      }
      return api.uploadCourseThumbnail(courseId, arquivo);
    },
    // O servidor já gravou no curso: o campo acompanha, e o curso recarrega para
    // o ✓ do passo ver a capa. Recarregar não reinicia o formulário do editor,
    // então o que ainda não foi salvo nos outros campos continua lá.
    onSuccess: ({ thumbnailUrl }) => {
      setValue("thumbnailUrl", thumbnailUrl, { shouldDirty: true });
      queryClient.invalidateQueries({ queryKey: ["admin-course", courseId] });
    },
  });

  return (
    <div className="space-y-2">
      <input
        ref={entrada}
        type="file"
        accept={TIPOS.join(",")}
        className="hidden"
        data-testid="thumbnail-file"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) envio.mutate(arquivo);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" disabled={envio.isPending} onClick={() => entrada.current?.click()}>
        {envio.isPending ? "Enviando…" : "Enviar imagem"}
      </Button>
      {envio.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível enviar a imagem. Use WebP, JPG ou PNG de até 5 MB.
        </p>
      )}
    </div>
  );
}
