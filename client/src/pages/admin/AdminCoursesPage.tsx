import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
        <Button asChild>
          <Link to="/admin/cursos/novo">Novo curso</Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      <div className="space-y-3">
        {courses?.map((course) => (
          <Card key={course.id}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-sm text-muted-foreground">
                  {course.moduleCount} módulos · {course.lessonCount} aulas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{course.status}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/cursos/${course.id}`}>Editar</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
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
    </div>
  );
}
