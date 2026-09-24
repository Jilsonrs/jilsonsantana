import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";

// Admin dashboard — entry point into content management (Bloco 6).
export function AdminPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Admin" 
        description="Visão geral e acesso rápido às ferramentas de gestão da escola."
      />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        <Card className="transition-all hover:shadow-md hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">
              <Link to="/admin/cursos" className="hover:underline flex items-center gap-2">
                Cursos
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Criar e editar cursos, módulos e aulas. Configure o conteúdo que os alunos irão acessar.
          </CardContent>
        </Card>
        
        <Card className="transition-all hover:shadow-md hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">
              <Link to="/admin/trilhas" className="hover:underline flex items-center gap-2">
                Trilhas
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Montar trilhas curadas combinando diversos cursos (Bloco 6b).
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md hover:border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">
              <Link to="/admin/site" className="hover:underline flex items-center gap-2">
                Site
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Gerencie textos institucionais, depoimentos de alunos e perguntas frequentes.
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
