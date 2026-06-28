import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CourseFormValues } from "@/pages/admin/AdminCourseFormPage";

// "Diferenciais do curso" icon cards (Course.highlights[]) — the only array-
// of-OBJECT course field, so unlike learnTags/requirements/personas (plain
// string lines) this genuinely needs RHF's useFieldArray. Reads `control` +
// `register` off the form's FormProvider context (set up by
// AdminCourseFormPage) instead of prop-drilling them in.
export function HighlightsField() {
  const { control, register } = useFormContext<CourseFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "highlights" });

  return (
    <div className="space-y-3">
      <Label>Diferenciais (highlights)</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 rounded-md border border-border p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <Input placeholder="ícone (ex. stack-2)" {...register(`highlights.${index}.icon`)} />
            <Input placeholder="título" {...register(`highlights.${index}.title`)} />
            <Input placeholder="texto" {...register(`highlights.${index}.text`)} />
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
