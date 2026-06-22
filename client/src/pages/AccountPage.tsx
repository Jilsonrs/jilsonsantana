import { useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function AccountPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Minha conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Nome" value={user?.name ?? "—"} />
          <Field label="E-mail" value={user?.email ?? "—"} />
          <Field label="Papel" value={user?.role ?? "—"} />
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="mt-4 w-full"
          >
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
