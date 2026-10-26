import { Link } from "react-router";
import { SituacaoDoFaturamento } from "@jilson/core";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BlocoDoCartao } from "@/components/faturamento/BlocoDoCartao";
import { BlocoDoPlano } from "@/components/faturamento/BlocoDoPlano";
import { TELA_DE_ASSINAR } from "@/lib/assinar";
import { comAcesso, dataPorExtenso, useMinhaAssinatura } from "@/lib/faturamento";
import { useT } from "@/lib/language";

/**
 * FATURAMENTO E ASSINATURA (Fase 4, etapa 4.6 — o lugar e o desenho são decisões do operador,
 * 11/10/2026): o resumo da assinatura da conta. Mora no item que já existia no menu da conta.
 * Quem diz em que pé a assinatura está é o servidor, que lê a Stripe na hora; aqui só se
 * desenha. Cada ação (trocar o cartão, mudar de plano, cancelar) tem a sua tela.
 */
export function FaturamentoPage() {
  const t = useT();
  const { data, isLoading, isError } = useMinhaAssinatura();
  // A leitura falhou: só a falha. O que a tela tinha lido antes pode não valer mais, e plano,
  // cobrança e cartão velhos ao lado de um erro diriam duas coisas ao mesmo tempo.
  const assinatura = isError ? undefined : data;
  const viva = comAcesso(assinatura);

  return (
    <PageContainer>
      <PageHeader title={t.nav.faturamento} description={t.faturamento.descricao} />
      {isLoading && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {t.faturamento.erro}
        </p>
      )}
      {assinatura?.situacao === SituacaoDoFaturamento.NENHUMA && (
        <Card className="max-w-xl">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium text-foreground">{t.faturamento.semAssinatura}</p>
            <Button asChild className="shrink-0">
              <Link to={TELA_DE_ASSINAR}>{t.assinar.botao}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {assinatura?.situacao === SituacaoDoFaturamento.TERMINADA && (
        <Card className="max-w-xl">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium text-foreground">
              {assinatura.terminouEm ? t.faturamento.terminou.replace("{data}", dataPorExtenso(assinatura.terminouEm)) : t.faturamento.terminouSemData}
            </p>
            <Button asChild className="shrink-0">
              <Link to={TELA_DE_ASSINAR}>{t.assinar.botaoReativar}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {viva && (
        <div className="space-y-8">
          <BlocoDoPlano assinatura={viva} />
          <BlocoDoCartao cartao={viva.cartao} aceitaCartao={viva.aceitaCartao} />
        </div>
      )}
    </PageContainer>
  );
}
