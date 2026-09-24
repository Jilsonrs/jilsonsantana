import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";

export function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: api.adminGetCourses,
  });
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

      <div className="space-y-4 mt-8">
        {courses?.map((course) => (
          <Card key={course.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
              <div>
                <p className="font-semibold text-lg">{course.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {course.moduleCount} módulos · {course.lessonCount} aulas
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Curso em inglês ganha etiqueta, para o operador ver qual é qual (24/09). */}
                {course.language === "en" && <Badge variant="outline">EN</Badge>}
                <Badge variant="secondary">{course.status}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/cursos/${course.id}`}>Editar</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir o curso "${course.title}"?`)) del.mutate(course.id);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
