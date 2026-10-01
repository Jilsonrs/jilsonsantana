import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { ListItemsField } from "./ListItemsField";

export function CourseListsSection() {
  return (
    <div className="space-y-10">
      <PageSection title="O que vai aprender">
        <Card>
          <CardContent className="pt-6">
            <ListItemsField nome="learnTags" rotulo="Entregáveis e Habilidades" />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="Pré-requisitos">
        <Card>
          <CardContent className="pt-6">
            <ListItemsField nome="requirements" rotulo="Requisitos" />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="Para quem é">
        <Card>
          <CardContent className="pt-6">
            <ListItemsField nome="personas" rotulo="Perfil do aluno" />
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
