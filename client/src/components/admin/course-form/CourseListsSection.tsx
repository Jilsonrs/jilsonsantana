import { useFormContext } from "react-hook-form";
import type { CourseFormValues } from "@/lib/course-form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field } from "./Field";

export function CourseListsSection() {
  const { register } = useFormContext<CourseFormValues>();
  return (
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
  );
}
