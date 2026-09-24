import { useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";
import { useT } from "@/lib/language";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2.5 py-2">
      <span className="text-sm font-medium text-muted-foreground w-12">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function AccountPage() {
  const t = useT();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <PageContainer>
      <PageHeader 
        title={t.conta.titulo}
        description={t.conta.descricao}
      />

      <div className="space-y-12">
        <PageSection
          title={t.conta.seusDados}
          description={t.conta.seusDadosDescricao}
        >
          <Card className="max-w-3xl">
            <CardContent className="space-y-2 pt-6">
              <Field label={t.conta.nome} value={user?.name ?? "—"} />
              <div className="h-px w-full bg-border/40" />
              <Field label={t.conta.email} value={user?.email ?? "—"} />
              <div className="h-px w-full bg-border/40" />
              <Field label={t.conta.papel} value={user?.role ?? "—"} />
            </CardContent>
          </Card>
        </PageSection>

        <div className="flex justify-start border-t border-border/40 pt-8">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full sm:w-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {t.conta.sair}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
