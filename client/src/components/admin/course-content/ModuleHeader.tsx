import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Layer, ContentStatus } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminModule } from "@/lib/api";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlcaDeArraste, type useArrastavel } from "./arrastar";
import { CLASSE_DA_ETIQUETA, CLASSE_DO_SELECT_PEQUENO } from "./opcoes";

/**
 * O CABEÇALHO do módulo, como na Udemy (operador, 28/09/2026): mostra o título, a
 * camada e o status; o lápis abre a edição, com "Cancelar" e "Salvar". Sem um
 * Salvar em cada linha da tela.
 */
export function ModuleHeader({
  module,
  alca,
  isFirst,
  isLast,
  ocupado,
  onMover,
  onExcluir,
  onChanged,
}: {
  module: AdminModule;
  alca: ReturnType<typeof useArrastavel>["alca"];
  isFirst: boolean;
  isLast: boolean;
  ocupado: boolean;
  onMover: (passo: -1 | 1) => void;
  onExcluir: () => void;
  onChanged: () => void;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <ModuleEditForm module={module} aoTerminar={() => setEditando(false)} onChanged={onChanged} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AlcaDeArraste rotulo={`Arrastar o módulo ${module.title}`} alca={alca} />
      <p className="text-base font-semibold">{module.title}</p>
      {module.layer && <span className={CLASSE_DA_ETIQUETA}>{module.layer}</span>}
      <span className={CLASSE_DA_ETIQUETA}>{ROTULO_DO_STATUS[module.status]}</span>
      <Button type="button" variant="ghost" size="icon" aria-label={`Editar o módulo ${module.title}`} onClick={() => setEditando(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label={`Subir o módulo ${module.title}`} onClick={() => onMover(-1)} disabled={isFirst || ocupado}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Descer o módulo ${module.title}`} onClick={() => onMover(1)} disabled={isLast || ocupado}>
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Excluir o módulo ${module.title}`} onClick={onExcluir}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ModuleEditForm({
  module,
  aoTerminar,
  onChanged,
}: {
  module: AdminModule;
  aoTerminar: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [layer, setLayer] = useState<string>(module.layer ?? "");
  const [status, setStatus] = useState<string>(module.status);

  const salvar = useMutation({
    mutationFn: () =>
      api.updateModule(module.id, {
        title: title.trim(),
        // Seguros: os dois selects só oferecem valores das listas do core.
        // "—" vai como `null` (tira a camada); ausente, o servidor não mexeria.
        layer: layer === "" ? null : (layer as Layer),
        status: status as ContentStatus,
      }),
    onSuccess: () => {
      onChanged();
      aoTerminar();
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (title.trim()) salvar.mutate();
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2">
      <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" aria-label="Título do módulo" />
      <select value={layer} onChange={(e) => setLayer(e.target.value)} className={CLASSE_DO_SELECT_PEQUENO} aria-label="Camada do módulo">
        <option value="">sem camada</option>
        {Object.values(Layer).map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={CLASSE_DO_SELECT_PEQUENO} aria-label="Status do módulo">
        {Object.values(ContentStatus).map((s) => (
          <option key={s} value={s}>
            {ROTULO_DO_STATUS[s]}
          </option>
        ))}
      </select>
      <Button type="button" variant="ghost" size="sm" onClick={aoTerminar}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" disabled={!title.trim() || salvar.isPending}>
        Salvar
      </Button>
      {salvar.isError && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          Não foi possível salvar o módulo. Tente de novo.
        </p>
      )}
    </form>
  );
}
