import { Plano, type PlanoDaAssinatura } from "@jilson/core";
import { useIdioma, useT } from "@/lib/language";
import { dinheiro } from "@/lib/assinar";
import { cn } from "@/lib/utils";

/**
 * MENSAL OU ANUAL (trava do `billing.md`: a tela de assinar TEM que oferecer os dois — a home
 * anuncia o desconto do anual). Os valores vêm do servidor, que os lê da Stripe: o mostrado é o
 * cobrado. Botões de rádio de verdade, dentro de um grupo com legenda.
 */
export function EscolhaDoPlano({ planos, escolhido, aoEscolher, travado }: { planos: PlanoDaAssinatura[]; escolhido: Plano; aoEscolher: (plano: Plano) => void; travado: boolean }) {
  const t = useT().assinar;
  const idioma = useIdioma();
  return (
    <fieldset disabled={travado} className="space-y-3">
      <legend className="text-sm font-medium text-foreground">{t.escolhaDoPlano}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {planos.map((plano) => {
          const marcado = plano.plano === escolhido;
          const anual = plano.plano === Plano.ANUAL;
          return (
            <label
              key={plano.plano}
              className={cn(
                "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 focus-within:ring-2 focus-within:ring-ring",
                marcado ? "border-primary" : "border-border/60",
              )}
            >
              <input type="radio" name="plano" value={plano.plano} checked={marcado} onChange={() => aoEscolher(plano.plano)} className="mt-1 size-4 accent-primary" />
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{anual ? t.anual : t.mensal}</span>
                <span className="block">
                  <span className="text-lg font-semibold text-foreground">{dinheiro(plano.centavos, plano.moeda, idioma)}</span>
                  <span className="text-sm text-muted-foreground">{anual ? t.porAno : t.porMes}</span>
                </span>
                {anual && <span className="block text-sm text-muted-foreground">{t.anualEquivale.replace("{valor}", dinheiro(Math.round(plano.centavos / 12), plano.moeda, idioma))}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{t.semFidelidade}</p>
    </fieldset>
  );
}
