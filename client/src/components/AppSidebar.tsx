import type { ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Home, Library, LogOut, Route, User } from "lucide-react";
import { Role } from "@jilson/core";
import { useSession, signOut } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * A barra lateral do produto — UMA para os dois ambientes, aluno e admin.
 *
 * Não são dois componentes por decisão explícita (implementation-plan → Bloco
 * S): dois divergem em espaçamento, foco e estados, e a divergência aparece
 * como "a área de admin parece outro site".
 *
 * Só renderiza quando há sessão. O cromo segue a PESSOA, não a rota: o aluno
 * logado mantém a barra mesmo no catálogo, que é rota pública.
 */

// Pílula azul do item ativo (design.md §13: é o ÚNICO lugar onde o azul
// aparece no rail — o hover é neutro, senão o rail perde o sinal de "onde
// estou").
//
// Aplicada como classe comum, e NÃO via a prop `isActive` do shadcn, de
// propósito: `isActive` liga `data-[active=true]:bg-sidebar-accent`, um
// seletor de atributo com especificidade maior que a de uma classe — o azul
// perderia para o cinza sem erro nenhum, só a cor errada na tela. Aqui não há
// disputa: o estilo do ativo é a única regra em jogo.
const ITEM_ATIVO =
  "bg-primary-tint text-primary-tint-foreground font-medium " +
  "hover:bg-primary-tint hover:text-primary-tint-foreground";

type ItemProps = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Rotas que também acendem este item (ex.: a página de um curso acende o Catálogo). */
  tambemAtivoEm?: string[];
};

function NavItem({ to, label, icon: Icon, tambemAtivoEm = [] }: ItemProps) {
  const { pathname } = useLocation();
  const ativo =
    pathname === to ||
    pathname.startsWith(`${to}/`) ||
    tambemAtivoEm.some((prefixo) => pathname.startsWith(prefixo));

  return (
    <SidebarMenuItem>
      {/* `tooltip` mostra o rótulo no hover quando recolhida. Ele é conforto
          visual, NUNCA a acessibilidade: o <span> abaixo continua no DOM e na
          árvore de acessibilidade mesmo recolhido (o shadcn o recorta com
          overflow, não com display:none), então quem usa leitor de tela ouve
          o rótulo nos dois estados. É a trava do Bloco S, e tem teste. */}
      <SidebarMenuButton
        asChild
        tooltip={label}
        aria-current={ativo ? "page" : undefined}
        className={ativo ? ITEM_ATIVO : undefined}
      >
        <Link to={to}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  if (!session) return null;

  const ehAdmin = session.user.role === Role.ADMIN;

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/inicio">
                <span className="text-primary font-semibold">#</span>
                {/* Some ao recolher: a marca inteira não cabe em 3rem, e o "#"
                    sozinho já identifica. */}
                <span className="font-semibold tracking-tight">Jilson Santana</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Landmark de navegação, para quem pula de região em região no leitor
          de tela. Vai como `role` porque a peça do shadcn renderiza uma <div>
          e não aceita trocar a tag — num <nav> de verdade o role seria
          redundante. O rótulo não repete a palavra "navegação": o leitor já
          anuncia o papel, e sairia "navegação principal navegação". */}
      <SidebarContent aria-label="Principal" role="navigation">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem to="/inicio" label="Início" icon={Home} />
              <NavItem
                to="/cursos"
                label="Catálogo"
                icon={Library}
                tambemAtivoEm={["/curso/", "/trilha/"]}
              />
              <NavItem to="/minhas-trilhas" label="Minhas trilhas" icon={Route} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* O aluno não vê este grupo. Não é sobre acesso — o servidor barra de
            qualquer jeito — é sobre não anunciar a existência de uma área que
            não é dele. */}
        {ehAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/admin/cursos" label="Cursos" icon={GraduationCap} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <NavItem to="/conta" label="Minha conta" icon={User} />
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
