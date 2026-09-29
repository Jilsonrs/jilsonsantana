import { useMutation } from "@tanstack/react-query";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { LIMITE_DO_TEXTO_DA_AULA } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, idDoContador } from "@/components/admin/course-form/Field";
import { MarkdownField } from "@/components/admin/course-form/MarkdownField";

/**
 * O TEXTO de uma aula de texto (Bloco E, etapa 2 — decisão do operador,
 * 27–28/09/2026): negrito, itálico e listas, com o mesmo campo da descrição do
 * curso. Aula de vídeo não tem este painel.
 */
export function LessonTextPanel({ lesson, onChanged }: { lesson: AdminLesson; onChanged: () => void }) {
  const form = useForm<{ content: string }>({ defaultValues: { content: lesson.content ?? "" } });
  const texto = useWatch({ control: form.control, name: "content" });
  const id = `aula-${lesson.id}-texto`;

  const salvar = useMutation({
    mutationFn: (content: string) => api.updateLesson(lesson.id, { content }),
    onSuccess: onChanged,
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(({ content }) => salvar.mutate(content))}
        className="space-y-3"
        noValidate
      >
        <Field id={id} label="Texto da aula" contador={{ atual: texto.length, limite: LIMITE_DO_TEXTO_DA_AULA }}>
          <MarkdownField
            id={id}
            name="content"
            maxLength={LIMITE_DO_TEXTO_DA_AULA}
            describedBy={idDoContador(id)}
            rotuloDoModo="Modo de edição do texto da aula"
          />
        </Field>
        {salvar.isError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            Não foi possível salvar o texto. Tente de novo.
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar texto"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
