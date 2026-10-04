import { lazy, Suspense } from "react";
import { Navigate, Route } from "react-router-dom";
import { ContentStatus } from "@jilson/core";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { CourseBasicsSection } from "@/components/admin/course-form/CourseBasicsSection";
import { CourseListsSection } from "@/components/admin/course-form/CourseListsSection";
import { CourseMediaSection } from "@/components/admin/course-form/CourseMediaSection";
import { CourseLayersSection } from "@/components/admin/course-form/CourseLayersSection";
import { CoursePublishSection } from "@/components/admin/course-form/CoursePublishSection";
import { CourseLinkField } from "@/components/admin/course-form/CourseLinkField";
import { CompletenessBar } from "@/components/admin/CompletenessBar";
import { camposDoCurso, preenchimentoDoCurso } from "@/lib/course-completeness";
import { HighlightsField } from "@/components/admin/HighlightsField";
import { FaqField } from "@/components/admin/FaqField";
import { useCursoDoEditor } from "./CourseEditorLayout";
import { StepForm } from "./StepForm";
import { CaptionsStep } from "@/components/admin/captions/CaptionsStep";
import { CourseMaterialsSection } from "@/components/admin/course-form/CourseMaterialsSection";
import { CourseMessagesSection } from "@/components/admin/course-form/CourseMessagesSection";
import { CoursePreviewLink } from "@/components/admin/course-form/CoursePreviewLink";

// Os passos do editor do curso — o que cada um mostra é decisão do operador
// (28/09/2026). Legendas e Mensagens ganharam as suas em 04/10.

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

// O Conteúdo carrega SOB DEMANDA: é ele que traz a peça de arrastar (dnd-kit), e
// assim ela não entra no pacote que todo aluno baixa (plano de 28/09/2026).
const ModuleLessonTree = lazy(() =>
  import("@/components/admin/course-content/ModuleLessonTree").then((m) => ({ default: m.ModuleLessonTree })),
);

// Módulos e aulas se salvam item a item: este passo não tem o Salvar do passo.
function PassoConteudo() {
  const { curso } = useCursoDoEditor();
  return (
    <PageSection title="Módulos e Aulas">
      <Suspense fallback={<p className="text-muted-foreground">Carregando…</p>}>
        <ModuleLessonTree courseId={curso.id} />
      </Suspense>
    </PageSection>
  );
}

// As legendas se salvam linha a linha, com a mensagem flutuante do editor (04/10/2026).
function PassoLegendas() {
  const { curso, avisar } = useCursoDoEditor();
  return <CaptionsStep courseId={curso.id} avisar={avisar} />;
}

function PassoPagina() {
  const { curso } = useCursoDoEditor();
  return (
    <StepForm passo="pagina">
      <CourseMediaSection
        courseId={curso.id}
        videoSalvo={{ id: curso.introVideoId, embedUrl: curso.introVideoEmbedUrl }}
      />
      <PageSection title="Destaques (Highlights)">
        <Card>
          <CardContent className="pt-6">
            <HighlightsField />
          </CardContent>
        </Card>
      </PageSection>
      <PageSection title="Perguntas Frequentes (FAQ)">
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

// As duas mensagens que chegam ao aluno pelo sino (operador, 04/10/2026).
function PassoMensagens() {
  return (
    <StepForm passo="mensagens">
      <CourseMessagesSection />
    </StepForm>
  );
}

// O que falta, o status, a ordem no catálogo e o link (operador, 27–28/09/2026).
// O que falta e o link leem o curso GRAVADO, como o ✓.
function PassoPublicar() {
  const { curso } = useCursoDoEditor();
  const { porcentagem, faltando } = preenchimentoDoCurso(camposDoCurso(curso));
  return (
    <StepForm passo="publicar">
      <PageSection title="O que falta">
        <Card>
          <CardContent className="pt-6">
            <CompletenessBar titulo={curso.title} porcentagem={porcentagem} faltando={faltando} />
          </CardContent>
        </Card>
      </PageSection>
      <CoursePublishSection />
      <CourseMaterialsSection />
      {/* Ver como o aluno vê, em qualquer status (operador, 04/10/2026). */}
      <CoursePreviewLink courseId={curso.id} />
      <CourseLinkField slug={curso.slug} idioma={curso.language} />
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
    <Route path="legendas" element={<PassoLegendas />} />
    <Route path="pagina" element={<PassoPagina />} />
    <Route path="mensagens" element={<PassoMensagens />} />
    <Route path="publicar" element={<PassoPublicar />} />
  </>
);
