import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { TELA_DE_CONCLUIDO, usePlanosDaAssinatura, useSituacaoDaAssinatura } from "@/lib/assinar";
import { useT } from "@/lib/language";
import { useIrPara } from "@/lib/versao";

// Carregado à parte: o formulário traz as bibliotecas da Stripe do site, e direto ele poria +9 KB
// compactados no pacote que todo aluno baixa em toda página (medido em 10/10/2026: 231 → 240 KB).
// Está em `PEDACOS_DO_ALUNO` (`lib/versao.ts`), como todo `import()` do caminho do aluno.
const FormularioDeAssinatura = lazy(() => import("@/components/assinar/FormularioDeAssinatura").then((m) => ({ default: m.FormularioDeAssinatura })));

/**
 * ASSINAR, com a conta logada (Fase 4, etapa 4.2; o endereço é decisão do operador,
 * 10/10/2026). Chega-se aqui pela aula trancada e pelos botões Assinar da home, quando há
 * login. Quem já é assinante vê só o aviso e o caminho para o Início (decisão dele, 10/10).
 * Quem responde "já assina?" é o servidor (o gate), não a tela.
 */
export function AssinarPage() {
  const t = useT();
  const irPara = useIrPara();
  const situacao = useSituacaoDaAssinatura();
  const jaAssina = situacao.data?.temAcesso === true;
  // Quem já foi assinante e está sem acesso REATIVA; "Assinar" é só a primeira vez (decisão do
  // operador, 10/10/2026). Quem diz é o servidor; aqui muda só o texto.
  const reativar = situacao.data?.reativar === true;
  const planos = usePlanosDaAssinatura(situacao.data?.temAcesso === false);
  const carregando = situacao.isLoading || planos.isLoading;
  const falhou = situacao.isError || planos.isError;

  return (
    <PageContainer>
      <PageHeader title={reativar ? t.assinar.tituloReativar : t.assinar.titulo} description={t.assinar.descricao} />
      {carregando && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {!carregando && falhou && (
        <p role="alert" className="text-sm text-destructive">
          {t.assinar.erroPlanos}
        </p>
      )}
      {!carregando && !falhou && jaAssina && (
        <div className="space-y-4">
          <p className="text-foreground">{t.assinar.jaAssinante}</p>
          <Button asChild>
            <Link to="/inicio">{t.assinar.irParaInicio}</Link>
          </Button>
        </div>
      )}
      {!carregando && !falhou && !jaAssina && planos.data && (
        <Suspense fallback={<p className="text-muted-foreground">{t.comum.carregando}</p>}>
          <FormularioDeAssinatura dados={planos.data} aoConcluir={() => irPara(TELA_DE_CONCLUIDO)} aoSaberQueJaAssina={() => void situacao.refetch()} reativar={reativar} />
        </Suspense>
      )}
    </PageContainer>
  );
}
