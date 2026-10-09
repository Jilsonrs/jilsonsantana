import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { AdminCourseCard } from "@/components/admin/AdminCourseCard";
import { mensagemAoExcluir } from "@/lib/course-form";

export function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: api.adminGetCourses,
  });
  // Os números do cartão (Bloco MEDIR, etapa 2): uma busca à parte — se ela falhar, a lista
  // continua; o cartão mostra "—".
  const numeros = useQuery({ queryKey: ["admin-numeros-dos-cursos"], queryFn: api.adminGetNumerosDosCursos });
  const numerosDe = (id: number): api.NumerosDoCurso | null => {
    if (!numeros.data) return null;
    return numeros.data.find((n) => n.courseId === id) ?? { courseId: id, horas: { total: 0, mes: 0 }, alunos: { total: 0, mes: 0 } };
  };
  const del = useMutation({
    mutationFn: api.deleteCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Cursos"
        description="Gerencie os cursos do catálogo."
        actions={
          <Button asChild>
            <Link to="/admin/cursos/novo">Novo curso</Link>
          </Button>
        }
      />

      {isLoading && <p className="text-muted-foreground mt-8">Carregando…</p>}
      {isError && (
        <p role="alert" className="mt-8 text-sm font-medium text-destructive">
          Não foi possível carregar os cursos.
        </p>
      )}
      {del.isError && (
        <p role="alert" className="mt-8 text-sm font-medium text-destructive">
          {mensagemAoExcluir(del.error)}
        </p>
      )}
      {courses && courses.length === 0 && (
        <p className="mt-8 text-muted-foreground">Nenhum curso ainda. Crie o primeiro em Novo curso.</p>
      )}

      <div className="space-y-4 mt-8">
        {courses?.map((course) => (
          <AdminCourseCard
            key={course.id}
            curso={course}
            numeros={numerosDe(course.id)}
            aoExcluir={() => {
              if (confirm(`Excluir o curso "${course.title}"?`)) del.mutate(course.id);
            }}
          />
        ))}
      </div>
    </PageContainer>
  );
}
