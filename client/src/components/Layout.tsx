import { Link, Outlet, useNavigate } from "react-router-dom";
import { Role } from "@jilson/core";
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
        {/* Logado, a marca leva para a home DO ALUNO. Levar para a landing
            pública seria mandar quem já é assinante de volta para a página que
            tenta convencê-lo a assinar. */}
        <Link
          to={session ? "/inicio" : "/"}
          className="font-semibold tracking-tight"
        >
          <span className="text-primary">#</span>Jilson Santana
        </Link>
        <nav className="flex items-center gap-2">
          {session && (
            // Link explícito além da marca: clicar no logotipo é hábito de quem
            // já conhece o padrão, não de quem está começando.
            <Button asChild variant="ghost" size="sm">
              <Link to="/inicio">Início</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link to="/cursos">Catálogo</Link>
          </Button>
          {session?.user.role === Role.ADMIN && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {session ? (
            <>
              {/* Sem este link, quem entra só chega na própria conta digitando
                  o endereço. Provisório: some quando o menu lateral do aluno
                  entrar (implementation-plan → shell do aluno). */}
              <Button asChild variant="ghost" size="sm">
                <Link to="/conta">Minha conta</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sair
              </Button>
            </>
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
