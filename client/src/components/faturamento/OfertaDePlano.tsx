import { Plano, type TrocaDePlano } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dinheiro } from "@/lib/assinar";
import { dataPorExtenso } from "@/lib/faturamento";
import { useIdioma, useT } from "@/lib/language";

/**
 * O PLANO PARA O QUAL DÁ PARA MUDAR, com o que o SERVIDOR disse dele: para o Anual, quanto se
 * paga hoje (a conta é da Stripe) e quando é a cobrança seguinte; para o Mensal, quando a troca
 * vale e quanto passa a custar. Só desenha — nenhum valor é calculado aqui.
 */
export function OfertaDePlano({ troca, aoMudar, enviando }: { troca: TrocaDePlano; aoMudar: () => void; enviando: boolean }) {
  const t = useT();
  const idioma = useIdioma();
  const p = t.faturamento.plano;
  const paraOAnual = troca.para === Plano.ANUAL;
  const preco = dinheiro(troca.preco.centavos, troca.preco.moeda, idioma);
  const explicacao =
    troca.quando === "agora"
      ? p.paraOAnual.replace("{valor}", dinheiro(troca.hoje.centavos, troca.hoje.moeda, idioma)).replace("{data}", troca.proximaEm ? dataPorExtenso(troca.proximaEm, idioma) : "")
      : p.paraOMensal.replace("{data}", dataPorExtenso(troca.em, idioma)).replace("{valor}", preco);

  return (
    <Card className="max-w-3xl">
      <CardContent className="space-y-3 pt-6">
        <p className="text-base font-semibold text-foreground">
          {paraOAnual ? t.assinar.anual : t.assinar.mensal} · {preco}
          {paraOAnual ? t.assinar.porAno : t.assinar.porMes}
        </p>
        <p className="text-sm text-muted-foreground">{explicacao}</p>
        <Button type="button" onClick={aoMudar} disabled={enviando}>
          {enviando ? t.assinar.processando : paraOAnual ? p.mudarParaOAnual : p.mudarParaOMensal}
        </Button>
      </CardContent>
    </Card>
  );
}
