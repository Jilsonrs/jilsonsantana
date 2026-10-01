import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { ListItemsField } from "./ListItemsField";

export function CourseListsSection() {
  return (
    <div className="space-y-10">
      <PageSection
        title="O que vai aprender"
        description="Frases curtas e objetivas que destacam as principais habilidades ou entregas do curso."
      >
        <Card>
          <CardContent className="pt-6">
            <ListItemsField nome="learnTags" rotulo="Entregáveis e Habilidades" />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="Pré-requisitos"
        description="O que o aluno precisa saber ou ter antes de começar. Se não precisa de nada, deixe claro que é para iniciantes."
      >
        <Card>
          <CardContent className="pt-6">
            <ListItemsField nome="requirements" rotulo="Requisitos" />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="Para quem é"
        description="Identifique as personas: profissoes, momentos de carreira ou objetivos da pessoa que mais vai aproveitar o curso."
      >
        <Card>
          <CardContent className="pt-6">
            <ListItemsField nome="personas" rotulo="Perfil do aluno" />
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
