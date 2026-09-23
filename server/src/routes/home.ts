import { Router } from "express";
import { getDict } from "../lib/dict.js";
import { loadSession } from "../middleware/auth.js";
import { renderHome, type HomeCourse } from "../views/home.js";

const router = Router();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * PASSO 1 — conteúdo fixo, igual ao mock aprovado.
 *
 * Os cursos ainda NÃO vêm do banco: falta a migration do campo `language`
 * (e os cursos cadastrados). Enquanto isso, a home real roda com esta lista,
 * que é exatamente a do mock.
 *
 * PASSO 2 (próximo) — trocar esta constante por leitura do Prisma, filtrando
 * `status: PUBLISHED` + idioma da página e ordenando por `displayOrder`.
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

// Inglês ainda não tem curso publicado — a página renderiza sem cards, e o
// botão de assinar fica desligado até existir a primeira aula em inglês.
const CURSOS_EN: HomeCourse[] = [];
const DESTAQUE_EN: HomeCourse | null = null;
const CAN_SUBSCRIBE_EN = false;

// O texto vem do `getDict`, NUNCA de um import de `pt`/`en`: é ele que aplica o
// que o operador editou no /admin (server/src/lib/dict.ts).
// A sessão é lida para UMA coisa só: trocar "Entrar" por "Meus estudos" no
// cabeçalho. Visitante anônimo não tem cookie, então nem chega ao banco — e o
// robô do Google, que nunca tem cookie, vê exatamente a página do visitante.
// `loadSession` é o mesmo helper do middleware de propósito: ele já recusa
// usuário com exclusão pedida, e duplicar essa checagem aqui seria a segunda
// cópia que um dia diverge.
router.get("/", async (req, res) => {
  const [dict, sessao] = await Promise.all([getDict("pt"), loadSession(req)]);
  res.send(renderHome(dict, "pt", CURSOS_PT, DESTAQUE_PT, true, BASE_URL, sessao !== null));
});

router.get("/en", async (req, res) => {
  const [dict, sessao] = await Promise.all([getDict("en"), loadSession(req)]);
  res.send(
    renderHome(dict, "en", CURSOS_EN, DESTAQUE_EN, CAN_SUBSCRIBE_EN, BASE_URL, sessao !== null),
  );
});

export default router;
