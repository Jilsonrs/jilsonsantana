import { Link, Outlet, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as api from "@/lib/api";
import type { AdminCourseDetail } from "@/lib/api";
import { courseFormSchema, toFormValues, codigoDoErro, type CourseFormValues } from "@/lib/course-form";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { segundosDeVideo, textoDaDuracao } from "@/lib/duracao-do-curso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";

/**
 * O EDITOR DO CURSO (Bloco E, etapa 1 — decisões do operador, 27–28/09/2026).
 * Os 7 passos ficam no nível 2 da navegação (o mapa monta a coluna sozinho);
 * aqui mora o que é comum a todos: o topo e o formulário. Cada passo é uma rota
 * filha (`course-editor/steps.tsx`) e salva só a parte dele.
 */
export type ContextoDoEditor = { curso: AdminCourseDetail };

export function useCursoDoEditor(): ContextoDoEditor {
  return useOutletContext<ContextoDoEditor>();
}

function Voltar() {
  return (
    <Button asChild variant="outline">
      <Link to="/admin/cursos">Voltar para cursos</Link>
    </Button>
  );
}

export function CourseEditorLayout() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const idValido = Number.isInteger(courseId) && courseId > 0;
  const { data: curso, error } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: () => api.adminGetCourse(courseId),
    enabled: idValido,
  });

  if (!idValido || codigoDoErro(error) === "NotFound") {
    return <Aviso titulo="Curso não encontrado" texto="Este curso não existe ou foi excluído." />;
  }
  if (error) {
    return <Aviso titulo="Editar curso" texto="Não foi possível carregar o curso." alerta />;
  }
  if (!curso) {
    return <Aviso titulo="Editar curso" texto="Carregando…" />;
  }

  return (
    <PageContainer>
      <PageHeader
        title={curso.title}
        // Quanto vídeo o curso tem, como no topo da Udemy (decisão do operador,
        // 29/09/2026): todo vídeo enviado, inclusive de aula em rascunho.
        description={textoDaDuracao(segundosDeVideo(curso.modules))}
        actions={
          <>
            <Badge variant="secondary">{ROTULO_DO_STATUS[curso.status]}</Badge>
            <Voltar />
          </>
        }
      />
      {/* `key`: outro curso, outro formulário. */}
      <FormularioDoCurso key={curso.id} curso={curso} />
    </PageContainer>
  );
}

/**
 * O formulário nasce UMA vez por curso, com os valores gravados, e vive
 * enquanto o operador troca de passo: o que ele digitou e ainda não salvou
 * continua lá. Recarregar o curso (depois de salvar um passo, de enviar a capa)
 * NÃO o reinicia — `defaultValues` só vale na criação. Por isso não há efeito
 * sincronizando curso → formulário.
 */
function FormularioDoCurso({ curso }: { curso: AdminCourseDetail }) {
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: toFormValues(curso),
  });
  const contexto: ContextoDoEditor = { curso };
  return (
    <FormProvider {...form}>
      <Outlet context={contexto} />
    </FormProvider>
  );
}

function Aviso({ titulo, texto, alerta = false }: { titulo: string; texto: string; alerta?: boolean }) {
  return (
    <PageContainer>
      <PageHeader title={titulo} actions={<Voltar />} />
      <p role={alerta ? "alert" : undefined} className={alerta ? "text-sm font-medium text-destructive" : "text-muted-foreground"}>
        {texto}
      </p>
    </PageContainer>
  );
}
