import { useFormContext } from "react-hook-form";
import { ContentStatus } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field } from "./Field";
import { CLASSE_DO_SELECT } from "./CourseLanguageLevelFields";

/** Status e ordem no catálogo — no passo Publicar (operador, 28/09/2026). */
export function CoursePublishSection() {
  const { register } = useFormContext<CourseFormValues>();
  return (
    <PageSection
      title="Visibilidade"
      description="Se o curso aparece no catálogo, e em que posição."
    >
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <Field id="status" label="Status">
            <select id="status" {...register("status")} className={CLASSE_DO_SELECT}>
              {/* O valor do banco (enum) nunca aparece na tela: o rótulo é em português. */}
              {Object.values(ContentStatus).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_DO_STATUS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="displayOrder" label="Ordem">
            <Input id="displayOrder" type="number" {...register("displayOrder")} />
          </Field>
        </CardContent>
      </Card>
    </PageSection>
  );
}
