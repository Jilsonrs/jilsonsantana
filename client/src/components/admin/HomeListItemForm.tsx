import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ContentStatus, contentStatusSchema } from "@jilson/core";
import type { CampoDaLista, ValoresDoItem } from "@/lib/home-lists";
import { ROTULO_STATUS } from "@/lib/home-lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Formulário de UM item (novo ou em edição). Os limites de tamanho espelham os
// do servidor (core/src/schemas/home-lists.ts) para o erro aparecer aqui, no
// campo, e não como um 400 genérico depois do clique.

const texto = (max: number) => z.string().trim().min(1, "Campo obrigatório.").max(max, `Até ${max} caracteres.`);

function Campo({
  id,
  campo,
  erro,
  registro,
}: {
  id: string;
  campo: CampoDaLista;
  erro?: string;
  registro: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{campo.rotulo}</Label>
      {campo.linhas > 1 ? (
        <Textarea id={id} rows={campo.linhas} {...registro} />
      ) : (
        <Input id={id} {...registro} />
      )}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}

export function HomeListItemForm({
  idBase,
  principal,
  secundario,
  inicial,
  salvando,
  erro,
  onSalvar,
  onCancelar,
}: {
  idBase: string;
  principal: CampoDaLista;
  secundario: CampoDaLista;
  inicial: ValoresDoItem;
  salvando: boolean;
  erro: boolean;
  onSalvar: (valores: ValoresDoItem) => void;
  onCancelar: () => void;
}) {
  const esquema = z.object({
    principal: texto(principal.max),
    secundario: texto(secundario.max),
    displayOrder: z.coerce.number().int("Use um número inteiro."),
    status: contentStatusSchema,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ValoresDoItem>({ resolver: zodResolver(esquema), defaultValues: inicial });

  return (
    <form onSubmit={handleSubmit(onSalvar)} className="space-y-4 rounded-lg border bg-background p-4">
      <Campo id={`${idBase}-principal`} campo={principal} erro={errors.principal?.message} registro={register("principal")} />
      <Campo id={`${idBase}-secundario`} campo={secundario} erro={errors.secundario?.message} registro={register("secundario")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-status`}>Status</Label>
          <select
            id={`${idBase}-status`}
            {...register("status")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.values(ContentStatus).map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idBase}-ordem`}>Ordem</Label>
          <Input id={`${idBase}-ordem`} type="number" {...register("displayOrder")} />
          {errors.displayOrder && <p className="text-sm text-destructive">{errors.displayOrder.message}</p>}
        </div>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={salvando}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
