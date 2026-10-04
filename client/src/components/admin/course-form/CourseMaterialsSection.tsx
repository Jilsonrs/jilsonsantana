import { useFormContext } from "react-hook-form";
import { Material } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { useTextosComuns } from "@/lib/common-texts";

/**
 * Os MATERIAIS EXCLUSIVOS do curso — no passo Publicar (decisão do operador,
 * 04/10/2026). Lista fixa: cada caixa mostra o nome global, em português e com as
 * edições de Admin → Textos, e entra no quadro "Este curso inclui" da página do
 * curso. Os arquivos para baixar não estão aqui: aparecem sozinhos quando existem.
 */
export function CourseMaterialsSection() {
  const { register } = useFormContext<CourseFormValues>();
  const textos = useTextosComuns("pt");
  return (
    <PageSection title="Materiais exclusivos">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 pt-2">
            {Object.values(Material).map((material) => (
              <label key={material} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  value={material}
                  {...register("materiais")}
                  className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary"
                />
                {textos.materiais[material]}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageSection>
  );
}
