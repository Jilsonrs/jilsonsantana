import { AsyncLocalStorage } from "node:async_hooks";
import { CASOS_POR_PAGINA, type CasoDaLista, type ConsertoDoCaso, type ListaDeCasos, type QuemFezNoRegistro, type TipoDeCasoDaLista } from "@jilson/core";
import { Prisma, prisma, QuemFez, TipoDeCaso } from "./prisma.js";

// OS CASOS — "PRECISA DE VOCÊ" (Fase 4, etapa 4.7b, bloco 2 — o mapa aprovado pelo operador, 31/10/2026). Cada situação
// da cobrança que precisa do operador vira UM caso (o tipo + a chave da situação), aberto no MESMO lugar em que o alerta
// sai — o alerta continua (é ele que avisa até o aviso por e-mail, passo 2d). O caso fecha sozinho quando a situação se
// resolve, ou pelo operador, com uma nota.
// **O CASO É GRAVADO FORA DAS TRANSAÇÕES DA COBRANÇA** (revisão de segurança do bloco 2, 31/10/2026): o que é aberto
// dentro de uma (`transacaoDaCobranca`) fica guardado e só é gravado quando ela termina — tenha dado certo ou não. Dentro
// dela, três coisas davam errado: a transação desfeita (a sincronia que falha DEPOIS de a Stripe mudar) levava junto o
// caso de uma situação que continua de pé na Stripe; um erro do comando do caso abortava a transação da cobrança; e o
// caso aberto com o banco de sempre pedia uma SEGUNDA ligação enquanto a transação segurava a dela. Gravar nunca lança.
// O caso FECHADO continua dentro da transação (`resolvidoSozinho`, com o `tx`): ele só vale se o espelho que o resolveu
// valer.

/** O banco: o de sempre, ou a transação em que a cobrança está (só para FECHAR). */
type Banco = Prisma.TransactionClient | typeof prisma;

/** Os casos abertos dentro da transação da cobrança em andamento — gravados quando ela termina. */
const guardados = new AsyncLocalStorage<NovoCaso[]>();

/** O tempo da transação, como o do Prisma. */
type TempoDaTransacao = { maxWait?: number; timeout?: number };

/**
 * A TRANSAÇÃO DA COBRANÇA: a do Prisma, com os casos abertos dentro dela — mesmo por funções que ela chama, sem passar
 * nada — gravados DEPOIS, deu certo ou não. Uma dentro da outra: a de fora grava. Nunca abrir e fechar o mesmo caso na
 * mesma transação: o fechamento vem antes da gravação, e o caso ficaria aberto (nenhum caminho faz isso).
 */
export async function transacaoDaCobranca<T>(fazer: (tx: Prisma.TransactionClient) => Promise<T>, tempo?: TempoDaTransacao): Promise<T> {
  if (guardados.getStore()) return prisma.$transaction(fazer, tempo);
  const lista: NovoCaso[] = [];
  try {
    return await guardados.run(lista, () => prisma.$transaction(fazer, tempo));
  } finally {
    for (const caso of lista) await gravarCaso(caso);
  }
}

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
 * voltou). Dentro de uma transação da cobrança, só guarda: ele é gravado quando ela termina. Nunca lança.
 */
export async function abrirCaso(caso: NovoCaso): Promise<void> {
  const lista = guardados.getStore();
  if (lista) lista.push(caso);
  else await gravarCaso(caso);
}

/** Grava o caso, num comando só, que não falha se ele já existe (`ON CONFLICT`). Nunca lança. */
async function gravarCaso(caso: NovoCaso): Promise<void> {
  try {
    await prisma.$executeRaw`
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

/**
 * O caso que JÁ CHEGA RESOLVIDO (o aviso de fraude — P141, 4.7b, passo 5c: "o caso chega ao operador já resolvido"): gravado
 * fechado, com quem resolveu e o que foi feito. Só DEPOIS de a cobrança ter dado certo e FORA das transações (`depois-do-aviso.ts`):
 * gravado antes, um fracasso deixaria "resolvido" o que não foi — por isso não passa pela guarda de `transacaoDaCobranca`.
 * Nunca lança.
 */
export async function casoJaResolvido(caso: NovoCaso, por: { quem: QuemFez; nota: string }): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "billing_case" ("kind", "key", "open", "urgent", "userId", "stripeSubscriptionId", "stripeCustomerId", "stripeObjectId", "amount", "detail", "openedAt", "updatedAt", "closedAt", "closedBy", "note")
      VALUES (${caso.tipo}::"TipoDeCaso", ${caso.chave}, false, ${caso.urgente}, ${caso.conta ?? null}, ${caso.assinatura ?? null}, ${caso.cliente ?? null}, ${caso.objeto ?? null}, ${caso.centavos ?? null}::integer, ${caso.detalhe ?? null}, now(), now(), now(), ${por.quem}::"QuemFez", ${por.nota})
      ON CONFLICT ("kind", "key") DO UPDATE SET
        "open" = false,
        "urgent" = EXCLUDED."urgent",
        "userId" = COALESCE(EXCLUDED."userId", "billing_case"."userId"),
        "stripeSubscriptionId" = COALESCE(EXCLUDED."stripeSubscriptionId", "billing_case"."stripeSubscriptionId"),
        "stripeCustomerId" = COALESCE(EXCLUDED."stripeCustomerId", "billing_case"."stripeCustomerId"),
        "stripeObjectId" = COALESCE(EXCLUDED."stripeObjectId", "billing_case"."stripeObjectId"),
        "amount" = COALESCE(EXCLUDED."amount", "billing_case"."amount"),
        "detail" = COALESCE(EXCLUDED."detail", "billing_case"."detail"),
        "updatedAt" = now(), "closedAt" = now(), "closedBy" = EXCLUDED."closedBy", "closedByUserId" = NULL, "note" = EXCLUDED."note"`;
  } catch (erro) {
    // O caso já resolvido é o que o operador vê no painel do que a escola fez sozinha (o aviso de fraude): sem ele, alerta
    // (revisão de segurança do bloco 5 da 4.7b) — o dinheiro já voltou e a assinatura já acabou.
    console.error(`[stripe] o caso já resolvido ${caso.tipo} ${caso.chave} (assinatura ${caso.assinatura ?? "-"}) não foi gravado — o painel não o mostra: ${erro instanceof Error ? erro.message : String(erro)}`);
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
    consertos: consertosDoCaso(linha.kind, linha.key),
    conserto: consertosDoCaso(linha.kind, linha.key)[0] ?? null,
  };
}

/**
 * Os consertos que o painel faz para o caso: a cobrança em aberto, o agendamento pela metade, a ativa sem período pago (passo
 * 3b); a devolução que falhou — a do reembolso (`sub:`) ou a de uma cobrança, com o valor (passo 4a e a revisão do bloco 4); o Pix em
 * conferência — aceitar ou devolver (P117) — e o dinheiro recebido sem assinatura (passo 4c). Só com o que o conserto precisa
 * na chave: sem ela, nenhum.
 */
export function consertosDoCaso(tipo: TipoDeCasoDaLista, chave: string): ConsertoDoCaso[] {
  // A devolução que falhou: a do reembolso (`sub:`), ou a de uma cobrança com o valor guardado (`devolucao:<re_…>` do aviso,
  // `cobranca:<ch_…>` do painel). O caso antigo de um pagamento (`pagamento:`), sem o valor, se resolve pela ficha.
  if (tipo === "DEVOLUCAO_FALHOU" && (chave.startsWith("sub:") || chave.startsWith("devolucao:re_") || chave.startsWith("cobranca:"))) return ["devolver-de-novo"];
  if (tipo === "PIX_EM_CONFERENCIA" && chave.startsWith("pix:pi_")) return ["aceitar-pix", "devolver-pix"];
  if (tipo === "PAGO_SEM_ASSINATURA" && (chave.startsWith("sub:") || chave.startsWith("fatura:in_"))) return ["devolver-este-pagamento"];
  // A contestação (bloco 5): responder com provas (passo 5b) ou aceitar a perda (passo 5a) — só a aberta; e, se a escola
  // ganhou, liberar de novo (passo 4d).
  if (tipo === "CONTESTACAO" && chave.startsWith("du:")) return ["enviar-provas", "aceitar-contestacao", "liberar-de-novo"];
  if (tipo === "COBRANCA_EM_ABERTO") return ["anular-cobranca"];
  if (tipo === "TROCA_DE_PLANO" && chave.startsWith("agendamento:")) return ["soltar-agendamento"];
  if (tipo === "ATIVA_SEM_PERIODO_PAGO") return ["encerrar-na-hora"];
  return [];
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
