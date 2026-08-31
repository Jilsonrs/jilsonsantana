import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CourseFormValues } from "@/pages/admin/AdminCourseFormPage";

// Per-course FAQ (Course.faq[]) — optional, renders only if filled
// (CLAUDE.md: fill 2-3 entries only where a recurring real doubt exists).
export function FaqField() {
  const { control, register } = useFormContext<CourseFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "faq" });

  return (
    <div className="space-y-3">
      <Label>FAQ (opcional — só preencha onde houver dúvida recorrente real)</Label>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 rounded-md border border-border p-3">
          <div className="flex-1 space-y-2">
            <Input placeholder="pergunta" {...register(`faq.${index}.pergunta`)} />
            <Textarea placeholder="resposta" rows={2} {...register(`faq.${index}.resposta`)} />
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
        onClick={() => append({ pergunta: "", resposta: "" })}
      >
        <Plus className="mr-1 h-4 w-4" /> Adicionar pergunta
      </Button>
    </div>
  );
}
