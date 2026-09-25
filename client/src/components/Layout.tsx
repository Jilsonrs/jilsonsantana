import { Link, Outlet, useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AppRail } from "@/components/nav/AppRail";
import { MobileNav } from "@/components/nav/MobileNav";
import { SecondaryNav } from "@/components/nav/SecondaryNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { ROTAS_PUBLICAS } from "@jilson/core";
import { IdiomaProvider, useIdioma, useIdiomaDoShell, useT } from "@/lib/language";

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
 *
 * É AQUI que se decide o idioma do app, uma vez só (`useIdiomaDoShell`): todas
 * as telas abaixo leem o mesmo valor pelo `IdiomaProvider`.
 */
export function Layout() {
  const idioma = useIdiomaDoShell();
  return (
    <IdiomaProvider idioma={idioma}>
      <Shell />
    </IdiomaProvider>
  );
}

function Shell() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const idioma = useIdioma();
  const t = useT();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (!session) {
    return (
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          {/* Link de verdade, não <Link>: a home é página do servidor. Vai para a
              home do idioma de quem está no login. */}
          <a href={ROTAS_PUBLICAS[idioma].home} className="font-semibold tracking-tight">
            <span className="text-primary">#</span>Jilson Santana
          </a>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/cursos">{t.header.catalogo}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              {/* O login continua no idioma de quem chegou em inglês. */}
              <Link to={idioma === "en" ? "/login?lang=en" : "/login"}>{t.header.entrar}</Link>
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
      <AppRail papel={session.user.role} />
      <SecondaryNav papel={session.user.role} usuario={session.user} onSignOut={handleSignOut} />
      <div className="flex min-w-0 flex-1 flex-col relative">
        {/* No celular, é um cabeçalho real que empurra o conteúdo (como na home pública).
            No desktop (md:), vira invisível estruturalmente (absolute) para não roubar espaço do layout,
            deixando apenas o menu da conta flutuando. */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:absolute md:border-none md:left-0 md:right-0 md:top-0 md:z-50 md:p-0 md:px-[50px] md:py-6 md:pointer-events-none">
          <div className="md:hidden pointer-events-auto">
            <MobileNav papel={session.user.role} onSignOut={handleSignOut} />
          </div>
          <div className="ml-auto pointer-events-auto">
            <AccountMenu usuario={session.user} onSignOut={handleSignOut} />
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
        {/* Só com sessão (aluno e admin): o visitante está na superfície
            pública, que tem o rodapé dela no servidor. */}
        <AppFooter />
      </div>
    </div>
  );
}
