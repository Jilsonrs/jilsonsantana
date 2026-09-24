import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as api from "@/lib/api";
import {
  courseFormSchema,
  blankValues,
  toFormValues,
  toPayload,
  type CourseFormValues,
} from "@/lib/course-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HighlightsField } from "@/components/admin/HighlightsField";
import { FaqField } from "@/components/admin/FaqField";
import { ModuleLessonTree } from "@/components/admin/ModuleLessonTree";
import { CourseBasicsSection } from "@/components/admin/course-form/CourseBasicsSection";
import { CourseMediaSection } from "@/components/admin/course-form/CourseMediaSection";
import { CourseOrganizationSection } from "@/components/admin/course-form/CourseOrganizationSection";
import { CourseListsSection } from "@/components/admin/course-form/CourseListsSection";
import {
  PageContainer,
  PageHeader,
  PageSection,
} from "@/components/layout/PageLayout";

// A página só COMPÕE: a lógica do formulário mora em `lib/course-form.ts`, e
// cada seção é um componente em `components/admin/course-form/`.
export function AdminCourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id ? Number(id) : undefined;
  const isEdit = courseId !== undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: () => api.adminGetCourse(courseId!),
    enabled: isEdit,
  });

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: blankValues,
  });
  const { handleSubmit, reset } = form;

  // Efeito, e não valor derivado: o formulário do react-hook-form guarda estado
  // próprio, e o curso chega depois do primeiro render — `reset` é a porta dele.
  useEffect(() => {
    if (course) reset(toFormValues(course));
  }, [course, reset]);

  const save = useMutation({
    mutationFn: (values: CourseFormValues) => {
      const payload = toPayload(values);
      return isEdit ? api.updateCourse(courseId!, payload) : api.createCourse(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-course", saved.id] });
      if (!isEdit) navigate(`/admin/cursos/${saved.id}`, { replace: true });
    },
  });

  return (
    <PageContainer>
      <PageHeader
        title={isEdit ? "Editar curso" : "Novo curso"}
      />

      <FormProvider {...form}>
        <form
          id="course-form"
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="space-y-12"
          noValidate
        >
          <CourseBasicsSection />
          <CourseMediaSection />
          {/* Trava pelo status GRAVADO, não pelo do formulário: é ele que o servidor confere. */}
          <CourseOrganizationSection idiomaTravado={isEdit && course !== undefined && course.status !== "DRAFT"} />
          <CourseListsSection />

          <PageSection
            title="Destaques (Highlights)"
            description="Os 3 pilares principais exibidos em destaque no topo da página do curso."
          >
            <Card>
              <CardContent className="pt-6">
                <HighlightsField />
              </CardContent>
            </Card>
          </PageSection>

          <PageSection
            title="Perguntas Frequentes (FAQ)"
            description="Dúvidas comuns e específicas apenas para este curso."
          >
            <Card>
              <CardContent className="pt-6">
                <FaqField />
              </CardContent>
            </Card>
          </PageSection>

          <div className="flex justify-end border-t border-border/40 pt-8">
            <Button type="submit" size="lg" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar dados do curso"}
            </Button>
          </div>
        </form>
      </FormProvider>

      {isEdit && (
        <PageSection
          title="Módulos e Aulas"
          description="Gerencie a estrutura do curso. Adicione os módulos e as aulas do curso."
          className="mt-12 border-t border-border/40"
        >
          <div className="space-y-4">
            <ModuleLessonTree courseId={courseId!} />
          </div>
        </PageSection>
      )}
    </PageContainer>
  );
}
