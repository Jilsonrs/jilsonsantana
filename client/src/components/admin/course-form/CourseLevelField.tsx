import { useFormContext } from "react-hook-form";
import { Level, pt } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Field, descritoPor } from "./Field";
import { DICAS_DO_CURSO } from "@/lib/course-hints";

// A classe inteira escrita aqui, como texto: o Tailwind só gera o CSS de classe
// que existe literalmente no arquivo (GEMINI.md, regra 1).
export const CLASSE_DO_SELECT =
  "flex h-[56px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300";

/**
 * O nível do curso — no passo Informações básicas (operador, 28/09/2026).
 *
 * O campo Idioma, que morava ao lado, saiu em 12/10/2026: a escola é só em
 * português (etapa 4.6c do plano).
 */
export function CourseLevelField() {
  const { register } = useFormContext<CourseFormValues>();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="level" label="Nível" dica={DICAS_DO_CURSO.level}>
        <select id="level" aria-describedby={descritoPor("level", { dica: true })} {...register("level")} className={CLASSE_DO_SELECT}>
          <option value="">—</option>
          {/* O rótulo é o mesmo que o aluno lê (o dicionário); o código do banco
              (INICIANTE) nunca aparece na tela. */}
          {Object.values(Level).map((l) => (
            <option key={l} value={l}>
              {pt.app.niveis[l]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
