import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemSecundario } from "@/lib/navigation";

/** Um item de grupo do nível 2: link, ou texto quando a tela ainda não existe. */
export function ItemDoGrupo({ item, ativo, concluido }: { item: ItemSecundario; ativo: boolean; concluido: boolean }) {
  // Planejado = a tela não existe: TEXTO, nunca link (mesma trava do rail e da
  // gaveta — GEMINI.md regra 12).
  if (item.estado === "planejado") {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-2 px-4 py-3 ml-2 text-[0.95rem] border-l border-border/50 text-muted-foreground/60"
      >
        {item.label}
        <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.08em]">
          EM BREVE
        </span>
      </div>
    );
  }
  return (
    <Link
      to={item.to}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-3 ml-2 text-[0.95rem] transition-all",
        "border-l border-border/50",
        ativo
          ? "font-semibold text-primary border-l-2 border-primary -ml-[1px]" // O ml compensa a borda pra ficar alinhado
          : "text-muted-foreground hover:text-foreground hover:border-black/20 focus-visible:text-foreground focus-visible:border-black/20"
      )}
    >
      {item.label}
      {/* O ✓ nunca só no visual: o leitor de tela ouve "completo". */}
      {concluido && (
        <span className="flex items-center">
          <Check aria-hidden="true" className="size-4 text-primary" />
          <span className="sr-only">completo</span>
        </span>
      )}
    </Link>
  );
}
