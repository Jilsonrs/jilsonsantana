import { Router, type Response } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { getDict } from "../lib/dict.js";
import { loadSession } from "../middleware/auth.js";
import { convidaAReativar, temAcessoAtivo } from "../lib/acesso.js";
import { renderHome, type HomeCourse } from "../views/home.js";

const router = Router();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * PASSO 1 — conteúdo fixo, igual ao mock aprovado.
 *
 * Os cursos ainda NÃO vêm do banco: faltam os cursos cadastrados. Enquanto
 * isso, a home real roda com esta lista, que é exatamente a do mock.
 *
 * PASSO 2 (próximo) — trocar esta constante por leitura do Prisma, filtrando
 * `status: PUBLISHED` e ordenando por `displayOrder`.
 */
const CURSOS_PT: HomeCourse[] = [
  {
    slug: "google-antigravity-ia-generativa-na-pratica-com-gemini",
    title: "Google Antigravity: IA Generativa na Prática com Gemini",
    subtitle: "Domine a nova fronteira da IA do Google e crie agentes generativos poderosos e práticos.",
    thumbnailUrl: "/img/google-antigravity-ia-generativa-na-pratica-com-gemini.jpg",
    camadas: ["UNIVERSAL", "MODERNO", "IA"],
  },
  {
    slug: "excel-claude-ia-inteligencia-artificial-e-analise-de-dados",
    title: "Excel + Claude IA: Inteligência Artificial, Análise de Dados",
    subtitle: "Transforme planilhas complexas em insights automáticos usando a inteligência do Claude.",
    thumbnailUrl: "/img/excel-claude-ia-inteligencia-artificial-e-analise-de-dados.jpg",
    camadas: ["UNIVERSAL", "MODERNO", "IA"],
  },
  {
    slug: "power-bi-basico-avancado-formacao-especialista",
    title: "Power BI Básico Avançado - Formação Especialista + Dashboard",
    subtitle: "Aprenda Power BI de ponta a ponta e construa painéis gerenciais interativos e profissionais.",
    thumbnailUrl: "/img/power-bi-basico-avancado-formacao-especialista.jpg",
    camadas: ["UNIVERSAL", "MODERNO", "IA"],
  },
  {
    slug: "microsoft-pl-300-certificacao-power-bi-data-analyst",
    title: "PL-300 - Certificação Microsoft Power BI Data Analyst",
    subtitle: "Prepare-se para o exame oficial da Microsoft e comprove sua habilidade em análise de dados.",
    thumbnailUrl: "/img/microsoft-pl-300-certificacao-power-bi-data-analyst.jpg",
    camadas: ["UNIVERSAL", "MODERNO", "IA"],
  },
];

const DESTAQUE_PT: HomeCourse = {
  slug: "agentic-ai-na-pratica",
  title: "Agentic AI na Prática: Crie Agentes de IA e Automações",
  subtitle:
    "Construa sistemas multiagentes com AutoGen e n8n, adicione memória e RAG e automatize fluxos de trabalho reais.",
  thumbnailUrl: "/img/agentic-ai-na-pratica.jpg",
  camadas: ["UNIVERSAL", "MODERNO", "IA"],
};

// Depoimentos e perguntas frequentes vêm do BANCO (Bloco C3): só PUBLICADOS —
// mesmo filtro de toda leitura pública. Lista vazia esconde a seção inteira
// (decisão do operador, 23/09/2026).
//
// DEPOIMENTOS: 4 SORTEADOS A CADA VISITA, sem ordem e sem carrossel (decisão do
// operador, 23/09/2026 — "com milhares de depoimentos nunca vão ver igual").
// Pesquisa que embasou: quase ninguém passa do 1º quadro de um carrossel
// (Notre Dame / Nielsen Norman), então mostrar mais que 4 não rende — o sorteio
// é que faz todos aparecerem ao longo das visitas. E sem script a página pública
// segue sem JavaScript, inclusive em aparelho antigo.
// SQL parametrizado (tagged template do Prisma): `ORDER BY random()` não existe
// na API tipada. Perguntas frequentes continuam na ordem do operador.
const DEPOIMENTOS_NA_HOME = 4;
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];
const listasDaHome = () =>
  Promise.all([
    prisma.$queryRaw<{ text: string; name: string }[]>`
      SELECT "text", "name" FROM "testimonial"
      WHERE "status" = 'PUBLISHED'::"ContentStatus"
      ORDER BY random()
      LIMIT ${DEPOIMENTOS_NA_HOME}`,
    prisma.faqItem.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: byOrder,
      select: { question: true, answer: true },
    }),
  ]);

// O texto vem do `getDict`, NUNCA de um import direto do dicionário: é ele que aplica o
// que o operador editou no /admin (server/src/lib/dict.ts).
// A sessão é lida para UMA coisa só: trocar "Entrar" por "Meus estudos" no
// cabeçalho. Visitante anônimo não tem cookie, então nem chega ao banco — e o
// robô do Google, que nunca tem cookie, vê exatamente a página do visitante.
// `loadSession` é o mesmo helper do middleware de propósito: ele já recusa
// usuário com exclusão pedida, e duplicar essa checagem aqui seria a segunda
// cópia que um dia diverge.
/**
 * Com sessão, a home sai diferente ("Meus estudos" e os botões Assinar ligados): essa página
 * nunca pode ser guardada por um cache no caminho e servida a um visitante (achado da revisão de
 * segurança da etapa 4.2, 10/10/2026). Sem sessão — o visitante e o robô do Google —, nada muda.
 */
function paginaDeQuemEstaLogado(res: Response, logado: boolean): void {
  if (logado) res.set("Cache-Control", "private, no-cache");
}

/**
 * O que a home muda para quem está logado, pela assinatura. **Assinante** (tem acesso agora, por
 * `temAcessoAtivo()`): o menu não mostra "Assine" (decisão do operador, 19/10/2026: "já é
 * aluno"). **Reativar**: os botões dizem "Reativar assinatura" — só para quem já foi assinante e
 * hoje está sem acesso (decisão do operador, 10/10/2026). O visitante sem login — e o robô do
 * Google — nem chega ao banco por isto: as duas respostas são sempre não.
 */
async function situacaoDaConta(
  sessao: Awaited<ReturnType<typeof loadSession>>,
): Promise<{ assinante: boolean; reativar: boolean }> {
  if (!sessao) return { assinante: false, reativar: false };
  const assinante = await temAcessoAtivo(sessao.user.id);
  return { assinante, reativar: await convidaAReativar(sessao.user.id, assinante) };
}

router.get("/", async (req, res) => {
  const [dict, sessao, [testimonials, faq]] = await Promise.all([
    getDict(),
    loadSession(req),
    listasDaHome(),
  ]);
  paginaDeQuemEstaLogado(res, sessao !== null);
  const { assinante, reativar } = await situacaoDaConta(sessao);
  res.send(
    renderHome({
      dict,
      courses: CURSOS_PT,
      featuredCourse: DESTAQUE_PT,
      canSubscribe: true,
      baseUrl: BASE_URL,
      logado: sessao !== null,
      assinante,
      reativar,
      testimonials,
      faq,
    }),
  );
});

export default router;
