import {
  Bot,
  Globe,
  Library,
  PlayCircle,
  Route,
  Signpost,
  SlidersHorizontal,
  SquarePen,
  Users,
} from "lucide-react";
import { MockHome, MockGrid, MockMap, MockUser } from "@/components/nav/MockIcons";
import { Role, pt, type Dict } from "@jilson/core";
import { PASSOS_DO_CURSO } from "@/lib/course-steps";

/**
 * "Minha conta". Constante porque a coluna secundária desenha a da conta de um
 * jeito próprio (foto, nome, Sair) e precisa reconhecê-la pelo endereço.
 */
export const ROTA_DA_CONTA = "/aluno/conta";

/** Os textos do app (a parte `app` do dicionário) — de onde vêm os rótulos do aluno. */
type AppTexts = Dict["app"];

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
  /** Tela que ainda não existe: sai como TEXTO, nunca link (mesma trava do rail). */
  estado?: "planejado";
  /** Identifica o item para a marca de "completo" (ex.: o passo do editor do curso). */
  chave?: string;
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
  /**
   * Não aparece no menu lateral nem na gaveta do celular — mas CONTINUA no mapa,
   * para a coluna secundária dela funcionar. É o caso de "Minha conta", que mora
   * no menu da foto (decisão do operador, 24/09/2026).
   */
  foraDoMenuLateral?: true;
  /**
   * De onde vem o ✓ de "completo" dos itens do nível 2. Hoje só existe um caso:
   * os passos do editor do curso, lidos do curso gravado (`lib/nav-marks.ts`).
   */
  marcas?: "passos-do-curso";
  /**
   * O nível 2 que NÃO é lista fixa: vem dos dados da tela. Hoje só existe um
   * caso, a página da aula, onde o nível 2 é o conteúdo do curso daquela aula
   * (etapa 4 do Bloco U, 29/09/2026 — `components/aula/CourseContentsNav.tsx`).
   */
  nivel2?: "conteudo-do-curso";
};

/**
 * O mapa, com os rótulos no idioma do app.
 *
 * RÓTULO DO ALUNO sai do dicionário (`t.nav`), porque o app do aluno existe em
 * inglês (decisão do operador, 24/09/2026). RÓTULO DE ADMIN é texto escrito
 * aqui, em português: o Admin não muda de idioma (decisão dele, 23/09).
 */
export function navegacao(t: AppTexts): Secao[] {
  return [
    // ---------------------------------------------------------------- ALUNO
    // O Início é DIFERENTE por papel (decisão do operador, 29/09/2026): o aluno
    // vai ao painel dele; o admin, ao painel da escola (`/admin`, logo abaixo).
    // `papel` aqui é o que impede o admin de ver dois "Início" no mesmo menu.
    { label: t.nav.inicio, to: "/aluno/inicio", icon: MockHome, papel: Role.MEMBER, estado: "ativo" },
    {
      // O painel do admin: os relatórios que eram a seção "Dados" (mapeados pelo
      // operador em 28/09) viraram o Início dele. Rótulo em português (Admin).
      label: "Início",
      to: "/admin",
      icon: MockHome,
      papel: Role.ADMIN,
      estado: "ativo",
    },
    // "Catálogo" com abas virou DUAS seções de primeiro nível (operador, set/2026):
    // "é mais fácil", e abre espaço para curso ao vivo e live session entrarem como
    // seções próprias em vez de mais uma aba escondida.
    {
      label: t.nav.cursos,
      to: "/cursos",
      icon: MockGrid,
      estado: "ativo",
      tambemAtivoEm: ["/curso/"],
    },
    {
      label: t.nav.trilhas,
      to: "/trilhas",
      icon: Route,
      estado: "ativo",
      tambemAtivoEm: ["/trilha/"],
    },
    {
      // MEUS ESTUDOS (decisão do operador, 29/09/2026, a partir do "My Library"
      // do LinkedIn Learning): o que é DO ALUNO, separado do que ele descobre
      // (Cursos, Trilhas). Tem tela própria, com um resumo dos quatro itens.
      // "Minhas trilhas" mantém o endereço dela e acende esta seção.
      label: t.nav.meusEstudos,
      to: "/aluno/meus-estudos",
      icon: MockMap,
      estado: "ativo",
      tambemAtivoEm: ["/aluno/minhas-trilhas"],
      filhos: [
        { label: t.nav.emAndamento, to: "/aluno/em-andamento", estado: "planejado" }, // Fase 5
        { label: t.nav.minhasTrilhas, to: "/aluno/minhas-trilhas" },
        { label: t.nav.concluidos, to: "/aluno/concluidos", estado: "planejado" }, // Fase 5
        { label: t.nav.certificados, to: "/aluno/certificados", estado: "planejado" }, // Fase 6.5
      ],
    },
    { label: t.nav.jilsonai, to: "/aluno/jilsonai", icon: Bot, estado: "planejado" }, // Fase 6
    {
      label: t.nav.minhaConta,
      to: ROTA_DA_CONTA,
      icon: MockUser,
      estado: "ativo",
      foraDoMenuLateral: true,
      filhos: [
        { label: t.nav.seusDados, to: ROTA_DA_CONTA },
        { label: t.nav.preferencias, to: `${ROTA_DA_CONTA}/preferencias` },
        { label: t.nav.senhaEAcesso, to: `${ROTA_DA_CONTA}/seguranca` },
        { label: t.nav.sessoesAtivas, to: `${ROTA_DA_CONTA}/sessoes` },
        { label: t.nav.faturamento, to: `${ROTA_DA_CONTA}/faturamento` },
        { label: t.nav.integracoes, to: `${ROTA_DA_CONTA}/integracoes` },
      ],
    },

    {
      // A PÁGINA DA AULA (etapa 4 do Bloco U — decisão do operador, 28–29/09/2026,
      // no estilo do LinkedIn Learning): fora do menu lateral; o nível 2 é o
      // conteúdo do curso, que vem dos dados da aula.
      label: t.nav.aula,
      to: "/aluno/aula/:id",
      icon: PlayCircle,
      estado: "ativo",
      foraDoMenuLateral: true,
      nivel2: "conteudo-do-curso",
    },

    // ---------------------------------------------------------------- ADMIN
    {
      // "Admin" no rótulo porque o aluno tem "Cursos" e "Trilhas" logo acima
      // (operador, set/2026): dois itens com o mesmo nome no mesmo rail, e no
      // modo recolhido só o ícone aparece.
      label: "Cursos Admin",
      to: "/admin/cursos",
      icon: Library,
      papel: Role.ADMIN,
      estado: "ativo",
      abas: [
        { label: "Publicados", to: "/admin/cursos" },
        { label: "Rascunhos", to: "/admin/cursos/rascunhos" },
        { label: "Arquivados", to: "/admin/cursos/arquivados" },
      ],
    },
    {
      // O EDITOR de um curso (Bloco E, etapa 1 — operador, 27–28/09/2026): os 7
      // passos no nível 2, em ordem de preenchimento. Fora do menu lateral, como
      // "Minha conta": no rail continua aceso "Cursos Admin". `:id` só casa com
      // número, então `/admin/cursos/novo` não abre o editor.
      label: "Editar curso",
      to: "/admin/cursos/:id",
      icon: SquarePen,
      papel: Role.ADMIN,
      estado: "ativo",
      foraDoMenuLateral: true,
      marcas: "passos-do-curso",
      filhos: PASSOS_DO_CURSO.map((p) => ({
        label: p.label,
        to: `/admin/cursos/:id/${p.slug}`,
        chave: p.slug,
        ...(p.planejado ? { estado: "planejado" as const } : {}),
      })),
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
      // 2º nível decidido pelo operador ao aprovar o C3 (23/09/2026). Textos tem
      // endereço próprio (/admin/site/textos): a coluna secundária acende um item
      // também nas sub-rotas dele, então em /admin/site ele ficaria aceso junto
      // com os outros dois.
      filhos: [
        { label: "Textos", to: "/admin/site/textos" },
        { label: "Depoimentos", to: "/admin/site/depoimentos" },
        { label: "Perguntas frequentes", to: "/admin/site/faq" },
      ],
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
  ];
}

/** O mapa em português — o padrão, e o que os testes do mapa leem. */
export const NAVEGACAO: Secao[] = navegacao(pt.app);

/**
 * As seções que ESTA pessoa vê — filtradas só por `papel`: o aluno não vê as
 * seções de admin. Não é sobre acesso (o servidor barra de qualquer jeito): é
 * sobre não anunciar a existência de uma área que não é dele.
 *
 * **O que é "planejado" aparece para todos**, como texto com EM BREVE:
 * - para o admin desde set/2026 (*"vendo eu não esqueço"*);
 * - para o aluno desde 29/09/2026, com o menu novo (*"o que ainda não existe
 *   aparece como EM BREVE"*) — antes ficava escondido dele.
 *
 * **Quem impede o link quebrado é quem desenha** (rail, gaveta, nível 2), que
 * renderiza planejado como texto e nunca como `<a>`. Tem teste nos três.
 */
export function secoesVisiveis(papel: string | undefined, t: AppTexts = pt.app): Secao[] {
  return navegacao(t).filter((s) => s.papel === undefined || s.papel === papel);
}

/**
 * A etiqueta de tela que ainda não existe. Seção de admin fica em português,
 * qualquer que seja o idioma do app (o Admin não muda de idioma — decisão do
 * operador, 23/09/2026); a do aluno segue o idioma dele.
 */
export function etiquetaEmBreve(secao: Secao | undefined, t: AppTexts): string {
  return secao?.papel === Role.ADMIN ? pt.app.nav.emBreve : t.nav.emBreve;
}

/**
 * A rota casa com o endereço da seção (ela mesma ou uma sub-rota)? Devolve os
 * parâmetros (`{ id: "12" }`), ou `null` se não casa.
 *
 * Um segmento `:nome` casa só com NÚMERO: todo parâmetro do mapa é um id do
 * banco, e é isto que impede `/admin/cursos/novo` de casar com
 * `/admin/cursos/:id` e abrir o editor de um curso chamado "novo".
 */
export function casaRota(pathname: string, padrao: string): Record<string, string> | null {
  const partes = pathname.split("/");
  const esperado = padrao.split("/");
  if (partes.length < esperado.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < esperado.length; i++) {
    if (esperado[i].startsWith(":")) {
      if (!/^\d+$/.test(partes[i])) return null;
      params[esperado[i].slice(1)] = partes[i];
    } else if (esperado[i] !== partes[i]) {
      return null;
    }
  }
  return params;
}

/**
 * Qual seção a rota atual acende. A mais ESPECÍFICA vence: sem isso
 * `/admin/cursos` acenderia também o "Catálogo" do aluno se o casamento fosse
 * por prefixo solto, e o rail mostraria dois itens ativos.
 */
export function secaoAtiva(pathname: string, secoes: Secao[]): Secao | undefined {
  const candidatas = secoes.filter(
    (s) =>
      casaRota(pathname, s.to) !== null ||
      (s.tambemAtivoEm ?? []).some((p) => pathname.startsWith(p)),
  );
  return candidatas.sort((a, b) => b.to.length - a.to.length)[0];
}

/**
 * Os itens do nível 2 para a rota atual — vazio quando a coluna não deve
 * aparecer. **Um item só conta como vazio**: uma coluna com uma linha é ruído
 * visual, não navegação. Os parâmetros da rota (`:id`) já saem preenchidos.
 */
export function itensSecundarios(pathname: string, secoes: Secao[]): ItemSecundario[] {
  const ativa = secaoAtiva(pathname, secoes);
  if (!ativa?.filhos || ativa.filhos.length <= 1) return [];
  const { filhos } = ativa;
  const params = casaRota(pathname, ativa.to) ?? {};
  return filhos.map((f) => ({
    ...f,
    to: f.to.replace(/:(\w+)/g, (_, nome: string) => params[nome] ?? `:${nome}`),
  }));
}

/** As abas do nível 3 para a rota atual — vazio quando não há abas. */
export function abasDaRota(pathname: string, secoes: Secao[]): Aba[] {
  return secaoAtiva(pathname, secoes)?.abas ?? [];
}
