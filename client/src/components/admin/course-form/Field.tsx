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
      <div className="flex items-baseline gap-1">
        <Label htmlFor={id} className="font-medium text-foreground">
          {label}
        </Label>
        {dica && (
          <span id={id && idDaDica(id)} className="font-normal text-muted-foreground text-xs leading-none">
            — {dica}
          </span>
        )}
      </div>
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

export function idDaDica(id: string): string {
  return `${id}-dica`;
}

/**
 * O `aria-describedby` do campo: a dica e/ou o contador que o `Field` desenha.
 * A dica fica AO LADO do rótulo (acabamento do Antigravity, 30/09/2026), mas
 * FORA dele: dentro, ela viraria parte do nome do campo; aqui, o leitor de tela
 * lê o nome e depois a dica, como antes.
 */
export function descritoPor(id: string, { dica = false, contador = false }: { dica?: boolean; contador?: boolean }): string | undefined {
  const ids = [dica && idDaDica(id), contador && idDoContador(id)].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
