import { useFormContext, useWatch } from "react-hook-form";
import { LIMITES_DO_CURSO } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field, descritoPor } from "./Field";
import { DICAS_DO_CURSO } from "@/lib/course-hints";
import { MarkdownField } from "./MarkdownField";
import { CourseLanguageLevelFields } from "./CourseLanguageLevelFields";

// `idiomaTravado`: o curso gravado já não é rascunho (ver CourseLanguageLevelFields).
export function CourseBasicsSection({ idiomaTravado = false }: { idiomaTravado?: boolean }) {
  const { register, formState, control } = useFormContext<CourseFormValues>();
  const [title, subtitle, slug, description] = useWatch({
    control,
    name: ["title", "subtitle", "slug", "description"],
  });
  // Cada campo mostra "usados/limite" e trava no limite (decisão do operador, 27/09/2026).
  const contador = (valor: string, limite: number) => ({ atual: valor.length, limite });

  return (
    <div className="space-y-10">
      {/* 1. Identidade */}
      <PageSection title="Identidade">
        <Card>
          <CardContent className="space-y-6 pt-6">
            <Field
              id="title"
              label="Título"
              error={formState.errors.title?.message}
              contador={contador(title, LIMITES_DO_CURSO.title)}
              dica={DICAS_DO_CURSO.title}
            >
              <Input
                id="title"
                maxLength={LIMITES_DO_CURSO.title}
                aria-describedby={descritoPor("title", { contador: true })}
                {...register("title")}
              />
            </Field>
            <Field
              id="subtitle"
              label="Subtítulo"
              error={formState.errors.subtitle?.message}
              contador={contador(subtitle, LIMITES_DO_CURSO.subtitle)}
              dica={DICAS_DO_CURSO.subtitle}
            >
              <Input
                id="subtitle"
                maxLength={LIMITES_DO_CURSO.subtitle}
                aria-describedby={descritoPor("subtitle", { contador: true })}
                {...register("subtitle")}
              />
            </Field>
            <Field
              id="slug"
              label="Slug"
              error={formState.errors.slug?.message}
              contador={contador(slug, LIMITES_DO_CURSO.slug)}
              dica={DICAS_DO_CURSO.slug}
            >
              <Input
                id="slug"
                maxLength={LIMITES_DO_CURSO.slug}
                aria-describedby={descritoPor("slug", { contador: true })}
                {...register("slug")}
              />
            </Field>
          </CardContent>
        </Card>
      </PageSection>

      {/* 2. Apresentação -> Detalhes */}
      <PageSection title="Detalhes">
        <Card>
          <CardContent className="pt-6">
            <Field
              id="description"
              label="Descrição"
              error={formState.errors.description?.message}
              contador={contador(description, LIMITES_DO_CURSO.description)}
              dica={DICAS_DO_CURSO.description}
            >
              <MarkdownField
                id="description"
                name="description"
                maxLength={LIMITES_DO_CURSO.description}
                describedBy={descritoPor("description", { contador: true })}
              />
            </Field>
          </CardContent>
        </Card>
      </PageSection>

      {/* 3. Classificação */}
      <PageSection title="Classificação">
        <Card>
          <CardContent className="pt-6">
            <CourseLanguageLevelFields idiomaTravado={idiomaTravado} />
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
