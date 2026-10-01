import { useFormContext } from "react-hook-form";
import { ContentStatus } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field, descritoPor } from "./Field";
import { DICAS_DO_CURSO } from "@/lib/course-hints";
import { CLASSE_DO_SELECT } from "./CourseLanguageLevelFields";

/** Status e ordem no catálogo — no passo Publicar (operador, 28/09/2026). */
export function CoursePublishSection() {
  const { register } = useFormContext<CourseFormValues>();
  return (
    <PageSection
      title="Visibilidade"
    >
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <Field id="status" label="Status" dica={DICAS_DO_CURSO.status}>
            <select id="status" aria-describedby={descritoPor("status", { dica: true })} {...register("status")} className={CLASSE_DO_SELECT}>
              {/* O valor do banco (enum) nunca aparece na tela: o rótulo é em português. */}
              {Object.values(ContentStatus).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_DO_STATUS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="displayOrder" label="Ordem" dica={DICAS_DO_CURSO.displayOrder}>
            <Input
              id="displayOrder"
              type="number"
              aria-describedby={descritoPor("displayOrder", { dica: true })}
              {...register("displayOrder")}
            />
          </Field>
        </CardContent>
      </Card>
    </PageSection>
  );
}
