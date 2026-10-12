/**
 * A BARRA DE PROGRESSO dos cartões — do curso (pedido do operador de 30/09/2026, a partir da
 * Mosh) e da trilha (Bloco MEDIR, etapa 3, decisão dele de 09/10/2026): a mesma barra fina e o
 * "67% concluído" embaixo. O `rotulo` é o que o leitor de tela anuncia; o texto vem de quem
 * chama, do dicionário.
 */
export function BarraDeProgresso({ porcentagem, rotulo, concluido }: { porcentagem: number; rotulo: string; concluido: string }) {
  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentagem}
        className="h-2 w-full overflow-hidden rounded-full bg-primary/15"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${porcentagem}%` }} />
      </div>
      <p className="text-xs font-semibold text-muted-foreground">
        {porcentagem}% {concluido}
      </p>
    </div>
  );
}
