import { useFormContext } from "react-hook-form";
import type { CourseFormValues } from "@/lib/course-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field } from "./Field";

export function CourseBasicsSection() {
  const { register, formState } = useFormContext<CourseFormValues>();
  return (
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
  );
}
