import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  Bot,
  GraduationCap,
  Home,
  Library,
  Route,
  User,
  Users,
} from "lucide-react";
import { Role } from "@jilson/core";

/**
 * O MAPA DE NAVEGAÇÃO — a navegação do produto inteiro, como DADO.
 *
 * Nenhum componente de navegação sabe quais telas existem: todos leem daqui.
 * É isto que permite uma tela nova entrar no sistema **declarando** seus níveis,
 * em vez de reinventar menu a cada tela (implementation-plan → Bloco S2).
 *
 * TRÊS NÍVEIS, e cada seção liga só os que precisa:
 *   1. a própria seção  → o rail escuro (sempre)
 *   2. `filhos`         → a coluna secundária (só se houver)
 *   3. `abas`           → as abas no topo do conteúdo (só se houver)
 */

export type Aba = { label: string; to: string };

export type ItemSecundario = {
  label: string;
  to: string;
  /** Agrupa itens sob um título retrátil na coluna secundária (ex.: "Engajamento"). */
  grupo?: string;
};

export type Secao = {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Ausente = qualquer pessoa logada. Presente = só este papel. */
  papel?: Role;
  /**
   * "planejado" documenta a forma de uma tela que AINDA NÃO EXISTE, sem
   * renderizar nada. É o que permite rascunhar o sistema inteiro sem enviar
   * ninguém para um link quebrado: quando a tela nasce, isto vira "ativo" —
   * uma palavra, sem tocar em componente nenhum.
   */
  estado: "ativo" | "planejado";
  filhos?: ItemSecundario[];
  abas?: Aba[];
  /** Rotas que também acendem esta seção (ex.: a página de um curso acende o Catálogo). */
  tambemAtivoEm?: string[];
};

export const NAVEGACAO: Secao[] = [
  // ---------------------------------------------------------------- ALUNO
  { label: "Início", to: "/inicio", icon: Home, estado: "ativo" },
  {
    label: "Catálogo",
    to: "/cursos",
    icon: Library,
    estado: "ativo",
    tambemAtivoEm: ["/curso/", "/trilha/"],
    abas: [
      { label: "Cursos", to: "/cursos" },
      { label: "Trilhas", to: "/cursos/trilhas" },
    ],
  },
  { label: "Minhas trilhas", to: "/minhas-trilhas", icon: Route, estado: "ativo" },
  { label: "JilsonAI", to: "/jilsonai", icon: Bot, estado: "planejado" }, // Fase 6
  { label: "Certificados", to: "/certificados", icon: Award, estado: "planejado" }, // Fase 6.5
  {
    label: "Minha conta",
    to: "/conta",
    icon: User,
    estado: "ativo",
    // "Assinatura" e "Preferências" são Fase 4 / passada de conta. Com um item
    // só a coluna secundária não aparece — uma coluna de um item é ruído, não
    // navegação —, então hoje `/conta` renderiza sem nível 2, de propósito.
    filhos: [{ label: "Seus dados", to: "/conta" }],
  },

  // ---------------------------------------------------------------- ADMIN
  {
    label: "Cursos",
    to: "/admin/cursos",
    icon: GraduationCap,
    papel: Role.ADMIN,
    estado: "ativo",
    abas: [
      { label: "Publicados", to: "/admin/cursos" },
      { label: "Rascunhos", to: "/admin/cursos/rascunhos" },
      { label: "Arquivados", to: "/admin/cursos/arquivados" },
    ],
  },
  {
    label: "Trilhas",
    to: "/admin/trilhas",
    icon: Route,
    papel: Role.ADMIN,
    estado: "planejado", // Bloco 6b
  },
  {
    label: "Alunos",
    to: "/admin/alunos",
    icon: Users,
    papel: Role.ADMIN,
    estado: "planejado", // Fase 4
  },
  {
    label: "JilsonAI",
    to: "/admin/jilsonai",
    icon: Bot,
    papel: Role.ADMIN,
    estado: "planejado", // Fase 6
    filhos: [
      { label: "Escalações", to: "/admin/jilsonai/escalacoes" },
      { label: "Persona", to: "/admin/jilsonai/persona" },
      { label: "Modelo", to: "/admin/jilsonai/modelo" },
      { label: "Quotas", to: "/admin/jilsonai/quotas" },
    ],
  },
  {
    label: "Dados",
    to: "/admin/dados",
    icon: BarChart3,
    papel: Role.ADMIN,
    estado: "planejado", // Fase 5 / 7
  },
];

/**
 * As seções que ESTA pessoa vê. Dois filtros, e os dois importam:
 *
 * - `estado` — "planejado" nunca renderiza, senão o rascunho do mapa viraria
 *   um menu cheio de link quebrado.
 * - `papel` — o aluno não vê as seções de admin. Não é sobre acesso (o servidor
 *   barra de qualquer jeito): é sobre não anunciar a existência de uma área que
 *   não é dele.
 */
export function secoesVisiveis(papel: string | undefined): Secao[] {
  return NAVEGACAO.filter(
    (s) => s.estado === "ativo" && (s.papel === undefined || s.papel === papel),
  );
}

/**
 * Qual seção a rota atual acende. A mais ESPECÍFICA vence: sem isso
 * `/admin/cursos` acenderia também o "Catálogo" do aluno se o casamento fosse
 * por prefixo solto, e o rail mostraria dois itens ativos.
 */
export function secaoAtiva(pathname: string, secoes: Secao[]): Secao | undefined {
  const candidatas = secoes.filter(
    (s) =>
      pathname === s.to ||
      pathname.startsWith(`${s.to}/`) ||
      (s.tambemAtivoEm ?? []).some((p) => pathname.startsWith(p)),
  );
  return candidatas.sort((a, b) => b.to.length - a.to.length)[0];
}

/**
 * Os itens do nível 2 para a rota atual — vazio quando a coluna não deve
 * aparecer. **Um item só conta como vazio**: uma coluna com uma linha é ruído
 * visual, não navegação.
 */
export function itensSecundarios(pathname: string, secoes: Secao[]): ItemSecundario[] {
  const filhos = secaoAtiva(pathname, secoes)?.filhos ?? [];
  return filhos.length > 1 ? filhos : [];
}

/** As abas do nível 3 para a rota atual — vazio quando não há abas. */
export function abasDaRota(pathname: string, secoes: Secao[]): Aba[] {
  return secaoAtiva(pathname, secoes)?.abas ?? [];
}
