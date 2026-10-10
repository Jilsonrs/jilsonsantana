import { Plano, type PlanoDaAssinatura } from "@jilson/core";
import { useIdioma, useT } from "@/lib/language";
import { dinheiro } from "@/lib/assinar";
import { cn } from "@/lib/utils";

/**
 * Quanto o anual sai mais barato que doze mensais, em % inteiro — ou nada, se não sair.
 * CALCULADO dos dois preços que o servidor mandou (lidos da Stripe): o selo nunca promete um
 * desconto que a cobrança não dá.
 */
export function descontoDoAnual(planos: PlanoDaAssinatura[]): number | null {
  const mensal = planos.find((p) => p.plano === Plano.MENSAL);
  const anual = planos.find((p) => p.plano === Plano.ANUAL);
  if (!mensal || !anual || mensal.moeda !== anual.moeda || mensal.centavos <= 0) return null;
  const desconto = Math.round((1 - anual.centavos / (mensal.centavos * 12)) * 100);
  return desconto > 0 ? desconto : null;
}

/**
 * MENSAL OU ANUAL (trava do `billing.md`: a tela de assinar TEM que oferecer os dois — a home
 * anuncia o desconto do anual). Cada cartão diz tudo o que se precisa saber do plano: o preço,
 * como é cobrado e, no anual, o desconto em destaque (pedido do operador, 10/10/2026: simples,
 * "como a Anthropic faz", sem um bloco à parte repetindo o valor). Os valores vêm do servidor,
 * que os lê da Stripe: o mostrado é o cobrado. Botões de rádio de verdade, num grupo com legenda.
 */
export function EscolhaDoPlano({ planos, escolhido, aoEscolher, travado }: { planos: PlanoDaAssinatura[]; escolhido: Plano; aoEscolher: (plano: Plano) => void; travado: boolean }) {
  const t = useT().assinar;
  const idioma = useIdioma();
  const desconto = descontoDoAnual(planos);
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
                "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-ring",
                marcado ? "border-primary bg-primary/5" : "border-border/60 bg-card",
              )}
            >
              <input type="radio" name="plano" value={plano.plano} checked={marcado} onChange={() => aoEscolher(plano.plano)} className="mt-1 size-4 accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{anual ? t.anual : t.mensal}</span>
                  {anual && desconto !== null && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{t.seloDoAnual.replace("{desconto}", `${desconto}%`)}</span>
                  )}
                </span>
                <span className="mt-1 block">
                  <span className="text-lg font-semibold text-foreground">{dinheiro(plano.centavos, plano.moeda, idioma)}</span>
                  <span className="text-sm text-muted-foreground">{anual ? t.porAno : t.porMes}</span>
                </span>
                <span className="block text-sm text-muted-foreground">{anual ? t.cobradoPorAno : t.cobradoPorMes}</span>
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
