import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { LIMITES_DO_CURSO } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NomeDaLista = "learnTags" | "requirements" | "personas";

const LIMITE = LIMITES_DO_CURSO.itemDaLista;

/**
 * Uma das três listas do passo "Para quem é": UM CAMPO POR ITEM, com contador,
 * lixeira e setas para mudar a ordem (decisão do operador, 28/09/2026 — como na
 * Udemy). As setas são botões, então funcionam pelo teclado; arrastar entra na
 * etapa 2 do Bloco E, e as setas ficam.
 *
 * Cada campo tem nome próprio para o leitor de tela ("Pré-requisitos, item 2"),
 * e cada botão diz de qual item é.
 */
export function ListItemsField({ nome, rotulo }: { nome: NomeDaLista; rotulo: string }) {
  const { control, register, formState } = useFormContext<CourseFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: nome });
  const valores = useWatch({ control, name: nome });
  const erros = formState.errors[nome];

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium text-foreground">{rotulo}</legend>
      {fields.map((campo, i) => {
        const id = `${nome}-${i}`;
        const numero = i + 1;
        const erro = erros?.[i]?.valor?.message;
        return (
          <div key={campo.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <Input
                id={id}
                aria-label={`${rotulo}, item ${numero}`}
                aria-describedby={`${id}-contador`}
                aria-invalid={erro ? true : undefined}
                maxLength={LIMITE}
                {...register(`${nome}.${i}.valor`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Subir o item ${numero}`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Descer o item ${numero}`}
                disabled={i === fields.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover o item ${numero}`}
                onClick={() => remove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-start justify-between gap-4">
              {erro ? <p className="text-sm font-medium text-destructive">{erro}</p> : <span />}
              <p id={`${id}-contador`} className="text-xs tabular-nums text-muted-foreground">
                {(valores?.[i]?.valor ?? "").length}/{LIMITE}
              </p>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ valor: "" })}>
        <Plus className="mr-1 h-4 w-4" /> Adicionar item
      </Button>
    </fieldset>
  );
}
