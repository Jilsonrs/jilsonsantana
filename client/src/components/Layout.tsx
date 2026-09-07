import { Link, Outlet } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Quem recolheu a barra não quer recolher de novo a cada visita.
 *
 * A peça do shadcn ESCREVE este cookie mas nunca o lê — no desenho dela quem
 * lê é o servidor que renderiza a página, que aqui não existe. Sem esta
 * função a barra voltaria aberta sempre, sem erro nenhum: a persistência
 * simplesmente não aconteceria, e ninguém notaria além do aluno.
 *
 * Aberta é o padrão quando não há cookie (decisão do operador: começa aberta).
 */
function barraComecaAberta(): boolean {
  const achado = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  return achado ? achado.split("=")[1] !== "false" : true;
}

/**
 * O shell do app. DUAS gramáticas, escolhidas pela sessão:
 *
 * - **Sem sessão** — cabeçalho simples. É a superfície pública (landing,
 *   catálogo, página de curso), que na Fase 3 vira template de servidor.
 * - **Com sessão** — barra lateral (design.md §13: a área logada é um shell de
 *   aplicação, não uma landing).
 *
 * O cromo segue a PESSOA, não a rota: o aluno logado que abre o catálogo — que
 * é rota pública — continua com a barra.
 */
export function Layout() {
  const { data: session } = useSession();

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
    <SidebarProvider defaultOpen={barraComecaAberta()}>
      <AppSidebar />
      {/* `SidebarInset` JÁ é o <main> da página — por isso o conteúdo entra
          direto aqui. Envolver o Outlet num segundo <main> aninharia landmark
          dentro de landmark, que é HTML inválido e confunde quem navega por
          regiões no leitor de tela. */}
      <SidebarInset>
        {/* Cabeçalho magro: só o botão que recolhe/expande (e que no celular
            abre a gaveta). A navegação inteira mora na barra agora. */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
