import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useT } from "@/lib/language";
import { PageContainer } from "@/components/layout/PageLayout";
import { CourseDetails } from "@/components/aula/CourseDetails";

/**
 * A PRÉ-VISUALIZAÇÃO DO CURSO COMO ALUNO (passo Publicar — decisão do operador,
 * 04/10/2026): o operador simula o aluno entrando no curso enquanto cadastra, em
 * qualquer status. Com aula, vai para a PRIMEIRA, na ordem do Conteúdo, na página
 * de aula de sempre (a rota de admin já mostra o rascunho marcado). Sem nenhuma
 * aula, mostra a mesma tela do aluno com o que já existe: o título, o aviso no
 * lugar do player e o "Sobre o curso".
 */
export function CoursePreviewPage() {
  const { id } = useParams();
  const cursoId = /^\d+$/.test(id ?? "") ? Number(id) : null;
  const t = useT();
  const { data, isError } = useQuery({
    queryKey: ["previa-do-curso", cursoId],
    // Seguro: `enabled` abaixo só liga a consulta com um id de verdade.
    queryFn: () => api.getAdminCoursePage(cursoId as number),
    enabled: cursoId !== null,
  });

  // Admin: texto em português na própria tela (decisão de 23/09).
  if (cursoId === null || isError) return <Aviso texto="Não foi possível abrir a pré-visualização deste curso." alerta />;
  if (!data) return <Aviso texto={t.aula.carregando} />;

  const primeira = data.curso.modulos.flatMap((m) => m.aulas)[0];
  if (primeira) return <Navigate to={`/aluno/aula/${primeira.id}`} replace />;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex min-h-[60px] items-center border-b border-border/40 bg-card/50 px-4 sm:px-6 md:min-h-[80px] md:px-[50px]">
        <h1 className="py-3 font-display text-lg font-bold tracking-tight text-foreground md:text-2xl">{data.curso.title}</h1>
      </div>
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 pb-6 pt-[20px] sm:px-6 sm:pb-8 md:px-[50px]">
        {/* No lugar do player: o curso ainda não tem aula. */}
        <div className="flex aspect-video max-h-[60vh] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40">
          <p className="text-muted-foreground">{t.aula.cursoSemAulas}</p>
        </div>
        <CourseDetails curso={data.curso} />
      </div>
    </div>
  );
}

function Aviso({ texto, alerta = false }: { texto: string; alerta?: boolean }) {
  return (
    <PageContainer>
      <p role={alerta ? "alert" : undefined} className={alerta ? "py-16 text-center font-medium text-destructive" : "py-16 text-center text-muted-foreground"}>
        {texto}
      </p>
    </PageContainer>
  );
}
