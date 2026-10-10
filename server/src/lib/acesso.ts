import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

// A FONTE ÚNICA DE ACESSO (CLAUDE.md → Access Architecture): o conteúdo de membro
// e o vídeo pago passam SÓ por `temAcessoAtivo()`. Nada de checagem de assinatura
// espalhada, nada de exceção por papel, por e-mail ou por "usuário de teste" —
// o admin assiste por rota de ADMIN, não por uma porta aqui (decisão do operador,
// 29/09/2026). Um segundo caminho "só para teste" sobreviveria ao motivo que o
// criou, e é a única classe de bug que libera acesso sem pagamento sem erro nenhum.

/** Assinatura saudável, ou na janela de novas tentativas da Stripe (past_due MANTÉM o acesso). */
const STATUS_VIVOS: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);
/** O PRIMEIRO pagamento nunca aconteceu: não há período pago a honrar. */
const NUNCA_PAGOU: ReadonlySet<string> = new Set(["incomplete", "incomplete_expired"]);

/**
 * A REGRA DO GATE (decisão do operador, Ago 2026 — não reabrir): SIM quando o
 * status está vivo OU o período já foi pago, exceto `incomplete` e
 * `incomplete_expired`. Duas metades em vez de uma tabela status a status: não
 * quebra quando a Stripe inventa um status novo. Lê status e DATA, nunca
 * `cancel_at_period_end` (que só serve para a tela). Função pura, com teste.
 */
export function assinaturaDaAcesso(
  assinatura: { status: string; currentPeriodEnd: Date | null },
  agora: Date = new Date(),
): boolean {
  if (NUNCA_PAGOU.has(assinatura.status)) return false;
  if (STATUS_VIVOS.has(assinatura.status)) return true;
  return assinatura.currentPeriodEnd !== null && assinatura.currentPeriodEnd > agora;
}

/**
 * De onde o gate lê: o banco — ou a TRANSAÇÃO de quem está gravando o espelho
 * (`assinaturas.ts`), que precisa comparar o acesso de antes e de depois da gravação
 * com a MESMA regra, sem uma segunda conta de "quem tem acesso".
 */
type Leitor = Pick<Prisma.TransactionClient, "subscription">;

/** Alguma assinatura INDIVIDUAL desta pessoa dá acesso agora? */
async function assinaturaIndividualAtiva(userId: string, db: Leitor): Promise<boolean> {
  const assinaturas = await db.subscription.findMany({
    where: { ownerUserId: userId },
    select: { id: true, status: true, currentPeriodEnd: true },
  });
  for (const assinatura of assinaturas) {
    // Não usamos teste grátis: `trialing` libera, mas fica registrado como anomalia.
    if (assinatura.status === "trialing") console.warn(`[acesso] assinatura ${assinatura.id} em trialing (anomalia)`);
    if (assinaturaDaAcesso(assinatura)) return true;
  }
  return false;
}

/**
 * Esta pessoa pode ver o conteúdo pago? Não lê idioma (uma assinatura vale para
 * os dois — decisão do operador, 14/09/2026) nem papel. Pós-MVP, o corporativo
 * entra aqui como `|| membroDeOrgComLugarLivre(userId)`, sem tocar em quem chama.
 */
export async function temAcessoAtivo(userId: string, db: Leitor = prisma): Promise<boolean> {
  // FECHA na dúvida: no Prisma, `undefined` num filtro quer dizer "sem filtro", e
  // a busca voltaria com as assinaturas de todo mundo (achado da revisão de
  // segurança, 29/09/2026). O tipo protege hoje; isto protege o dia em que não.
  if (typeof userId !== "string" || userId.length === 0) return false;
  return assinaturaIndividualAtiva(userId, db);
}

/**
 * A aula abre para esta pessoa? PRÉVIA GRÁTIS (qualquer um — a segunda exceção ao
 * portão de vídeo, CLAUDE.md → Access Architecture) ou acesso ativo. É a MESMA
 * regra para assistir e para concluir: num lugar só, para as duas rotas nunca
 * discordarem (achado P2 da revisão de segurança, 03/10/2026). Sem papel aqui
 * dentro: o admin entra pelas rotas de admin.
 */
export function aulaLiberada(aula: { isFreePreview: boolean }, temAcesso: boolean): boolean {
  return aula.isFreePreview || temAcesso;
}
