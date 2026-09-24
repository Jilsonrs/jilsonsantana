import { useFormContext } from "react-hook-form";
import type { CourseFormValues } from "@/lib/course-form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field } from "./Field";

export function CourseMediaSection() {
  const { register, watch } = useFormContext<CourseFormValues>();
  const thumbnailUrl = watch("thumbnailUrl");
  const introVideoId = watch("introVideoId");

  return (
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
  );
}
