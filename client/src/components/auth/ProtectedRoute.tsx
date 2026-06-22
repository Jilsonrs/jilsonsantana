import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

// Gate for any authenticated route. While the session resolves we render a
// neutral loading state; without a session we redirect to /login.
export function ProtectedRoute() {
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

  return <Outlet />;
}
