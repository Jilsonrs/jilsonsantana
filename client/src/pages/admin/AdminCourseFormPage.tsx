import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Level,
  ContentStatus,
  Layer,
  slugSchema,
  levelSchema,
  contentStatusSchema,
  layerSchema,
  highlightSchema,
  faqItemSchema,
  type CourseCreateInput,
} from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminCourseDetail } from "@/lib/api";
import { fromLines, toLines } from "@/lib/array-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HighlightsField } from "@/components/admin/HighlightsField";
import { FaqField } from "@/components/admin/FaqField";
import { ModuleLessonTree } from "@/components/admin/ModuleLessonTree";
import {
  PageContainer,
  PageHeader,
  PageSection,
} from "@/components/layout/PageLayout";

const courseFormSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, "Obrigatório"),
  subtitle: z.string(),
  description: z.string(),
  level: z.union([levelSchema, z.literal("")]),
  learnTagsText: z.string(),
  requirementsText: z.string(),
  personasText: z.string(),
  highlights: z.array(highlightSchema),
  faq: z.array(faqItemSchema),
  camadas: z.array(layerSchema),
  thumbnailUrl: z.string(),
  introVideoId: z.string(),
  displayOrder: z.coerce.number().int(),
  status: contentStatusSchema,
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

const blankValues: CourseFormValues = {
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  level: "",
  learnTagsText: "",
  requirementsText: "",
  personasText: "",
  highlights: [],
  faq: [],
  camadas: [],
  thumbnailUrl: "",
  introVideoId: "",
  displayOrder: 0,
  status: ContentStatus.DRAFT,
};

function toFormValues(course: AdminCourseDetail): CourseFormValues {
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    level: course.level ?? "",
    learnTagsText: toLines(course.learnTags),
    requirementsText: toLines(course.requirements),
    personasText: toLines(course.personas),
    highlights: course.highlights ?? [],
    faq: course.faq ?? [],
    camadas: course.camadas,
    thumbnailUrl: course.thumbnailUrl ?? "",
    introVideoId: course.introVideoId ?? "",
    displayOrder: course.displayOrder,
    status: course.status,
  };
}

// camadaOverride is intentionally NOT round-tripped here (out of scope —
// CLAUDE.md: it's the exception, not the routine); omitting it from the
// payload leaves it untouched server-side (update schema treats an omitted
// field as "leave unchanged", not "reset").
function toPayload(values: CourseFormValues): CourseCreateInput {
  return {
    slug: values.slug,
    title: values.title,
    subtitle: values.subtitle.trim() || undefined,
    description: values.description.trim() || undefined,
    level: values.level === "" ? undefined : values.level,
    learnTags: fromLines(values.learnTagsText),
    requirements: fromLines(values.requirementsText),
    personas: fromLines(values.personasText),
    highlights: values.highlights.filter((h) => h.icon.trim() && h.title.trim() && h.text.trim()),
    faq: values.faq.filter((f) => f.pergunta.trim() && f.resposta.trim()),
    camadas: values.camadas,
    thumbnailUrl: values.thumbnailUrl.trim() || undefined,
    introVideoId: values.introVideoId.trim() || undefined,
    displayOrder: values.displayOrder,
    status: values.status,
  };
}

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
  const { register, handleSubmit, reset, formState, watch } = form;

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

  const thumbnailUrl = watch("thumbnailUrl");
  const introVideoId = watch("introVideoId");

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
          <PageSection
            title="Informações básicas"
            description="O título, subtítulo e a URL amigável do seu curso. Capriche no título para atrair alunos e ser facilmente encontrado."
          >
            <Card>
              <CardContent className="space-y-6 pt-6">
                <Field id="title" label="Título" error={formState.errors.title?.message}>
                  <Input id="title" {...register("title")} />
                </Field>
                <Field id="subtitle" label="Subtítulo">
                  <Input id="subtitle" {...register("subtitle")} />
                </Field>
                <Field id="slug" label="Slug" error={formState.errors.slug?.message}>
                  <Input id="slug" {...register("slug")} />
                </Field>
                <Field id="description" label="Descrição">
                  <Textarea id="description" rows={4} className="min-h-[120px]" {...register("description")} />
                </Field>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection
            title="Mídia e Apresentação"
            description="A imagem de capa e o vídeo promocional. A imagem deve estar em proporção 16:9 para encaixar perfeitamente nos cards."
          >
            <Card>
              <CardContent className="space-y-8 pt-6">
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-4">
                    <Field id="thumbnailUrl" label="URL da thumbnail">
                      <Input id="thumbnailUrl" {...register("thumbnailUrl")} />
                    </Field>
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-muted flex items-center justify-center">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem imagem</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field id="introVideoId" label="ID do vídeo (Bunny)">
                      <Input id="introVideoId" {...register("introVideoId")} />
                    </Field>
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-muted flex flex-col items-center justify-center gap-3">
                      {introVideoId ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </div>
                          <span className="text-center text-sm font-medium text-muted-foreground">
                            Vídeo configurado
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem vídeo</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection
            title="Organização"
            description="Nível de dificuldade, visibilidade na vitrine e as camadas metodológicas em que o curso se encaixa."
          >
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id="level" label="Nível">
                    <select
                      id="level"
                      {...register("level")}
                      className="flex h-[56px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
                    >
                      <option value="">—</option>
                      {Object.values(Level).map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="status" label="Status">
                    <select
                      id="status"
                      {...register("status")}
                      className="flex h-[56px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
                    >
                      {Object.values(ContentStatus).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="displayOrder" label="Ordem">
                    <Input id="displayOrder" type="number" {...register("displayOrder")} />
                  </Field>
                </div>
                <Field label="Camadas (metodologia 3 camadas)">
                  <div className="flex flex-wrap gap-6 pt-2">
                    {Object.values(Layer).map((layer) => (
                      <label key={layer} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          value={layer}
                          {...register("camadas")}
                          className="h-4 w-4 rounded border-border/60 text-primary focus:ring-primary"
                        />
                        {layer}
                      </label>
                    ))}
                  </div>
                </Field>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection
            title="Listas e Detalhes"
            description="Estes campos alimentam as seções detalhadas da página de vendas do curso. Digite um item por linha."
          >
            <Card>
              <CardContent className="space-y-6 pt-6">
                <Field id="learnTagsText" label="O que vai aprender (learnTags)">
                  <Textarea className="min-h-[140px]" id="learnTagsText" {...register("learnTagsText")} />
                </Field>
                <Field id="requirementsText" label="Pré-requisitos">
                  <Textarea className="min-h-[140px]" id="requirementsText" {...register("requirementsText")} />
                </Field>
                <Field id="personasText" label="Pra quem é (personas)">
                  <Textarea className="min-h-[140px]" id="personasText" {...register("personasText")} />
                </Field>
              </CardContent>
            </Card>
          </PageSection>

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

function Field({
  id,
  label,
  error,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-medium text-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
