import {
  Award,
  BarChart3,
  Bot,
  Globe,
  GraduationCap,
  Route,
  Signpost,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { MockHome, MockGrid, MockMap, MockUser } from "@/components/nav/MockIcons";
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
  icon: React.ElementType;
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
  { label: "Início", to: "/inicio", icon: MockHome, estado: "ativo" },
  // "Catálogo" com abas virou DUAS seções de primeiro nível (operador, set/2026):
  // "é mais fácil", e abre espaço para curso ao vivo e live session entrarem como
  // seções próprias em vez de mais uma aba escondida.
  {
    label: "Cursos",
    to: "/cursos",
    icon: MockGrid,
    estado: "ativo",
    tambemAtivoEm: ["/curso/"],
  },
  {
    label: "Trilhas",
    to: "/trilhas",
    icon: Route,
    // PLANEJADA, e não ativa: a lista pública de trilhas NÃO EXISTE. Ela era a
    // aba "Trilhas" do antigo Catálogo, apontando para /cursos/trilhas — uma
    // rota que nunca foi montada. Escondida numa aba isso passava; no rail
    // seria um link quebrado à vista. Vira "ativo" quando a tela nascer.
    estado: "planejado",
    tambemAtivoEm: ["/trilha/"],
  },
  { label: "Minhas trilhas", to: "/minhas-trilhas", icon: MockMap, estado: "ativo" },
  { label: "JilsonAI", to: "/jilsonai", icon: Bot, estado: "planejado" }, // Fase 6
  { label: "Certificados", to: "/certificados", icon: Award, estado: "planejado" }, // Fase 6.5
  {
    label: "Minha conta",
    to: "/conta",
    icon: MockUser,
    estado: "ativo",
    filhos: [
      { label: "Seus dados", to: "/conta" },
      { label: "Preferências", to: "/conta/preferencias" },
      { label: "Senha e Acesso", to: "/conta/seguranca" },
      { label: "Sessões ativas", to: "/conta/sessoes" },
      { label: "Faturamento e Assinatura", to: "/conta/faturamento" },
      { label: "Integrações", to: "/conta/integracoes" },
    ],
  },

  // ---------------------------------------------------------------- ADMIN
  {
    // "Admin" no rótulo porque o aluno tem "Cursos" e "Trilhas" logo acima
    // (operador, set/2026): dois itens com o mesmo nome no mesmo rail, e no
    // modo recolhido só o ícone aparece.
    label: "Cursos Admin",
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
    label: "Trilhas Admin",
    to: "/admin/trilhas",
    icon: Signpost,
    papel: Role.ADMIN,
    estado: "planejado", // Bloco 6b
  },
  {
    label: "Site",
    to: "/admin/site",
    // `Globe` e não `MockGrid`: este item nasceu com o MESMO ícone do "Catálogo"
    // do aluno, e no rail RECOLHIDO só o ícone aparece — dois itens viravam
    // indistinguíveis. Ícone repetido é defeito de navegação, não de estética.
    icon: Globe,
    papel: Role.ADMIN,
    estado: "ativo",
  },
  {
    label: "Alunos",
    to: "/admin/alunos",
    icon: Users,
    papel: Role.ADMIN,
    estado: "planejado", // Fase 4
  },
  {
    // Mesmo caso de "Cursos Admin": o aluno também tem um "JilsonAI".
    label: "JilsonAI Admin",
    to: "/admin/jilsonai",
    icon: SlidersHorizontal,
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
