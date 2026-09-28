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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Preenchimento</span>
        <span className="font-medium">{porcentagem}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Preenchimento de ${titulo}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentagem}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${porcentagem}%` }} />
      </div>
      {faltando.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {faltando.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
