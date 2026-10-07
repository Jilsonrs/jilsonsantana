import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useT } from "@/lib/language";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageLayout";

/** O servidor respondeu 404? (curso que não existe, ou não publicado). */
function naoEncontrado(erro: unknown): boolean {
  if (typeof erro !== "object" || erro === null || !("response" in erro)) return false;
  // Seguro: a linha acima provou que é um objeto com `response`; o resto é opcional.
  return (erro as { response?: { status?: number } }).response?.status === 404;
}

/**
 * A ENTRADA DO ALUNO NUM CURSO (Bloco AULA, decisões do operador de 06/10/2026 — antes,
 * 29/09/2026, ia sempre à primeira aula). O clique no curso — no catálogo do aluno
 * logado, nos Salvos, na notificação — abre a aula EM QUE A PESSOA PAROU: a última em
 * que esteve, no segundo em que estava (a página da aula cuida do segundo). Quem nunca
 * abriu o curso entra na primeira aula; quem viu até o fim a última, na primeira que
 * ainda não concluiu. Quem decide é o servidor (`GET /api/cursos/:slug/entrada`).
 * A página de venda (com o vídeo de apresentação) continua sendo a pública.
 */
export function CourseEntryPage() {
  const { slug = "" } = useParams();
  const t = useT();
  const entrada = useQuery({ queryKey: ["entrada-do-curso", slug], queryFn: () => api.getEntradaDoCurso(slug) });

  if (entrada.isError) {
    return naoEncontrado(entrada.error) ? <Aviso texto={t.curso.naoEncontrado} /> : <Aviso texto={t.aula.erro} alerta />;
  }
  // Só a resposta DESTA entrada vale: a guardada de uma visita anterior levaria à
  // aula em que a pessoa estava ANTES (ela pode ter assistido outra desde então).
  if (!entrada.data || !entrada.isFetchedAfterMount) return <Aviso texto={t.aula.carregando} />;
  if (entrada.data.aulaId === null) return <Aviso texto={t.aula.cursoSemAulas} />;
  return <Navigate to={`/aluno/aula/${entrada.data.aulaId}`} replace />;
}

function Aviso({ texto, alerta = false }: { texto: string; alerta?: boolean }) {
  return (
    <PageContainer>
      <p role={alerta ? "alert" : undefined} className={cn("py-16 text-center", alerta ? "font-medium text-destructive" : "text-muted-foreground")}>
        {texto}
      </p>
    </PageContainer>
  );
}
