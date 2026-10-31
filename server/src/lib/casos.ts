import { CASOS_POR_PAGINA, type CasoDaLista, type ConsertoDoCaso, type ListaDeCasos, type QuemFezNoRegistro, type TipoDeCasoDaLista } from "@jilson/core";
import { Prisma, prisma, QuemFez, TipoDeCaso } from "./prisma.js";

// OS CASOS — "PRECISA DE VOCÊ" (Fase 4, etapa 4.7b, bloco 2 — o mapa aprovado pelo operador, 31/10/2026). Cada situação
// da cobrança que precisa do operador vira UM caso (o tipo + a chave da situação), aberto no MESMO lugar em que o alerta
// sai — o alerta continua (é ele que avisa até o aviso por e-mail, passo 2d). O caso fecha sozinho quando a situação se
// resolve, ou pelo operador, com uma nota.
// **Abrir um caso NUNCA pode quebrar a cobrança:** ele é aberto dentro das transações dela (com o `tx`), e num comando
// só, que não falha se o caso já existe (`ON CONFLICT`) nem por chave estrangeira (a tabela não tem nenhuma). Um erro
// num comando dentro de uma transação a deixaria abortada — por isso não há leitura antes nem segundo passo.

/** O banco: o de sempre, ou a transação em que a cobrança está. */
type Banco = Prisma.TransactionClient | typeof prisma;

export type NovoCaso = {
  tipo: TipoDeCaso;
  /** O que identifica a situação: `pix:<pi_…>`, `sub:<sub_…>`, `ficha:<id>`, `fatura:<in_…>`… */
  chave: string;
  urgente: boolean;
  conta?: string | null;
  assinatura?: string | null;
  cliente?: string | null;
  objeto?: string | null;
  centavos?: number | null;
  /** Poucas palavras, sem dado pessoal. */
  detalhe?: string | null;
};

/**
 * Abre o caso — ou, se a mesma situação já tem caso, atualiza o resumo; se ele estava fechado, REABRE (a situação
 * voltou). Nunca lança fora de uma transação; dentro dela, o comando único não tem como falhar por conflito.
 */
export async function abrirCaso(caso: NovoCaso, banco: Banco = prisma): Promise<void> {
  try {
    await banco.$executeRaw`
      INSERT INTO "billing_case" ("kind", "key", "open", "urgent", "userId", "stripeSubscriptionId", "stripeCustomerId", "stripeObjectId", "amount", "detail", "openedAt", "updatedAt")
      VALUES (${caso.tipo}::"TipoDeCaso", ${caso.chave}, true, ${caso.urgente}, ${caso.conta ?? null}, ${caso.assinatura ?? null}, ${caso.cliente ?? null}, ${caso.objeto ?? null}, ${caso.centavos ?? null}::integer, ${caso.detalhe ?? null}, now(), now())
      ON CONFLICT ("kind", "key") DO UPDATE SET
        "openedAt" = CASE WHEN "billing_case"."open" THEN "billing_case"."openedAt" ELSE now() END,
        "notifiedAt" = CASE WHEN "billing_case"."open" THEN "billing_case"."notifiedAt" ELSE NULL END,
        "open" = true,
        "urgent" = EXCLUDED."urgent",
        "userId" = COALESCE(EXCLUDED."userId", "billing_case"."userId"),
        "stripeSubscriptionId" = COALESCE(EXCLUDED."stripeSubscriptionId", "billing_case"."stripeSubscriptionId"),
        "stripeCustomerId" = COALESCE(EXCLUDED."stripeCustomerId", "billing_case"."stripeCustomerId"),
        "stripeObjectId" = COALESCE(EXCLUDED."stripeObjectId", "billing_case"."stripeObjectId"),
        "amount" = COALESCE(EXCLUDED."amount", "billing_case"."amount"),
        "detail" = COALESCE(EXCLUDED."detail", "billing_case"."detail"),
        "updatedAt" = now(),
        "closedAt" = NULL, "closedBy" = NULL, "closedByUserId" = NULL, "note" = NULL`;
  } catch (erro) {
    console.warn(`[api] o caso ${caso.tipo} ${caso.chave} não foi aberto: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
}

/** Fecha o caso aberto daquela situação. Devolve se havia um aberto. */
export async function fecharCaso(alvo: { tipo: TipoDeCaso; chave: string }, por: { quem: QuemFez; conta?: string | null; nota?: string | null }, banco: Banco = prisma): Promise<boolean> {
  const fechados = await banco.$executeRaw`
    UPDATE "billing_case" SET "open" = false, "closedAt" = now(), "closedBy" = ${por.quem}::"QuemFez", "closedByUserId" = ${por.conta ?? null}, "note" = ${por.nota ?? null}, "updatedAt" = now()
     WHERE "kind" = ${alvo.tipo}::"TipoDeCaso" AND "key" = ${alvo.chave} AND "open"`;
  return fechados > 0;
}

/** A situação se resolveu sozinha (o Pix virou assinatura, a conta nasceu): fecha o caso, se houver — a Stripe "fez". */
export async function resolvidoSozinho(alvo: { tipo: TipoDeCaso; chave: string }, banco: Banco = prisma): Promise<void> {
  await fecharCaso(alvo, { quem: QuemFez.STRIPE, nota: "resolvido sozinho" }, banco);
}

type LinhaDoCaso = {
  id: number;
  kind: TipoDeCasoDaLista;
  urgent: boolean;
  open: boolean;
  openedAt: Date;
  detail: string | null;
  amount: number | null;
  key: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  closedAt: Date | null;
  closedBy: QuemFezNoRegistro | null;
  note: string | null;
  assinaturaId: number | null;
  donoDaAssinatura: string | null;
};

/** Um caso no formato da tela, com para onde a ficha leva. Função pura. */
export function paraCasoDaLista(linha: LinhaDoCaso): CasoDaLista {
  const conta = linha.userId && linha.email !== null ? linha.userId : linha.donoDaAssinatura;
  return {
    id: linha.id,
    tipo: linha.kind,
    urgente: linha.urgent,
    aberto: linha.open,
    abertoEm: linha.openedAt.toISOString(),
    detalhe: linha.detail,
    centavos: linha.amount,
    aluno: linha.userId && linha.email !== null ? { id: linha.userId, nome: linha.name, email: linha.email } : null,
    ficha: {
      conta,
      assinatura: conta ? null : linha.assinaturaId,
      visitante: !conta && linha.assinaturaId === null && linha.key.startsWith("ficha:") ? linha.key.slice("ficha:".length) : null,
    },
    fechadoEm: linha.closedAt?.toISOString() ?? null,
    fechadoPor: linha.closedBy,
    nota: linha.note,
    conserto: consertoDoCaso(linha.kind, linha.key),
  };
}

/** O conserto que o painel faz para o caso (passo 3b): a cobrança em aberto, o agendamento pela metade, a ativa sem período pago. */
export function consertoDoCaso(tipo: TipoDeCasoDaLista, chave: string): ConsertoDoCaso | null {
  if (tipo === "COBRANCA_EM_ABERTO") return "anular-cobranca";
  if (tipo === "TROCA_DE_PLANO" && chave.startsWith("agendamento:")) return "soltar-agendamento";
  if (tipo === "ATIVA_SEM_PERIODO_PAGO") return "encerrar-na-hora";
  return null;
}

/**
 * "PRECISA DE VOCÊ" (passo 2c): os casos abertos — os urgentes primeiro, e dos mais novos para os mais velhos — ou os
 * fechados (o fechamento mais recente primeiro). E quantos abertos há, e quantos urgentes.
 */
export async function listarCasos({ situacao, pagina }: { situacao: "abertos" | "fechados"; pagina: number }): Promise<ListaDeCasos> {
  const abertos = situacao === "abertos";
  const ordem = abertos ? Prisma.sql`c."urgent" DESC, c."openedAt" DESC` : Prisma.sql`c."closedAt" DESC`;
  const linhas = await prisma.$queryRaw<LinhaDoCaso[]>`
    SELECT c."id", c."kind"::text AS "kind", c."urgent", c."open", c."openedAt", c."detail", c."amount", c."key",
           c."userId", u."name", u."email", c."closedAt", c."closedBy"::text AS "closedBy", c."note",
           s."id" AS "assinaturaId", s."ownerUserId" AS "donoDaAssinatura"
      FROM "billing_case" c
      LEFT JOIN "user" u ON u."id" = c."userId"
      LEFT JOIN "subscription" s ON s."stripeSubscriptionId" = c."stripeSubscriptionId"
     WHERE c."open" = ${abertos}
     ORDER BY ${ordem}, c."id" DESC
     LIMIT ${CASOS_POR_PAGINA + 1} OFFSET ${(pagina - 1) * CASOS_POR_PAGINA}`;
  const [contagem] = await prisma.$queryRaw<{ abertos: number; urgentes: number }[]>`
    SELECT count(*) FILTER (WHERE "open")::int AS "abertos", count(*) FILTER (WHERE "open" AND "urgent")::int AS "urgentes" FROM "billing_case"`;
  return { casos: linhas.slice(0, CASOS_POR_PAGINA).map(paraCasoDaLista), temMais: linhas.length > CASOS_POR_PAGINA, abertos: contagem?.abertos ?? 0, urgentes: contagem?.urgentes ?? 0 };
}

/**
 * O OPERADOR fecha um caso aberto, com uma nota (o que ele fez) — e o fechamento entra no registro da cobrança, com quem
 * fechou. Devolve se havia um caso aberto com esse id.
 */
export async function fecharPeloOperador(id: number, operador: string, nota: string | null): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const fechados = await tx.$executeRaw`
      UPDATE "billing_case" SET "open" = false, "closedAt" = now(), "closedBy" = 'OPERADOR'::"QuemFez", "closedByUserId" = ${operador}, "note" = ${nota}, "updatedAt" = now()
       WHERE "id" = ${id} AND "open"`;
    if (fechados === 0) return false;
    const caso = await tx.billingCase.findUniqueOrThrow({ where: { id }, select: { kind: true, userId: true, stripeSubscriptionId: true, stripeCustomerId: true } });
    // O caso não tem chave estrangeira; o registro tem: a conta só vai se ela existir.
    const conta = caso.userId ? await tx.user.findUnique({ where: { id: caso.userId }, select: { id: true } }) : null;
    await tx.billingLog.create({ data: { who: QuemFez.OPERADOR, actorUserId: operador, action: "caso-fechado", userId: conta?.id ?? null, stripeSubscriptionId: caso.stripeSubscriptionId, stripeCustomerId: caso.stripeCustomerId, detail: caso.kind } });
    return true;
  });
}

export { TipoDeCaso };
