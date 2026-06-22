import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder that exists only to prove the AdminRoute gate. Real content
// management (courses/modules/lessons/trilhas) arrives in Phase 2.
export function AdminPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Área administrativa. Gestão de conteúdo chega na Fase 2 — por
            enquanto isto só comprova o gate de admin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
