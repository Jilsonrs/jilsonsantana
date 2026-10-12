import { lazy, Suspense, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { CartaoTrocado } from "@jilson/core";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { usePlanosDaAssinatura } from "@/lib/assinar";
import { CHAVE_DA_MINHA_ASSINATURA, comAcesso, descreverCartao, TELA_DO_FATURAMENTO, useMinhaAssinatura } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { useIrPara } from "@/lib/versao";

// Carregado à parte: o formulário traz as bibliotecas da Stripe do site (como o de assinar).
// Está em `PEDACOS_DO_ALUNO` (`lib/versao.ts`), como todo `import()` do caminho do aluno.
const FormularioDoCartao = lazy(() => import("@/components/faturamento/FormularioDoCartao").then((m) => ({ default: m.FormularioDoCartao })));

/**
 * TROCAR O CARTÃO (Fase 4, etapa 4.6 — tela própria, com endereço próprio: decisão do operador,
 * 11/10/2026). Quem diz se a assinatura aceita cartão novo é o servidor; sem isso, a pessoa
 * volta ao resumo, que explica em que pé a assinatura está. Depois da troca, a tela diz o que
 * aconteceu — inclusive que o cartão novo já pagou a cobrança atrasada.
 */
export function TrocarCartaoPage() {
  const t = useT();
  const irPara = useIrPara();
  const queryClient = useQueryClient();
  const assinatura = useMinhaAssinatura();
  const [trocado, setTrocado] = useState<CartaoTrocado | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const dados = assinatura.data;
  const viva = comAcesso(dados);
  const aceita = viva?.aceitaCartao === true;
  // A chave e as formas de pagamento do campo: só para quem vai abri-lo.
  const planos = usePlanosDaAssinatura(aceita && !trocado);
  const carregando = assinatura.isLoading || planos.isLoading;
  const falhou = assinatura.isError || planos.isError;
  const moeda = viva?.preco?.moeda ?? planos.data?.planos[0]?.moeda;

  if (dados && !aceita && !trocado) return <Navigate to={TELA_DO_FATURAMENTO} replace />;

  // A cobrança em aberto ainda espera a confirmação do banco: tenta de novo, com o segredo que
  // o servidor devolveu na troca (ele fica só na memória desta tela).
  async function confirmarPagamento() {
    const chave = planos.data?.chavePublicavel;
    if (!trocado?.confirmar || !chave || confirmando) return;
    setConfirmando(true);
    try {
      const { confirmarNoBanco } = await import("@/lib/stripe-do-site");
      if ((await confirmarNoBanco(chave, trocado.confirmar)) === "confirmado") {
        setTrocado({ ...trocado, pagou: true, confirmar: null });
        void queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA });
      }
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader title={viva?.cartao || trocado ? t.faturamento.trocarCartao : t.faturamento.adicionarCartao} description={t.faturamento.cartaoDescricao} />
      {trocado && (
        <div className="space-y-4">
          <p role="status" className="text-foreground">
            {trocado.pagou ? t.faturamento.cartaoAtualizadoEPago : trocado.confirmar ? t.faturamento.banco.naoConcluiuNoCartao : t.faturamento.cartaoAtualizado}
          </p>
          {trocado.confirmar && !trocado.pagou && (
            <Button type="button" variant="outline" onClick={() => void confirmarPagamento()} disabled={confirmando}>
              {confirmando ? t.assinar.processando : t.faturamento.banco.confirmar}
            </Button>
          )}
          {trocado.cartao && <p className="text-sm font-semibold text-foreground">{descreverCartao(t.faturamento, trocado.cartao)}</p>}
          <Button asChild>
            <Link to={TELA_DO_FATURAMENTO}>{t.nav.faturamento}</Link>
          </Button>
        </div>
      )}
      {!trocado && carregando && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {!trocado && !carregando && falhou && (
        <p role="alert" className="text-sm text-destructive">
          {t.faturamento.erro}
        </p>
      )}
      {!trocado && !carregando && !falhou && aceita && planos.data && moeda && (
        <Suspense fallback={<p className="text-muted-foreground">{t.comum.carregando}</p>}>
          <FormularioDoCartao
            dados={{ chavePublicavel: planos.data.chavePublicavel, formasDePagamento: planos.data.formasDePagamento, moeda }}
            aoTrocar={(resultado) => {
              setTrocado(resultado);
              // O resumo guardou o cartão antigo (e, se a cobrança estava atrasada, o alerta).
              void queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA });
            }}
            aoNaoTerOndePor={() => irPara(TELA_DO_FATURAMENTO)}
          />
        </Suspense>
      )}
    </PageContainer>
  );
}
