import { Plano, SituacaoDoFaturamento } from "@jilson/core";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { dinheiro } from "@/lib/assinar";
import { dataPorExtenso, type AssinaturaComAcesso } from "@/lib/faturamento";
import { useIdioma, useT } from "@/lib/language";

/**
 * O PLANO da assinatura: qual é, quanto custa e o que vem a seguir — a próxima cobrança, a data
 * em que o acesso termina (a renovação foi parada), ou o aviso de que a última cobrança falhou.
 * Só desenha: quem diz cada coisa é o servidor, que leu a Stripe.
 */
export function BlocoDoPlano({ assinatura }: { assinatura: AssinaturaComAcesso }) {
  const t = useT();
  const idioma = useIdioma();
  const { plano, preco, proximaCobranca, acessoAte } = assinatura;
  const nome = plano === Plano.ANUAL ? t.assinar.anual : t.assinar.mensal;
  const porPeriodo = plano === Plano.ANUAL ? t.assinar.porAno : t.assinar.porMes;

  return (
    <PageSection title={t.faturamento.seuPlano}>
      <Card className="max-w-3xl">
        <CardContent className="space-y-2 pt-6">
          {plano && preco && (
            <p className="text-base font-semibold text-foreground">
              {nome} · {dinheiro(preco.centavos, preco.moeda, idioma)}
              {porPeriodo}
            </p>
          )}
          {proximaCobranca && (
            <p className="text-sm text-muted-foreground">
              {t.faturamento.proximaCobranca
                .replace("{valor}", dinheiro(proximaCobranca.centavos, proximaCobranca.moeda, idioma))
                .replace("{data}", dataPorExtenso(proximaCobranca.em, idioma))}
            </p>
          )}
          {assinatura.situacao === SituacaoDoFaturamento.VAI_CANCELAR && acessoAte && (
            <p className="text-sm text-muted-foreground">{t.faturamento.vaiCancelar.replace("{data}", dataPorExtenso(acessoAte, idioma))}</p>
          )}
          {assinatura.situacao === SituacaoDoFaturamento.ATRASADA && (
            <p role="alert" className="text-sm text-destructive">
              {t.faturamento.atrasada}
            </p>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
