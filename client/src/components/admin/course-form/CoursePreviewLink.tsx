import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";

/**
 * VISUALIZAR COMO ALUNO — no passo Publicar (decisão do operador, 04/10/2026):
 * abre a tela do aluno com este curso, em qualquer status, numa NOVA ABA, e o
 * editor fica aberto para ir ajustando. Lê o que está SALVO.
 */
export function CoursePreviewLink({ courseId }: { courseId: number }) {
  return (
    <PageSection title="Como o aluno vê">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            Abra o curso como ele aparece para o aluno, mesmo em rascunho. Mostra o que já está salvo.
          </p>
          <Link
            to={`/admin/cursos/${courseId}/previa`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: "outline" })}
          >
            <Eye className="size-4" aria-hidden="true" />
            Visualizar como aluno
          </Link>
        </CardContent>
      </Card>
    </PageSection>
  );
}
