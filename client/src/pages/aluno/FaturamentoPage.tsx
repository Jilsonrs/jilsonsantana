import { Link } from "react-router-dom";
import { SituacaoDoFaturamento } from "@jilson/core";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
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
        <div className="space-y-4">
          <p className="text-foreground">{t.faturamento.semAssinatura}</p>
          <Button asChild>
            <Link to={TELA_DE_ASSINAR}>{t.assinar.botao}</Link>
          </Button>
        </div>
      )}
      {assinatura?.situacao === SituacaoDoFaturamento.TERMINADA && (
        <div className="space-y-4">
          <p className="text-foreground">{assinatura.terminouEm ? t.faturamento.terminou.replace("{data}", dataPorExtenso(assinatura.terminouEm)) : t.faturamento.terminouSemData}</p>
          <Button asChild>
            <Link to={TELA_DE_ASSINAR}>{t.assinar.botaoReativar}</Link>
          </Button>
        </div>
      )}
      {viva && (
        <div className="space-y-12">
          <BlocoDoPlano assinatura={viva} />
          <BlocoDoCartao cartao={viva.cartao} aceitaCartao={viva.aceitaCartao} />
        </div>
      )}
    </PageContainer>
  );
}
