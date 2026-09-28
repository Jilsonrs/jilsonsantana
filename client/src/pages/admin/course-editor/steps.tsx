import { Navigate, Route } from "react-router-dom";
import { ContentStatus } from "@jilson/core";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { CourseBasicsSection } from "@/components/admin/course-form/CourseBasicsSection";
import { CourseListsSection } from "@/components/admin/course-form/CourseListsSection";
import { CourseMediaSection } from "@/components/admin/course-form/CourseMediaSection";
import { CourseLayersSection } from "@/components/admin/course-form/CourseLayersSection";
import { CoursePublishSection } from "@/components/admin/course-form/CoursePublishSection";
import { HighlightsField } from "@/components/admin/HighlightsField";
import { FaqField } from "@/components/admin/FaqField";
import { ModuleLessonTree } from "@/components/admin/ModuleLessonTree";
import { useCursoDoEditor } from "./CourseEditorLayout";
import { StepForm } from "./StepForm";

// Os passos do editor do curso — o que cada um mostra é decisão do operador
// (28/09/2026). Legendas e Mensagens ainda não têm tela (etapas 3 e 4 do Bloco E).

function PassoBasico() {
  const { curso } = useCursoDoEditor();
  return (
    <StepForm passo="basico">
      {/* Trava pelo status GRAVADO, não pelo do formulário: é ele que o servidor confere. */}
      <CourseBasicsSection idiomaTravado={curso.status !== ContentStatus.DRAFT} />
    </StepForm>
  );
}

function PassoParaQuemE() {
  return (
    <StepForm passo="para-quem-e">
      <CourseListsSection />
    </StepForm>
  );
}

// Módulos e aulas se salvam item a item: este passo não tem o Salvar do passo.
function PassoConteudo() {
  const { curso } = useCursoDoEditor();
  return (
    <PageSection
      title="Módulos e Aulas"
      description="Gerencie a estrutura do curso. Adicione os módulos e as aulas do curso."
    >
      <ModuleLessonTree courseId={curso.id} />
    </PageSection>
  );
}

function PassoPagina() {
  const { curso } = useCursoDoEditor();
  return (
    <StepForm passo="pagina">
      <CourseMediaSection
        courseId={curso.id}
        videoSalvo={{ id: curso.introVideoId, embedUrl: curso.introVideoEmbedUrl }}
      />
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
      <CourseLayersSection />
    </StepForm>
  );
}

function PassoPublicar() {
  return (
    <StepForm passo="publicar">
      <CoursePublishSection />
    </StepForm>
  );
}

/**
 * As rotas filhas de `/admin/cursos/:id`. Moram aqui, e não no `App.tsx`, para
 * o teste montar exatamente as mesmas rotas que o app. O endereço sem passo
 * leva ao primeiro — é o "Editar" do cartão da lista.
 */
export const ROTAS_DO_EDITOR = (
  <>
    <Route index element={<Navigate to="basico" replace />} />
    <Route path="basico" element={<PassoBasico />} />
    <Route path="para-quem-e" element={<PassoParaQuemE />} />
    <Route path="conteudo" element={<PassoConteudo />} />
    <Route path="pagina" element={<PassoPagina />} />
    <Route path="publicar" element={<PassoPublicar />} />
  </>
);
