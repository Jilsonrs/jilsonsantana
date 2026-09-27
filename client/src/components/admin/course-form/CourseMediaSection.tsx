import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { CourseFormValues } from "@/lib/course-form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { BunnyPlayer } from "@/components/content/BunnyPlayer";
import { Field } from "./Field";
import { ThumbnailUpload } from "./ThumbnailUpload";
import { IntroVideoUpload } from "./IntroVideoUpload";

// `courseId` só existe depois que o curso é salvo: o envio grava a capa e o
// vídeo num curso que já existe (o nome do arquivo leva o slug dele).
// `videoSalvo` é o que o servidor devolveu para o curso: o id gravado e o player
// montado lá (null neste ambiente quando a biblioteca não está configurada).
export function CourseMediaSection({
  courseId,
  videoSalvo,
}: {
  courseId?: number;
  videoSalvo?: { id: string | null; embedUrl: string | null };
}) {
  const { register, watch, formState } = useFormContext<CourseFormValues>();
  const thumbnailUrl = watch("thumbnailUrl");
  const introVideoId = watch("introVideoId");
  const [embedEnviado, setEmbedEnviado] = useState<string | null>(null);

  // O player só aparece para um vídeo que o SERVIDOR confirmou: o que acabou de
  // ser enviado, ou o que já estava gravado. Um id digitado à mão e ainda não
  // salvo não tem player.
  const embedUrl =
    embedEnviado ?? (introVideoId && introVideoId === videoSalvo?.id ? videoSalvo.embedUrl : null);

  return (
    <PageSection
      title="Mídia e Apresentação"
      description="A imagem de capa e o vídeo promocional. A imagem deve estar em proporção 16:9 para encaixar perfeitamente nos cards."
    >
      <Card>
        <CardContent className="space-y-8 pt-6">
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="space-y-4">
              <Field id="thumbnailUrl" label="URL da thumbnail" error={formState.errors.thumbnailUrl?.message}>
                <Input id="thumbnailUrl" {...register("thumbnailUrl")} />
              </Field>
              {courseId !== undefined && <ThumbnailUpload courseId={courseId} />}
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-muted flex items-center justify-center">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-muted-foreground">Sem imagem</span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <Field id="introVideoId" label="ID do vídeo (Bunny)" error={formState.errors.introVideoId?.message}>
                <Input id="introVideoId" {...register("introVideoId")} />
              </Field>
              {courseId !== undefined && <IntroVideoUpload courseId={courseId} aoEnviar={setEmbedEnviado} />}
              {embedUrl ? (
                <BunnyPlayer src={embedUrl} title="Prévia do vídeo de apresentação" />
              ) : (
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </PageSection>
  );
}
