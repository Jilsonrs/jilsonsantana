import { Navigate, Outlet } from "react-router-dom";
import { Role } from "@jilson/core";
import { useSession } from "@/lib/auth-client";

// Admin-only gate: no session -> /login; authenticated non-admin -> /conta.
// Role is compared against the shared Role const, never a string literal.
export function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.role !== Role.ADMIN) {
    return <Navigate to="/conta" replace />;
  }

  return <Outlet />;
}
