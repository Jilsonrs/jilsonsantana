import { useFormContext } from "react-hook-form";
import { Layer } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";


/** As camadas do selo 3 Camadas — no passo Mídia e destaques (operador, 28/09/2026). */
export function CourseLayersSection() {
  const { register } = useFormContext<CourseFormValues>();
  return (
    <PageSection title="Camadas">
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </PageSection>
  );
}
