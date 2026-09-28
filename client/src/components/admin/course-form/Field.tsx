import { Label } from "@/components/ui/label";

/**
 * Rótulo + campo + erro, o bloco que todas as seções do formulário de curso repetem.
 * Com `contador`, mostra "42/60" embaixo do campo; o campo aponta para ele com
 * `aria-describedby={idDoContador(id)}`.
 */
export function Field({
  id,
  label,
  error,
  contador,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  contador?: { atual: number; limite: number };
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-medium text-foreground">
        {label}
      </Label>
      {children}
      {(error || contador) && (
        <div className="flex items-start justify-between gap-4">
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : <span />}
          {contador && (
            <p id={id && idDoContador(id)} className="text-xs tabular-nums text-muted-foreground">
              {contador.atual.toLocaleString("pt-BR")}/{contador.limite.toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function idDoContador(id: string): string {
  return `${id}-contador`;
}
