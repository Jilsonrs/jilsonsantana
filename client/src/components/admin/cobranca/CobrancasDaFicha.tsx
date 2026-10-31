import type { CobrancaDaFicha } from "@jilson/core";
import { dataCurta } from "@/lib/cobranca-admin";
import { dinheiro, textoDaCobranca, textoDaForma } from "@/lib/cobranca-ficha";

type Props = { cobrancas: CobrancaDaFicha[]; maisCobrancas: boolean; stripeIndisponivel: boolean };

/** As cobranças do aluno (cartão e Pix), da mais nova para a mais velha, com o que aconteceu e o recibo (etapa 4.7b, passo 1d). */
export function CobrancasDaFicha({ cobrancas, maisCobrancas, stripeIndisponivel }: Props) {
  if (stripeIndisponivel) return <p className="text-muted-foreground">As cobranças não aparecem agora: a Stripe não respondeu.</p>;
  if (cobrancas.length === 0) return <p className="text-muted-foreground">Nenhuma cobrança na Stripe.</p>;
  return (
    <div className="space-y-3">
      <ul aria-label="Cobranças" className="divide-y divide-border rounded-2xl border border-border/60">
        {cobrancas.map((cobranca) => (
          <li key={cobranca.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {dinheiro(cobranca.centavos, cobranca.moeda)} · {dataCurta(cobranca.em)}
              </p>
              <p className="text-sm text-muted-foreground">{textoDaForma(cobranca)}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{cobranca.id}</p>
            </div>
            <div className="text-sm sm:text-right">
              <p className={cobranca.situacao === "falhou" || cobranca.situacao === "contestada" ? "font-medium text-destructive" : "text-foreground"}>{textoDaCobranca(cobranca)}</p>
              {cobranca.recibo ? (
                <a href={cobranca.recibo} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                  Ver recibo
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {maisCobrancas ? <p className="text-sm text-muted-foreground">Há cobranças mais antigas na Stripe que não aparecem aqui.</p> : null}
    </div>
  );
}
