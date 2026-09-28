import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { ListItemsField } from "./ListItemsField";

export function CourseListsSection() {
  return (
    <PageSection
      title="Listas e Detalhes"
      description="Estes campos alimentam as seções detalhadas da página de vendas do curso. Um item por campo, com até 160 caracteres."
    >
      <Card>
        <CardContent className="space-y-8 pt-6">
          <ListItemsField nome="learnTags" rotulo="O que vai aprender (learnTags)" />
          <ListItemsField nome="requirements" rotulo="Pré-requisitos" />
          <ListItemsField nome="personas" rotulo="Pra quem é (personas)" />
        </CardContent>
      </Card>
    </PageSection>
  );
}
