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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightsField } from "@/components/admin/HighlightsField";
import { FaqField } from "@/components/admin/FaqField";
import { ModuleLessonTree } from "@/components/admin/ModuleLessonTree";

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
  const { register, handleSubmit, reset, formState } = form;

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
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isEdit ? "Editar curso" : "Novo curso"}
      </h1>

      <FormProvider {...form}>
        <form onSubmit={handleSubmit((values) => save.mutate(values))} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="slug" label="Slug" error={formState.errors.slug?.message}>
                  <Input id="slug" {...register("slug")} />
                </Field>
                <Field id="title" label="Título" error={formState.errors.title?.message}>
                  <Input id="title" {...register("title")} />
                </Field>
              </div>
              <Field id="subtitle" label="Subtítulo">
                <Input id="subtitle" {...register("subtitle")} />
              </Field>
              <Field id="description" label="Descrição">
                <Textarea id="description" rows={3} {...register("description")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="level" label="Nível">
                  <select
                    id="level"
                    {...register("level")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                <div className="flex gap-4">
                  {Object.values(Layer).map((layer) => (
                    <label key={layer} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" value={layer} {...register("camadas")} />
                      {layer}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="thumbnailUrl" label="URL da thumbnail">
                  <Input id="thumbnailUrl" {...register("thumbnailUrl")} />
                </Field>
                <Field id="introVideoId" label="ID do vídeo de apresentação (Bunny)">
                  <Input id="introVideoId" {...register("introVideoId")} />
                </Field>
              </div>
              <Field id="learnTagsText" label="O que vai aprender (learnTags) — um por linha">
                <Textarea id="learnTagsText" rows={3} {...register("learnTagsText")} />
              </Field>
              <Field id="requirementsText" label="Pré-requisitos — um por linha">
                <Textarea id="requirementsText" rows={3} {...register("requirementsText")} />
              </Field>
              <Field id="personasText" label="Pra quem é (personas) — um por linha">
                <Textarea id="personasText" rows={3} {...register("personasText")} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <HighlightsField />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FaqField />
            </CardContent>
          </Card>

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar curso"}
          </Button>
        </form>
      </FormProvider>

      {isEdit && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Módulos e aulas</h2>
          <ModuleLessonTree courseId={courseId!} />
        </div>
      )}
    </div>
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
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
