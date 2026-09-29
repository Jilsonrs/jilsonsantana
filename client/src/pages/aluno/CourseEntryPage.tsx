import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useT } from "@/lib/language";
import { PageContainer } from "@/components/layout/PageLayout";

/**
 * A ENTRADA DO ALUNO NUM CURSO (decisão do operador, 29/09/2026): o clique no
 * curso, no catálogo do aluno logado, leva direto à PRIMEIRA AULA publicada, na
 * ordem do Conteúdo — a de boas-vindas, que o operador sobe como as outras. A
 * página de venda (com o vídeo de apresentação) continua sendo a pública.
 * "Continuar de onde parou" espera o progresso (Fase 5).
 */
export function CourseEntryPage() {
  const { slug = "" } = useParams();
  const t = useT();
  const curso = useQuery({ queryKey: ["course", slug], queryFn: () => api.getCourseBySlug(slug) });

  if (curso.isError) return <Aviso texto={t.curso.naoEncontrado} />;
  if (!curso.data) return <Aviso texto={t.aula.carregando} />;

  // A rota pública já devolve só o publicado, na ordem de módulos e aulas.
  const primeira = curso.data.modules.flatMap((m) => m.lessons)[0];
  if (!primeira) return <Aviso texto={t.aula.cursoSemAulas} />;
  return <Navigate to={`/aluno/aula/${primeira.id}`} replace />;
}

function Aviso({ texto }: { texto: string }) {
  return (
    <PageContainer>
      <p className="py-16 text-center text-muted-foreground">{texto}</p>
    </PageContainer>
  );
}
