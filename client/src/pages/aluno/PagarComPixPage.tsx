import { lazy, Suspense, useState } from "react";
import { Navigate } from "react-router";
import { SituacaoDoFaturamento, TELA_DE_ASSINAR } from "@jilson/core";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { telaDeConcluido, usePlanosDaAssinatura } from "@/lib/assinar";
import { comAcesso, TELA_DO_FATURAMENTO, useMinhaAssinatura } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { useIrPara } from "@/lib/versao";

// Carregado à parte: o formulário traz as bibliotecas da Stripe do site (como o de assinar e o de trocar o cartão).
// Está em `PEDACOS_DO_ALUNO` (`lib/versao.ts`), como todo `import()` do caminho do aluno.
const FormularioDoPixDaAtrasada = lazy(() => import("@/components/faturamento/FormularioDoPixDaAtrasada").then((m) => ({ default: m.FormularioDoPixDaAtrasada })));

/**
 * PAGAR COM PIX (Fase 4, etapa 4.9b, E14 — decisão do operador, P118; o endereço e os textos aprovados em 30/10/2026):
 * a tela do "Pagar com Pix" que fica ao lado de "Trocar cartão" na cobrança atrasada. Só para quem TEM uma atrasada —
 * quem diz é o servidor; sem ela, a pessoa vai a Assinar (onde o Pix também está). Depois do clique, a tela fica com a
 * atrasada de ANTES do clique: a releitura já a diz encerrada, e sair (ou desmontar o formulário) fecharia o QR aberto.
 */
export function PagarComPixPage() {
  const t = useT();
  const irPara = useIrPara();
  const assinatura = useMinhaAssinatura();
  const viva = comAcesso(assinatura.data);
  const lida = viva?.situacao === SituacaoDoFaturamento.ATRASADA ? viva : null;
  // A atrasada no instante do clique: dali em diante, é ela que a tela mostra.
  const [noClique, setNoClique] = useState<typeof lida>(null);
  const comecou = noClique !== null;
  const atrasada = noClique ?? lida;
  const planos = usePlanosDaAssinatura(atrasada !== null);
  const carregando = !comecou && (assinatura.isLoading || (atrasada !== null && planos.isLoading));
  const falhou = !comecou && (assinatura.isError || planos.isError);

  if (!comecou && assinatura.data && !assinatura.isError && !atrasada) return <Navigate to={TELA_DE_ASSINAR} replace />;

  return (
    <PageContainer>
      <PageHeader title={t.faturamento.pixDaAtrasada.titulo} />
      {carregando && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {!carregando && falhou && (
        <p role="alert" className="text-sm text-destructive">
          {t.faturamento.erro}
        </p>
      )}
      {!carregando && !falhou && atrasada?.plano && planos.data && (
        <Suspense fallback={<p className="text-muted-foreground">{t.comum.carregando}</p>}>
          <FormularioDoPixDaAtrasada
            dados={planos.data}
            plano={atrasada.plano}
            aoComecar={() => setNoClique(atrasada)}
            aoConcluir={() => irPara(telaDeConcluido(false))}
            aoSair={(saida) => irPara(saida === "ja-assinante" ? TELA_DO_FATURAMENTO : TELA_DE_ASSINAR)}
          />
        </Suspense>
      )}
    </PageContainer>
  );
}
