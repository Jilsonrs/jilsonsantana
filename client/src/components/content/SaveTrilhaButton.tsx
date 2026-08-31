import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { saveTrilha } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Member-only write. Logged-out visitors see a link to /login instead of a
// disabled button — "onboarding aberto e livre" (CLAUDE.md), the gate only
// kicks in on the action that actually requires an account.
export function SaveTrilhaButton({ planId }: { planId: number }) {
  const { data: session, isPending } = useSession();
  const mutation = useMutation({ mutationFn: () => saveTrilha(planId) });

  if (isPending) return null;

  if (!session) {
    return (
      <Button asChild>
        <Link to="/login">Entrar para salvar</Link>
      </Button>
    );
  }

  if (mutation.isSuccess) {
    return (
      <Button disabled variant="secondary">
        Trilha salva ✓
      </Button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Salvando…" : "Salvar trilha"}
      </Button>
      {mutation.isError && (
        <p className="text-sm text-destructive">Não foi possível salvar. Tente de novo.</p>
      )}
    </div>
  );
}
