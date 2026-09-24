import { useFormContext } from "react-hook-form";
import { Level, ContentStatus, Layer } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field } from "./Field";

export function CourseOrganizationSection() {
  const { register } = useFormContext<CourseFormValues>();
  return (
    <PageSection
      title="Organização"
      description="Nível de dificuldade, visibilidade na vitrine e as camadas metodológicas em que o curso se encaixa."
    >
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="level" label="Nível">
              <select
                id="level"
                {...register("level")}
                className="flex h-[56px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
              >
                <option value="">—</option>
                {Object.values(Level).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="status" label="Status">
              <select
                id="status"
                {...register("status")}
                className="flex h-[56px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
              >
                {Object.values(ContentStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="displayOrder" label="Ordem">
              <Input id="displayOrder" type="number" {...register("displayOrder")} />
            </Field>
          </div>
          <Field label="Camadas (metodologia 3 camadas)">
            <div className="flex flex-wrap gap-6 pt-2">
              {Object.values(Layer).map((layer) => (
                <label key={layer} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    value={layer}
                    {...register("camadas")}
                    className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary"
                  />
                  {layer}
                </label>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>
    </PageSection>
  );
}
