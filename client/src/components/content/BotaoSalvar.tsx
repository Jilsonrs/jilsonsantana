import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlternarSalvo } from "@/lib/salvos";

/**
 * SALVAR PARA DEPOIS, num curso ou numa aula (decisão do operador, 03/10/2026,
 * "como no LinkedIn"). É um botão de ligar e desligar: o nome fica o mesmo e o
 * leitor de tela ouve se está ligado ("pressionado") — salvo. Com `texto`, ele
 * aparece ao lado do ícone; sem, só o ícone. O acabamento é do Antigravity.
 */
export function BotaoSalvar({
  tipo,
  id,
  salvo,
  nome,
  texto,
}: {
  tipo: "cursos" | "aulas";
  id: number;
  salvo: boolean;
  /** O nome que o leitor de tela ouve. */
  nome: string;
  /** O texto visível ao lado do ícone (o do curso); sem ele, só o ícone. */
  texto?: string;
}) {
  const { mutate, isPending } = useAlternarSalvo();
  const Icone = salvo ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      aria-label={texto ? undefined : nome}
      aria-pressed={salvo}
      disabled={isPending}
      onClick={() => mutate({ tipo, id, salvar: !salvo })}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md p-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-60",
        salvo ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icone className="size-4" aria-hidden="true" />
      {texto && <span>{texto}</span>}
    </button>
  );
}
