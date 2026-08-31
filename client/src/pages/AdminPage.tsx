import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Admin dashboard — entry point into content management (Bloco 6).
export function AdminPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Link to="/admin/cursos" className="hover:underline">
              Cursos
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Criar e editar cursos, módulos e aulas.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Link to="/admin/trilhas" className="hover:underline">
              Trilhas
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Montar trilhas curadas (Bloco 6b).
        </CardContent>
      </Card>
    </div>
  );
}
