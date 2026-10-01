import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CourseFormValues } from "@/lib/course-form";
import { AVAILABLE_ICONS } from "../content/icon-registry";

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
      <Label>Diferenciais (highlights)</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 rounded-md border border-border p-3">
          <div className="grid flex-1 gap-4 sm:grid-cols-[1fr_2fr_3fr]">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ícone</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register(`highlights.${index}.icon`)}
              >
                <option value="" disabled>Selecione um ícone...</option>
                {AVAILABLE_ICONS.map((iconKey) => (
                  <option key={iconKey} value={iconKey}>
                    {iconKey}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input placeholder="Título curto..." {...register(`highlights.${index}.title`)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Texto descritivo</Label>
              <Input placeholder="Uma linha de texto..." {...register(`highlights.${index}.text`)} />
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
            <Trash2 className="h-4 w-4" />
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
