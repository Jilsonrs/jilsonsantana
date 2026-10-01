import { useState, useRef, useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CourseFormValues } from "@/lib/course-form";
import { AVAILABLE_ICONS, resolveIcon } from "../content/icon-registry";

function IconPicker({ index }: { index: number }) {
  const { register, watch, setValue } = useFormContext<CourseFormValues>();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentIconKey = watch(`highlights.${index}.icon`);
  const CurrentIcon = currentIconKey ? resolveIcon(currentIconKey) : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" {...register(`highlights.${index}.icon`)} />
      
      <Button 
        type="button" 
        variant="outline" 
        className="w-full justify-start text-left font-normal flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {CurrentIcon ? (
           <>
             <CurrentIcon className="h-4 w-4 shrink-0" />
             <span className="truncate">{currentIconKey}</span>
           </>
        ) : (
           <span className="text-muted-foreground truncate">Selecione...</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-12 left-0 z-50 w-64 rounded-md border bg-popover shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div className="grid grid-cols-5 gap-1 max-h-60 overflow-y-auto p-2">
            {AVAILABLE_ICONS.map((iconKey) => {
              const Icon = resolveIcon(iconKey);
              const isSelected = currentIconKey === iconKey;
              return (
                <button
                  key={iconKey}
                  type="button"
                  title={iconKey}
                  onClick={() => {
                    setValue(`highlights.${index}.icon`, iconKey, { shouldDirty: true });
                    setIsOpen(false);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-accent hover:text-accent-foreground ${isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-transparent'}`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
              <Label className="text-xs text-muted-foreground">Ícone</Label>
              <IconPicker index={index} />
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
