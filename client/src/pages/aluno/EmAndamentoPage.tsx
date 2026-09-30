import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useT } from "@/lib/language";

/**
 * EM ANDAMENTO — a porta de entrada de Meus estudos (decisão do operador,
 * 29/09/2026: clicar em Meus estudos abre Em andamento, "mesmo que seja uma
 * página em branco com o título"; a coluna da esquerda é o guia, e o título
 * identifica a página).
 *
 * Só o título, de propósito: os cursos em andamento dependem do progresso das
 * aulas (Fase 5). Quando ele existir, o conteúdo entra aqui, com os estados de
 * carregando, erro e vazio.
 */
export function EmAndamentoPage() {
  const t = useT();
  return (
    <PageContainer>
      <PageHeader title={t.nav.emAndamento} />
    </PageContainer>
  );
}
