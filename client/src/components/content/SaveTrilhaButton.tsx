import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { saveTrilha } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useIdioma, useT } from "@/lib/language";

// Member-only write. Logged-out visitors see a link to /login instead of a
// disabled button — "onboarding aberto e livre" (CLAUDE.md), the gate only
// kicks in on the action that actually requires an account.
export function SaveTrilhaButton({ planId }: { planId: number }) {
  const t = useT();
  const idioma = useIdioma();
  const { data: session, isPending } = useSession();
  const mutation = useMutation({ mutationFn: () => saveTrilha(planId) });

  if (isPending) return null;

  if (!session) {
    return (
      <Button asChild>
        {/* O login continua no idioma da tela. */}
        <Link to={idioma === "en" ? "/login?lang=en" : "/login"}>{t.trilha.entrarParaSalvar}</Link>
      </Button>
    );
  }

  if (mutation.isSuccess) {
    return (
      <Button disabled variant="secondary">
        {t.trilha.salva}
      </Button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? t.trilha.salvando : t.trilha.salvar}
      </Button>
      {mutation.isError && (
        <p className="text-sm text-destructive">{t.trilha.erroSalvar}</p>
      )}
    </div>
  );
}
