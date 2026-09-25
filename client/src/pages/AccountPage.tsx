import { useSession } from "@/lib/auth-client";
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
  const user = session?.user;

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
        {/* Sem botão de sair aqui: em Minha conta o "Sair" fica só na coluna
            lateral (decisão do operador, 24/09/2026). O global está no menu da foto. */}
      </div>
    </PageContainer>
  );
}
