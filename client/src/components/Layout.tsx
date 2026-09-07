import { Link, Outlet, useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AppRail } from "@/components/nav/AppRail";
import { MobileNav } from "@/components/nav/MobileNav";

/**
 * O shell do app. DUAS gramáticas, escolhidas pela sessão:
 *
 * - **Sem sessão** — cabeçalho simples. É a superfície pública (landing,
 *   catálogo, página de curso), que na Fase 3 vira template de servidor.
 * - **Com sessão** — a navegação em três níveis (design.md §13). Esta fatia
 *   entrega o nível 1; os níveis 2 e 3 entram nas seguintes, e já são lidos do
 *   mesmo mapa (`lib/navigation.ts`).
 *
 * O cromo segue a PESSOA, não a rota: o aluno logado que abre o catálogo — que
 * é rota pública — continua com o rail.
 */
export function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <Link to="/" className="font-semibold tracking-tight">
            <span className="text-primary">#</span>Jilson Santana
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/cursos">Catálogo</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          </nav>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <AppRail papel={session.user.role} onSignOut={handleSignOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav papel={session.user.role} onSignOut={handleSignOut} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
