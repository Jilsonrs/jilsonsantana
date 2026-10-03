import { useState, useRef, useEffect, useId } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseFormValues } from "@/lib/course-form";
import { AVAILABLE_ICONS, resolveIcon } from "../content/icon-registry";
import { nomeDoIcone } from "./nomes-dos-icones";

// Na ordem do nome em português, que é o que o operador lê.
const ICONES_POR_NOME = [...AVAILABLE_ICONS].sort((a, b) => nomeDoIcone(a).localeCompare(nomeDoIcone(b), "pt"));

/**
 * O SELETOR DE ÍCONE de um Destaque (desenho do Antigravity, 30/09/2026; nomes em
 * português por decisão do operador, 03/10/2026). Grava o nome técnico do ícone;
 * mostra o nome em português. Funciona pelo teclado: abre com Enter, o foco vai
 * para o ícone escolhido, Esc fecha e devolve o foco ao botão.
 */
function IconPicker({ index, rotuloId }: { index: number; rotuloId: string }) {
  const { register, watch, setValue } = useFormContext<CourseFormValues>();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const botaoId = useId();
  const gradeId = useId();

  const currentIconKey = watch(`highlights.${index}.icon`);
  const CurrentIcon = currentIconKey ? resolveIcon(currentIconKey) : null;

  // Efeito: fechar ao clicar fora é ouvir o documento inteiro, fora do React.
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      // Seguro: o alvo de um clique no documento é sempre um nó.
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Efeito: ao abrir, o foco entra na grade (no ícone escolhido, ou no primeiro).
  useEffect(() => {
    if (!isOpen) return;
    const grade = document.getElementById(gradeId);
    const alvo = grade?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? grade?.querySelector<HTMLButtonElement>("button");
    alvo?.focus();
  }, [isOpen, gradeId]);

  function fechar() {
    setIsOpen(false);
    botaoRef.current?.focus();
  }

  return (
    <div
      className="relative"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isOpen) {
          e.stopPropagation();
          fechar();
        }
      }}
    >
      <input type="hidden" {...register(`highlights.${index}.icon`)} />

      <Button
        ref={botaoRef}
        id={botaoId}
        type="button"
        variant="outline"
        aria-labelledby={`${rotuloId} ${botaoId}`}
        aria-expanded={isOpen}
        aria-controls={gradeId}
        className="w-full justify-start text-left font-normal flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {CurrentIcon ? (
           <>
             <CurrentIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
             <span className="truncate">{nomeDoIcone(currentIconKey)}</span>
           </>
        ) : (
           <span className="text-muted-foreground truncate">Selecione...</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-12 left-0 z-50 w-64 rounded-md border bg-popover shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div id={gradeId} role="group" aria-labelledby={rotuloId} className="grid grid-cols-5 gap-1 max-h-60 overflow-y-auto p-2">
            {ICONES_POR_NOME.map((iconKey) => {
              const Icon = resolveIcon(iconKey);
              const isSelected = currentIconKey === iconKey;
              return (
                <button
                  key={iconKey}
                  type="button"
                  title={nomeDoIcone(iconKey)}
                  aria-label={nomeDoIcone(iconKey)}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setValue(`highlights.${index}.icon`, iconKey, { shouldDirty: true });
                    fechar();
                  }}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected ? "border-primary bg-primary/10 text-primary" : "border-transparent",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
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
              <Label id={`destaque-${index}-icone`} className="text-xs text-muted-foreground">Ícone</Label>
              <IconPicker index={index} rotuloId={`destaque-${index}-icone`} />
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
