import { Link, Outlet, useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

// Minimal app shell — a thin header + the routed content. The definitive
// design.md layout (fonts, hero, polish) lands in the later design pass.
export function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/" className="font-semibold tracking-tight">
          <span className="text-primary">#</span>Jilson Santana
        </Link>
        <nav>
          {session ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
