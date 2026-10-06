import { useFormContext, useWatch } from "react-hook-form";
import { LIMITES_DO_AVISO, type AnnouncementInput } from "@jilson/core";
import type { AdminCourseCard } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Field, descritoPor } from "@/components/admin/course-form/Field";
import { MarkdownField } from "@/components/admin/course-form/MarkdownField";

export type AvisoFormValues = { title: string; body: string; audience: AnnouncementInput["audience"]; courseId: number | null };

/**
 * Os campos do AVISO (bloco C1 — decisões do operador, 06/10/2026): título, texto
 * (o mesmo editor das mensagens do curso, com Visualizar) e para quem. Enviado, o
 * "para quem" fica travado: trocar não tira nem põe ninguém.
 */
export function AvisoForm({ cursos, enviado }: { cursos: AdminCourseCard[]; enviado: boolean }) {
  const { register, control, formState } = useFormContext<AvisoFormValues>();
  const [titulo, texto, audience] = useWatch({ control, name: ["title", "body", "audience"] });
  const erros = formState.errors;

  return (
    <div className="space-y-8">
      <Field id="title" label="Título" error={erros.title?.message} contador={{ atual: titulo.length, limite: LIMITES_DO_AVISO.titulo }}>
        <Input id="title" maxLength={LIMITES_DO_AVISO.titulo} aria-describedby={descritoPor("title", { contador: true })} {...register("title")} />
      </Field>

      <Field id="body" label="Texto" error={erros.body?.message} contador={{ atual: texto.length, limite: LIMITES_DO_AVISO.texto }}>
        <MarkdownField
          id="body"
          name="body"
          maxLength={LIMITES_DO_AVISO.texto}
          describedBy={descritoPor("body", { contador: true })}
          rotuloDoModo="Modo de edição do texto da notificação"
        />
      </Field>

      <fieldset className="space-y-3" disabled={enviado}>
        <legend className="font-medium text-foreground">Para quem</legend>
        {enviado && <p className="text-sm text-muted-foreground">Já enviada: o "para quem" não muda.</p>}
        <label className="flex items-center gap-2">
          <input type="radio" value="TODOS" {...register("audience")} />
          Todo mundo com conta
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" value="CURSO" {...register("audience")} />
          Os alunos de um curso (quem já começou)
        </label>
        {audience === "CURSO" && (
          <Field id="courseId" label="Curso" error={erros.courseId?.message}>
            <select
              id="courseId"
              className="block w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
              // Nenhum curso escolhido é `null`, nunca 0: o formulário também passa o
              // valor inicial (null) por aqui, e Number(null) daria 0.
              {...register("courseId", { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v)) })}
            >
              <option value="">Escolha o curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        )}
      </fieldset>
    </div>
  );
}
