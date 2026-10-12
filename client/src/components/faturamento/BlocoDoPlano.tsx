import { Plano, SituacaoDoFaturamento } from "@jilson/core";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { AcoesDoPlano } from "@/components/faturamento/AcoesDoPlano";
import { TrocaMarcada } from "@/components/faturamento/TrocaMarcada";
import { dinheiro } from "@/lib/assinar";
import { dataPorExtenso, type AssinaturaComAcesso } from "@/lib/faturamento";
import { useT } from "@/lib/language";

/**
 * O PLANO da assinatura: qual é, quanto custa e o que vem a seguir — a próxima cobrança, a data
 * em que o acesso termina (a renovação foi parada), ou o aviso de que a última cobrança falhou.
 * Só desenha: quem diz cada coisa é o servidor, que leu a Stripe.
 */
export function BlocoDoPlano({ assinatura }: { assinatura: AssinaturaComAcesso }) {
  const t = useT();
  const { plano, preco, proximaCobranca, acessoAte } = assinatura;
  const nome = plano === Plano.ANUAL ? t.assinar.anual : t.assinar.mensal;
  const porPeriodo = plano === Plano.ANUAL ? t.assinar.porAno : t.assinar.porMes;

  return (
    <PageSection title={t.faturamento.seuPlano}>
      <Card className="max-w-3xl">
        <CardContent className="space-y-4 p-6">
          {plano && preco && (
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {nome} · {dinheiro(preco.centavos, preco.moeda)}
              {porPeriodo}
            </p>
          )}
          {proximaCobranca && (
            <p className="text-sm text-muted-foreground">
              {t.faturamento.proximaCobranca
                .replace("{valor}", dinheiro(proximaCobranca.centavos, proximaCobranca.moeda))
                .replace("{data}", dataPorExtenso(proximaCobranca.em))}
            </p>
          )}
          {assinatura.situacao === SituacaoDoFaturamento.VAI_CANCELAR && acessoAte && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <p className="text-sm text-muted-foreground">{t.faturamento.vaiCancelar.replace("{data}", dataPorExtenso(acessoAte))}</p>
            </div>
          )}
          {assinatura.situacao === SituacaoDoFaturamento.ATRASADA && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
              <p role="alert" className="text-sm font-medium text-destructive">
                {assinatura.aulasTrancadas
                  ? t.faturamento.atrasadaSemAulas
                  : assinatura.aulasAte
                    ? t.faturamento.atrasadaAte.replace("{data}", dataPorExtenso(assinatura.aulasAte))
                    : t.faturamento.atrasada}
              </p>
            </div>
          )}
          <TrocaMarcada troca={assinatura.trocaMarcada} />
          <AcoesDoPlano assinatura={assinatura} />
        </CardContent>
      </Card>
    </PageSection>
  );
}
