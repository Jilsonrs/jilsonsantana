import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { useT } from "@/lib/language";
import { TelaDeErro } from "@/components/ErroDaTela";

// Gate for any authenticated route. While the session resolves we render a
// neutral loading state; without a session we redirect to /login.
export function ProtectedRoute() {
  const t = useT();
  const { data: session, isPending, error } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
        {t.comum.carregando}
      </div>
    );
  }

  // A conferência da sessão FALHOU (rede, servidor) — não é "sem login": mandar
  // para o login poria para fora quem está logado (06/10/2026). O 401 é "sem login".
  if (!session && error && error.status !== 401) return <TelaDeErro />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
