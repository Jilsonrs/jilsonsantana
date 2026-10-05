import { lazy, Suspense } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CourseFormValues } from "@/lib/course-form";

// O seletor traz TODOS os desenhos do Lucide e os nomes em português: só baixa
// quem abre os Destaques no editor, nunca o aluno.
const IconPicker = lazy(() => import("./IconPicker"));

// "Diferenciais do curso" icon cards (Course.highlights[]) — the only array-
// of-OBJECT course field, so unlike learnTags/requirements/personas (plain
// string lines) this genuinely needs RHF's useFieldArray. Reads `control` +
// `register` off the form's FormProvider context (set up by the course
// editor, `course-editor/CourseEditorLayout.tsx`) instead of prop-drilling them in.
export function HighlightsField() {
  const { control, register } = useFormContext<CourseFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "highlights" });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 rounded-md border border-border p-3">
          <div className="grid flex-1 gap-4 sm:grid-cols-[1fr_2fr_3fr]">
            <div className="space-y-1.5">
              <Label id={`destaque-${index}-icone`} className="text-xs text-muted-foreground">Ícone</Label>
              <Suspense
                fallback={
                  <Button type="button" variant="outline" disabled className="w-full justify-start font-normal">
                    Carregando…
                  </Button>
                }
              >
                <IconPicker index={index} rotuloId={`destaque-${index}-icone`} />
              </Suspense>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`destaque-${index}-titulo`} className="text-xs text-muted-foreground">Título</Label>
              <Input id={`destaque-${index}-titulo`} placeholder="Título curto..." {...register(`highlights.${index}.title`)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`destaque-${index}-texto`} className="text-xs text-muted-foreground">Texto descritivo</Label>
              <Input id={`destaque-${index}-texto`} placeholder="Uma linha de texto..." {...register(`highlights.${index}.text`)} />
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remover destaque" onClick={() => remove(index)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ icon: "", title: "", text: "" })}
      >
        <Plus className="mr-1 h-4 w-4" /> Adicionar destaque
      </Button>
    </div>
  );
}
