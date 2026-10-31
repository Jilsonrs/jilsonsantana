import { ASSINATURAS_POR_PAGINA, type AssinaturaDaLista, type ContagemDasAssinaturas, type FiltroDasAssinaturas, type ListaDeAssinaturas, type ListaDeAssinaturasQuery, type SituacaoNaLista } from "@jilson/core";
import { Prisma, prisma } from "./prisma.js";

// O PAINEL DA COBRANÇA — A LISTA DAS ASSINATURAS (Fase 4, etapa 4.7b, passo 1b — decisões do operador, 31/10/2026).
// Só LEITURA, e só do ESPELHO (o nosso banco): abrir a lista nunca vai à Stripe — o plano, o fim marcado e o código
// já estão no espelho desde o passo 1a. A operação mora aqui, e não na rota: o JilsonAI (ou outra automação) vai
// chamar a mesma. O que vai ao navegador é o id do ESPELHO, nunca um id da Stripe.

/** Cada filtro, em SQL, sobre `subscription s`. A condição e a `situacao` abaixo são a mesma regra (há teste). */
const ATIVAS = Prisma.sql`s."status" IN ('active', 'trialing')`;
const CONDICAO: Record<FiltroDasAssinaturas, Prisma.Sql> = {
  todas: Prisma.sql`TRUE`,
  ativas: ATIVAS,
  // A pré-paga do Pix sempre tem data de fim (ela nunca renova): não é "vai cancelar".
  "vao-cancelar": Prisma.sql`${ATIVAS} AND s."cancelAt" IS NOT NULL AND s."pixPaymentIntentId" IS NULL`,
  atrasadas: Prisma.sql`s."status" IN ('past_due', 'unpaid')`,
  canceladas: Prisma.sql`s."status" = 'canceled'`,
  aguardando: Prisma.sql`s."status" = 'incomplete'`,
};
/** A tentativa que expirou sem pagar nunca virou assinatura: é da tela "Tentativas" (passo 1e), não desta lista. */
const DA_LISTA = Prisma.sql`s."status" <> 'incomplete_expired'`;

/**
 * A busca: o código da Stripe que veio num alerta (a assinatura, o cliente ou o Pix), ao pé da letra; senão, um
 * pedaço do e-mail ou do nome, sem diferenciar maiúsculas. Por `strpos`, e NUNCA por `LIKE`/`ILIKE`: neles o `_`
 * vale por qualquer caractere, e "ana_souza" acharia a "ana.souza" (CLAUDE.md → Server, a busca de conta por e-mail).
 */
export function condicaoDaBusca(busca: string | undefined): Prisma.Sql {
  if (!busca) return Prisma.sql`TRUE`;
  if (busca.startsWith("sub_")) return Prisma.sql`s."stripeSubscriptionId" = ${busca}`;
  if (busca.startsWith("cus_")) return Prisma.sql`s."stripeCustomerId" = ${busca}`;
  if (busca.startsWith("pi_")) return Prisma.sql`s."pixPaymentIntentId" = ${busca}`;
  const termo = busca.toLowerCase();
  return Prisma.sql`(strpos(lower(coalesce(u."email", '')), ${termo}) > 0 OR strpos(lower(coalesce(u."name", '')), ${termo}) > 0)`;
}

/** A situação de uma linha do espelho na lista. A MESMA regra dos filtros, acima. Função pura. */
export function situacaoNaLista(linha: { status: string; cancelAt: Date | null; pixPaymentIntentId: string | null }): SituacaoNaLista {
  switch (linha.status) {
    case "active":
    case "trialing":
      return linha.pixPaymentIntentId ? "pre-paga" : linha.cancelAt ? "vai-cancelar" : "ativa";
    case "past_due":
    case "unpaid":
      return "atrasada";
    case "canceled":
      return "cancelada";
    case "incomplete":
      return "aguardando";
    case "paused":
      return "pausada";
    default:
      return "outra";
  }
}

/** Uma linha do espelho com o nome e o e-mail da conta dona (a lista e a ficha montam a mesma coisa). */
export type LinhaDoEspelho = {
  id: number;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  plan: string | null;
  promotionCode: string | null;
  pixPaymentIntentId: string | null;
  livemode: boolean;
  createdAt: Date;
  ownerUserId: string | null;
  name: string | null;
  email: string | null;
};

export function paraAssinaturaDaLista(linha: LinhaDoEspelho): AssinaturaDaLista {
  return {
    id: linha.id,
    aluno: linha.ownerUserId && linha.email !== null ? { id: linha.ownerUserId, nome: linha.name, email: linha.email } : null,
    plano: linha.plan === "mensal" || linha.plan === "anual" ? linha.plan : null,
    prePaga: linha.pixPaymentIntentId !== null,
    situacao: situacaoNaLista(linha),
    status: linha.status,
    pagoAte: linha.currentPeriodEnd?.toISOString() ?? null,
    acabaEm: linha.cancelAt?.toISOString() ?? null,
    codigo: linha.promotionCode,
    deTeste: !linha.livemode,
    criadaEm: linha.createdAt.toISOString(),
  };
}

/** Uma página da lista (a mais recente primeiro) e a contagem de cada filtro — a contagem é da escola inteira, sem a busca. */
export async function listarAssinaturas({ filtro, busca, pagina }: ListaDeAssinaturasQuery): Promise<ListaDeAssinaturas> {
  const linhas = await prisma.$queryRaw<LinhaDoEspelho[]>`
    SELECT s."id", s."status", s."currentPeriodEnd", s."cancelAt", s."plan"::text AS "plan", s."promotionCode",
           s."pixPaymentIntentId", s."livemode", s."createdAt", s."ownerUserId", u."name", u."email"
      FROM "subscription" s
      LEFT JOIN "user" u ON u."id" = s."ownerUserId"
     WHERE ${DA_LISTA} AND ${CONDICAO[filtro]} AND ${condicaoDaBusca(busca)}
     ORDER BY s."createdAt" DESC, s."id" DESC
     LIMIT ${ASSINATURAS_POR_PAGINA + 1} OFFSET ${(pagina - 1) * ASSINATURAS_POR_PAGINA}`;
  const [contagem] = await prisma.$queryRaw<ContagemDasAssinaturas[]>`
    SELECT count(*)::int AS "todas",
           count(*) FILTER (WHERE ${CONDICAO.ativas})::int AS "ativas",
           count(*) FILTER (WHERE ${CONDICAO["vao-cancelar"]})::int AS "vao-cancelar",
           count(*) FILTER (WHERE ${CONDICAO.atrasadas})::int AS "atrasadas",
           count(*) FILTER (WHERE ${CONDICAO.canceladas})::int AS "canceladas",
           count(*) FILTER (WHERE ${CONDICAO.aguardando})::int AS "aguardando"
      FROM "subscription" s
     WHERE ${DA_LISTA}`;
  if (!contagem) throw new Error("[api] a contagem das assinaturas não veio");
  return { contagem, assinaturas: linhas.slice(0, ASSINATURAS_POR_PAGINA).map(paraAssinaturaDaLista), temMais: linhas.length > ASSINATURAS_POR_PAGINA };
}
