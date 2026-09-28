import { useFormContext } from "react-hook-form";
import { Level, LANGUAGES, pt } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Field } from "./Field";

const NOME_DO_IDIOMA = { pt: "Português", en: "English" } as const;

// A classe inteira escrita aqui, como texto: o Tailwind só gera o CSS de classe
// que existe literalmente no arquivo (GEMINI.md, regra 1).
export const CLASSE_DO_SELECT =
  "flex h-[56px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300";

/**
 * Idioma e nível do curso — no passo Informações básicas (operador, 28/09/2026).
 *
 * `idiomaTravado`: o curso JÁ GRAVADO não é rascunho. O idioma só troca enquanto
 * o curso é rascunho (decisão do operador, 24/09/2026) — e quem garante é o
 * servidor; aqui a tela só não oferece o que ele vai recusar.
 *
 * Travado, o idioma aparece como TEXTO, não como campo desabilitado: campo
 * desabilitado sai do formulário do react-hook-form e o idioma não iria no
 * envio.
 */
export function CourseLanguageLevelFields({ idiomaTravado = false }: { idiomaTravado?: boolean }) {
  const { register, watch } = useFormContext<CourseFormValues>();
  const idioma = watch("language");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {idiomaTravado ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Idioma</p>
          <p className="flex h-[56px] items-center px-1 text-[1.05rem]">{NOME_DO_IDIOMA[idioma]}</p>
          <p className="text-sm text-muted-foreground">O idioma trava depois que o curso é publicado.</p>
        </div>
      ) : (
        <Field id="language" label="Idioma">
          <select id="language" {...register("language")} className={CLASSE_DO_SELECT}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {NOME_DO_IDIOMA[l]}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field id="level" label="Nível">
        <select id="level" {...register("level")} className={CLASSE_DO_SELECT}>
          <option value="">—</option>
          {/* O rótulo em português, o mesmo que o aluno lê (o dicionário); o código
              do banco (INICIANTE) nunca aparece na tela. Admin fica em português. */}
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
