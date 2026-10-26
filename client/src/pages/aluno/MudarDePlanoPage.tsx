import { Link, Navigate } from "react-router";
import { Plano, SituacaoDoFaturamento } from "@jilson/core";
import { ArrowLeft } from "lucide-react";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfertaDePlano } from "@/components/faturamento/OfertaDePlano";
import { TrocaMarcada } from "@/components/faturamento/TrocaMarcada";
import { dinheiro, usePlanosDaAssinatura } from "@/lib/assinar";
import { comAcesso, dataPorExtenso, TELA_DE_TROCAR_O_CARTAO, TELA_DO_FATURAMENTO, useMinhaAssinatura } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { useMudarDePlano, useOfertaDeTroca, useValorVencido } from "@/lib/troca-de-plano";

/**
 * MUDAR DE PLANO (Fase 4, etapa 4.6 — tela própria, com endereço próprio; textos aprovados pelo
 * operador em 11/10/2026). Mensal → Anual vale na hora, com o valor mostrado ANTES; Anual →
 * Mensal fica marcado para o fim do ano já pago, e dá para desistir. O que a tela oferece, e
 * cada valor e data que ela mostra, é o que o SERVIDOR disse. Quem não renova (parou, ou está
 * com a cobrança atrasada) lê o porquê e o caminho; sem nada a mostrar, a pessoa volta ao resumo.
 * O valor mostrado que VENCEU (a tela aberta por horas) leva a pessoa ao Início, sem mensagem:
 * na volta ela vê o valor novo (decisão do operador, 11/10/2026).
 */
export function MudarDePlanoPage() {
  const t = useT();
  const p = t.faturamento.plano;
  const assinatura = useMinhaAssinatura();
  const viva = comAcesso(assinatura.isError ? undefined : assinatura.data);
  const podeMudar = viva?.podeMudarDePlano === true;
  const oferta = useOfertaDeTroca(podeMudar);
  const troca = oferta.data?.troca ?? null;
  // A chave do Stripe.js, para a confirmação do banco: só a troca que cobra na hora pode pedi-la
  // — e o botão só aparece depois de ela chegar (sem ela, a janela do banco não abriria).
  const cobraNaHora = troca?.quando === "agora";
  const planos = usePlanosDaAssinatura(cobraNaHora);
  const mudanca = useMudarDePlano(planos.data?.chavePublicavel);
  const { feito, falha } = mudanca;
  const venceuPeloRelogio = useValorVencido(troca?.quando === "agora" ? troca.valeAte : undefined);

  const carregando = assinatura.isLoading || (podeMudar && oferta.isLoading) || (cobraNaHora && planos.isLoading);
  const falhou = assinatura.isError || (podeMudar && oferta.isError) || (cobraNaHora && planos.isError);
  const parada = viva?.situacao === SituacaoDoFaturamento.VAI_CANCELAR && viva.acessoAte ? viva.acessoAte : null;
  const atrasada = viva?.situacao === SituacaoDoFaturamento.ATRASADA;
  const temOQueMostrar = viva !== null && (viva.trocaMarcada !== null || troca !== null || parada !== null || atrasada);
  if (!feito && !mudanca.enviando && (mudanca.venceu || venceuPeloRelogio)) return <Navigate to="/inicio" replace />;
  if (!feito && !mudanca.enviando && assinatura.data && !carregando && !falhou && !temOQueMostrar) return <Navigate to={TELA_DO_FATURAMENTO} replace />;

  const voltar = (
    <Button asChild variant={feito ? "default" : "outline"} className="gap-2">
      <Link to={TELA_DO_FATURAMENTO}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t.nav.faturamento}
      </Link>
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader title={t.faturamento.mudarDePlano} description={p.descricao} />
      {feito && (
        <Card className="max-w-xl">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <p role="status" className="text-sm font-medium text-foreground">
                {feito.como === "trocado" ? p.agoraAnual : p.mudaParaOMensal.replace("{data}", dataPorExtenso(feito.em))}
              </p>
            </div>
            <div className="pt-2">{voltar}</div>
          </CardContent>
        </Card>
      )}
      {!feito && carregando && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {!feito && !carregando && falhou && (
        <p role="alert" className="text-sm text-destructive">
          {t.faturamento.erro}
        </p>
      )}
      {!feito && !carregando && !falhou && viva && temOQueMostrar && (
        <div className="space-y-8">
          <PageSection title={t.faturamento.seuPlano}>
            <Card className="max-w-3xl">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
                {viva.plano && viva.preco && (
                  <p className="text-base font-semibold text-foreground">
                    {viva.plano === Plano.ANUAL ? t.assinar.anual : t.assinar.mensal} · {dinheiro(viva.preco.centavos, viva.preco.moeda)}
                    {viva.plano === Plano.ANUAL ? t.assinar.porAno : t.assinar.porMes}
                  </p>
                )}
                <Badge variant="secondary" className="px-2.5 py-0.5 font-medium">{p.atual}</Badge>
              </CardContent>
            </Card>
          </PageSection>
          <TrocaMarcada troca={viva.trocaMarcada} />
          {!viva.trocaMarcada && troca && (
            <div className="space-y-4">
              {mudanca.noBanco && (
                <div className="max-w-3xl rounded-xl border border-border/60 bg-muted/30 p-4">
                  <p role="status" className="text-sm font-medium text-foreground">
                    {t.faturamento.banco.confirmando}
                  </p>
                </div>
              )}
              {falha && (
                <div className="max-w-3xl space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {falha === "recusado" ? p.cartaoRecusado : falha === "banco" ? t.faturamento.banco.naoConcluiuNoPlano : falha === "limite" ? t.comum.muitasTentativas : p.erro}
                  </p>
                  {falha === "recusado" && (
                    <Button asChild variant="outline">
                      <Link to={TELA_DE_TROCAR_O_CARTAO}>{t.faturamento.trocarCartao}</Link>
                    </Button>
                  )}
                </div>
              )}
              <OfertaDePlano troca={troca} aoMudar={() => void mudanca.mudar(troca)} enviando={mudanca.enviando} />
            </div>
          )}
          {!viva.trocaMarcada && !troca && parada && (
            <div className="max-w-3xl rounded-xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">{p.renovacaoParada.replace("{data}", dataPorExtenso(parada))}</p>
            </div>
          )}
          {!viva.trocaMarcada && !troca && atrasada && (
            <div className="max-w-3xl space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p role="alert" className="text-sm font-medium text-destructive">
                {p.atrasada}
              </p>
              {viva.aceitaCartao && (
                <Button asChild variant="outline">
                  <Link to={TELA_DE_TROCAR_O_CARTAO}>{t.faturamento.trocarCartao}</Link>
                </Button>
              )}
            </div>
          )}
          <div className="pt-2">{voltar}</div>
        </div>
      )}
    </PageContainer>
  );
}
