import { Label } from "@/components/ui/label";

/**
 * Rótulo + campo + dica + erro, o bloco que todas as seções do formulário de
 * curso repetem. Com `contador`, mostra "42/60" embaixo do campo; com `dica`,
 * uma frase de ajuda. O campo aponta para os dois com
 * `aria-describedby={descritoPor(id, { dica, contador })}` — é assim que o leitor
 * de tela lê a dica e o contador junto com o campo.
 */
export function Field({
  id,
  label,
  error,
  contador,
  dica,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  contador?: { atual: number; limite: number };
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-medium text-foreground flex items-baseline gap-1">
        <span>{label}</span>
        {dica && (
          <span className="font-normal text-muted-foreground text-xs leading-none">
            — {dica}
          </span>
        )}
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

/** O `aria-describedby` do campo: apenas o contador, pois a dica agora fica no `<Label>`. */
export function descritoPor(id: string, { contador = false }: { dica?: boolean; contador?: boolean }): string | undefined {
  const ids = [contador && idDoContador(id)].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
