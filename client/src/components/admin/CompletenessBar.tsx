/**
 * A barra de PREENCHIMENTO do curso e o que falta — no cartão da lista do admin
 * e no passo Publicar do editor (a mesma nos dois lugares, 28/09/2026). A barra
 * é um `progressbar` com valor: o leitor de tela ouve a porcentagem.
 */
export function CompletenessBar({
  titulo,
  porcentagem,
  faltando,
}: {
  /** O nome do curso: a barra se anuncia como "Preenchimento de <curso>". */
  titulo: string;
  porcentagem: number;
  faltando: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preenchimento</span>
        <span className="font-mono text-sm font-semibold text-primary">{porcentagem}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Preenchimento de ${titulo}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentagem}
        className="h-1.5 w-full overflow-hidden rounded-full border border-border-fine bg-surface-alt"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${porcentagem}%` }} />
      </div>
      {faltando.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground/90">
          {faltando.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-destructive/60" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
