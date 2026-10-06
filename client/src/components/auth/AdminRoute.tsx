import { Navigate, Outlet } from "react-router-dom";
import { Role } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { TelaDeErro } from "@/components/ErroDaTela";

// Admin-only gate: no session -> /login; authenticated non-admin -> /aluno/conta.
// Role is compared against the shared Role const, never a string literal.
export function AdminRoute() {
  const { data: session, isPending, error } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
        {/* O admin fica em português (decisão do operador, 23/09/2026). */}
        Carregando…
      </div>
    );
  }

  // A conferência da sessão FALHOU (rede, servidor) — não é "sem login": mandar
  // para o login poria para fora quem está logado (06/10/2026). O 401 é "sem login".
  if (!session && error && error.status !== 401) return <TelaDeErro />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.role !== Role.ADMIN) {
    return <Navigate to="/aluno/conta" replace />;
  }

  return <Outlet />;
}
