import type { Prisma } from "@prisma/client";
import { TOLERANCIA_DA_COBRANCA_ATRASADA_EM_DIAS } from "@jilson/core";
import { prisma } from "./prisma.js";

// A FONTE ÚNICA DE ACESSO (CLAUDE.md → Access Architecture): o conteúdo de membro
// e o vídeo pago passam SÓ por `temAcessoAtivo()`. Nada de checagem de assinatura
// espalhada, nada de exceção por papel, por e-mail ou por "usuário de teste" —
// o admin assiste por rota de ADMIN, não por uma porta aqui (decisão do operador,
// 29/09/2026). Um segundo caminho "só para teste" sobreviveria ao motivo que o
// criou, e é a única classe de bug que libera acesso sem pagamento sem erro nenhum.

/** Assinatura saudável. */
const STATUS_VIVOS: ReadonlySet<string> = new Set(["active", "trialing"]);
/** O PRIMEIRO pagamento nunca aconteceu: não há período pago a honrar. */
const NUNCA_PAGOU: ReadonlySet<string> = new Set(["incomplete", "incomplete_expired"]);
/** A cobrança falhou, e a Stripe está tentando de novo. */
const ATRASADA = "past_due";
const TOLERANCIA_EM_MS = TOLERANCIA_DA_COBRANCA_ATRASADA_EM_DIAS * 24 * 60 * 60 * 1000;

/** Esta assinatura está com a COBRANÇA ATRASADA? Viva na Stripe, que continua tentando cobrar. */
export function cobrancaAtrasada(assinatura: { status: string }): boolean {
  return assinatura.status === ATRASADA;
}

/**
 * Com a cobrança atrasada, ATÉ QUANDO as aulas ficam abertas: 3 dias depois da cobrança que
 * falhou. O "pago até" de uma atrasada é esse dia — o começo do período que não foi pago
 * (`paraAssinaturaNaStripe`). Sem a data, nunca. Função pura.
 */
export function aulasAbertasAte(assinatura: { currentPeriodEnd: Date | null }): Date | null {
  return assinatura.currentPeriodEnd ? new Date(assinatura.currentPeriodEnd.getTime() + TOLERANCIA_EM_MS) : null;
}

/**
 * A REGRA DO GATE (decisões do operador: Ago 2026, e a tolerância de 3 dias em 11/10/2026):
 *   - `incomplete` / `incomplete_expired`: NÃO — o primeiro pagamento nunca aconteceu;
 *   - `active` / `trialing`: SIM;
 *   - `past_due` (a cobrança falhou): SIM só por 3 DIAS depois da falha — a Stripe continua
 *     tentando por mais tempo, mas as aulas trancam; quem paga volta a tê-las na hora (o
 *     status volta a `active`);
 *   - qualquer outro status: SIM enquanto o período já pago não acabou.
 * Não é uma tabela status a status: o último ramo cobre cancelamento, pausa e o status que a
 * Stripe inventar. Lê status e DATA, nunca `cancel_at_period_end` (que só serve para a tela).
 * Função pura, com teste.
 */
export function assinaturaDaAcesso(
  assinatura: { status: string; currentPeriodEnd: Date | null },
  agora: Date = new Date(),
): boolean {
  if (NUNCA_PAGOU.has(assinatura.status)) return false;
  if (STATUS_VIVOS.has(assinatura.status)) return true;
  if (cobrancaAtrasada(assinatura)) {
    const ate = aulasAbertasAte(assinatura);
    return ate !== null && ate > agora;
  }
  return assinatura.currentPeriodEnd !== null && assinatura.currentPeriodEnd > agora;
}

/**
 * Esta assinatura PASSOU do primeiro pagamento? É o que separa "já foi assinante" de "nunca
 * assinou" (a tentativa que não se completou não conta). Só escolhe texto — nunca decide acesso.
 */
export function passouDoPrimeiroPagamento(assinatura: { status: string }): boolean {
  return !NUNCA_PAGOU.has(assinatura.status);
}

/**
 * Esta assinatura está ENCERRADA DE VEZ na Stripe? É estado final: não volta nem cobra mais (quem
 * retorna assina de novo). Não decide acesso — a encerrada ainda pode ter dias pagos, e quem
 * diz isso é `assinaturaDaAcesso`.
 */
export function encerradaDeVez(assinatura: { status: string }): boolean {
  return assinatura.status === "canceled";
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
 * Esta pessoa JÁ FOI assinante? Tem no espelho uma assinatura que passou do primeiro pagamento
 * (qualquer status que não seja o de "nunca pagou"). Só serve ao TEXTO do convite — "Reativar
 * assinatura" para quem volta, "Assinar" só na primeira vez (decisão do operador, 10/10/2026) —
 * e NUNCA decide acesso: quem decide é `temAcessoAtivo()`. Derivado do espelho, sem coluna.
 */
export async function jaFoiAssinante(userId: string): Promise<boolean> {
  // FECHA na dúvida, como o gate: um filtro vazio contaria as assinaturas de todo mundo.
  if (typeof userId !== "string" || userId.length === 0) return false;
  const quantas = await prisma.subscription.count({ where: { ownerUserId: userId, status: { notIn: [...NUNCA_PAGOU] } } });
  return quantas > 0;
}

/** O convite desta pessoa é REATIVAR? Já foi assinante e, pela resposta do gate, está sem acesso. */
export async function convidaAReativar(userId: string, temAcesso: boolean): Promise<boolean> {
  return !temAcesso && (await jaFoiAssinante(userId));
}

/**
 * Esta conta está com a cobrança ATRASADA e já SEM as aulas (passaram os 3 dias)? O caminho dela
 * é trocar o cartão — a assinatura continua viva na Stripe —, e não assinar de novo. Só escolhe
 * texto e destino; NUNCA decide acesso (quem decide é `temAcessoAtivo()`).
 */
export async function atrasadaSemAcesso(userId: string, temAcesso: boolean): Promise<boolean> {
  // FECHA na dúvida, como o gate: um filtro vazio contaria as assinaturas de todo mundo.
  if (temAcesso || typeof userId !== "string" || userId.length === 0) return false;
  return (await prisma.subscription.count({ where: { ownerUserId: userId, status: ATRASADA } })) > 0;
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
