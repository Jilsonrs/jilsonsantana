import type Stripe from "stripe";
import type { AcaoFeita, CampoDaProva, ProvasDaContestacao } from "@jilson/core";
import { prisma, TipoDeCaso, type SubscriptionEmailKind } from "./prisma.js";
import { abrirCaso, consertosDoCaso } from "./casos.js";
import { enviarProvasDaContestacao, lerContestacao, statusDaContestacao } from "./stripe-reembolso.js";
import { registrar, type PorQuem, type Resultado } from "./acoes-da-cobranca.js";

// RESPONDER A CONTESTAÇÃO COM PROVAS (Fase 4, etapa 4.7b, bloco 5, passo 5b — decisão do operador, 31/10/2026, P140): o painel
// MONTA as provas, o operador as confere e clica em "Enviar ao banco" (ou em "Aceitar a perda" — passo 5a). O que vai: a data
// da compra, o nome e o e-mail, as aulas assistidas e as horas, os e-mails que a escola mandou e a política de reembolso. Esses
// dados vão ao banco do aluno: entram na Política de Privacidade (Fase 7). A prévia mostra o texto EXATO que vai; o envio monta
// de novo, com a Stripe lida agora, e só a contestação ABERTA (`needs_response`) recebe provas. Depois de enviadas, não dá para
// mudar: o caso fica aberto até o banco decidir (ganha → "Liberar de novo"; perdida → fechar, com a nota). O registro guarda
// que foram enviadas — o texto, nunca (é dado pessoal, e está na Stripe).

/** O tempo assistido de um trecho sem a duração do vídeo (ainda processando): o mesmo teto dos números do curso. */
const TETO_SEM_DURACAO = 3 * 60 * 60;
/** As aulas que vão no registro de acesso: as mais recentes, até este número (os textos somam no máximo 150.000 caracteres). */
const AULAS_NA_PROVA = 300;

/** O nome de cada e-mail da cobrança, como vai ao banco. */
const NOME_DO_EMAIL: Record<SubscriptionEmailKind, string> = {
  COBRANCA_FALHOU: "aviso de cobrança que falhou",
  ANTES_DE_TRANCAR: "aviso antes de as aulas trancarem",
  CANCELADA: "aviso de assinatura encerrada",
  PREPAGO_TERMINANDO: "aviso do fim do acesso pré-pago",
  CONFIRMADA: "confirmação da assinatura",
};

/**
 * OS TEXTOS FIXOS que vão ao banco — RASCUNHO DO AGENTE, a aprovar pelo operador (P150). Só o que é verdade hoje: a escola
 * vende a assinatura dos cursos em vídeo, assistidos no site com a conta; e o reembolso segue o direito de arrependimento (os 7
 * dias da lei, pelo próprio site — `billing.md` → *Reembolso*).
 */
export function descricaoDoProduto(plano: string | null): string {
  const qual = plano === "anual" ? "anual" : plano === "mensal" ? "mensal" : "";
  return `Assinatura ${qual ? `${qual} ` : ""}da escola online Jilson Santana (www.jilsonsantana.com): acesso, enquanto a assinatura estiver ativa, a todos os cursos em vídeo da escola, assistidos no próprio site com a conta da pessoa (ela entra com o e-mail e a senha, ou com um código enviado ao e-mail). É um serviço digital, sem entrega física.`;
}
export const POLITICA_DE_REEMBOLSO = 'A escola segue o direito de arrependimento do Código de Defesa do Consumidor (art. 49): até 7 dias depois de assinar, a pessoa cancela pelo próprio site e recebe o dinheiro de volta. Depois disso, cancelar encerra a renovação, e o acesso vai até o fim do período já pago. A página inicial do site responde "Tem reembolso?" com a garantia legal de arrependimento.';

/** A data (e a hora) de Brasília, como o banco lê. */
function dataDeBrasilia(data: Date, comHora = false): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}) });
}
function emReais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}
function horasEMinutos(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  return minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, "0")} min`;
}

type AulaDaConta = { curso: string; aula: string; abriu: Date; concluiu: Date | null; segundos: number };

/** As aulas que a conta ABRIU (a linha do progresso nasce ao abrir), com o tempo assistido de cada uma — a regra dos números do curso. */
async function aulasDaConta(userId: string): Promise<AulaDaConta[]> {
  return prisma.$queryRaw<AulaDaConta[]>`
    WITH eventos AS (
      SELECT e."lessonId", e."type", e."createdAt",
             LEAD(e."createdAt") OVER (PARTITION BY e."lessonId" ORDER BY e."createdAt", e."id") AS seguinte
        FROM "lesson_event" e
       WHERE e."userId" = ${userId}
    ), assistido AS (
      SELECT ev."lessonId", SUM(LEAST(EXTRACT(EPOCH FROM (ev.seguinte - ev."createdAt")), COALESCE(NULLIF(l."videoDurationSeconds", 0), ${TETO_SEM_DURACAO})))::float8 AS segundos
        FROM eventos ev
        JOIN "lesson" l ON l."id" = ev."lessonId"
       WHERE ev."type" = 'PLAY' AND ev.seguinte IS NOT NULL
       GROUP BY ev."lessonId"
    )
    SELECT c."title" AS "curso", l."title" AS "aula", p."createdAt" AS "abriu", p."completedAt" AS "concluiu", COALESCE(a.segundos, 0)::float8 AS "segundos"
      FROM "lesson_progress" p
      JOIN "lesson" l ON l."id" = p."lessonId"
      JOIN "module" m ON m."id" = l."moduleId"
      JOIN "course" c ON c."id" = m."courseId"
      LEFT JOIN assistido a ON a."lessonId" = p."lessonId"
     WHERE p."userId" = ${userId}
     ORDER BY p."createdAt" DESC
     LIMIT ${AULAS_NA_PROVA}`;
}

/** A última atividade da conta nas aulas (o último evento do vídeo), ou nenhuma. */
async function ultimaAtividade(userId: string): Promise<Date | null> {
  return (await prisma.lessonEvent.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }))?.createdAt ?? null;
}

/** Os e-mails que a escola mandou à conta: os da cobrança e as boas-vindas de quem assinou sem conta — do mais antigo ao mais novo. */
async function emailsDaConta(userId: string): Promise<{ em: Date; qual: string }[]> {
  const daCobranca = await prisma.subscriptionEmail.findMany({ where: { subscription: { ownerUserId: userId }, sentAt: { not: null } }, select: { kind: true, sentAt: true } });
  const ficha = await prisma.guestCheckout.findUnique({ where: { userId }, select: { boasVindasEnviadaEm: true } });
  const emails = daCobranca.flatMap((e) => (e.sentAt ? [{ em: e.sentAt, qual: NOME_DO_EMAIL[e.kind] }] : []));
  if (ficha?.boasVindasEnviadaEm) emails.push({ em: ficha.boasVindasEnviadaEm, qual: "boas-vindas, com o acesso à conta" });
  return emails.sort((a, b) => a.em.getTime() - b.em.getTime());
}

/** O registro de acesso: o resumo e uma linha por aula aberta. Função pura. */
export function registroDeAcesso(email: string | null, aulas: AulaDaConta[], ultima: Date | null): string {
  if (aulas.length === 0) return `A conta ${email ?? "desta pessoa"} não abriu nenhuma aula da escola.`;
  const total = aulas.reduce((soma, a) => soma + a.segundos, 0);
  const concluidas = aulas.filter((a) => a.concluiu).length;
  const primeira = aulas.reduce((menor, a) => (a.abriu < menor ? a.abriu : menor), aulas[0]?.abriu ?? new Date());
  const cabeca = [
    `Atividade da conta ${email ?? "desta pessoa"} na escola online Jilson Santana, registrada pelo site (horário de Brasília).`,
    `Aulas abertas: ${aulas.length}; concluídas: ${concluidas}; tempo assistido: ${horasEMinutos(total)}. Primeira aula aberta em ${dataDeBrasilia(primeira, true)}${ultima ? `; última atividade em ${dataDeBrasilia(ultima, true)}` : ""}.`,
    "",
  ];
  const linhas = aulas.map((a) => `${dataDeBrasilia(a.abriu, true)} — ${a.curso} › ${a.aula}: ${horasEMinutos(a.segundos)} assistidos${a.concluiu ? `; concluída em ${dataDeBrasilia(a.concluiu, true)}` : ""}`);
  return [...cabeca, ...linhas].join("\n");
}

type Montadas = {
  contestacaoId: string;
  chave: string;
  contaId: string | null;
  assinatura: string | null;
  centavos: number | null;
  provas: ProvasDaContestacao;
  evidencia: Stripe.DisputeUpdateParams.Evidence;
};

/** Monta as provas de um caso de contestação ABERTA: o mesmo para a prévia e para o envio. */
async function montar(casoId: number): Promise<Montadas | { resultado: "nao-encontrada" | "contestacao-nao-aberta" }> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true, amount: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("enviar-provas")) return { resultado: "nao-encontrada" };
  const contestacaoId = caso.key.slice("du:".length);
  const lida = await lerContestacao(contestacaoId);
  if (!lida) return { resultado: "nao-encontrada" };
  if (lida.status !== "needs_response") return { resultado: "contestacao-nao-aberta" };
  const espelho = caso.stripeSubscriptionId ? await prisma.subscription.findUnique({ where: { stripeSubscriptionId: caso.stripeSubscriptionId }, select: { ownerUserId: true, createdAt: true, plan: true } }) : null;
  const contaId = espelho?.ownerUserId ?? caso.userId;
  const conta = contaId ? await prisma.user.findUnique({ where: { id: contaId }, select: { id: true, name: true, email: true } }) : null;
  const aulas = conta ? await aulasDaConta(conta.id) : [];
  const ultima = conta ? await ultimaAtividade(conta.id) : null;
  const emails = conta ? await emailsDaConta(conta.id) : [];

  const desde = espelho?.createdAt ?? lida.cobradaEm;
  const resumo = [
    `Valor contestado: ${emReais(lida.centavos)}${lida.cobradaEm ? `, cobrado em ${dataDeBrasilia(lida.cobradaEm)}` : ""}.${desde ? ` Assinante desde ${dataDeBrasilia(desde)}.` : ""}`,
    "",
    conta ? `E-mails que a escola enviou a esta pessoa (para ${conta.email}):` : "E-mails que a escola enviou a esta pessoa:",
    ...(emails.length > 0 ? emails.map((e) => `${dataDeBrasilia(e.em)} — ${e.qual}`) : ["nenhum registrado."]),
  ].join("\n");
  const campos: { campo: CampoDaProva; texto: string }[] = [];
  if (conta?.name) campos.push({ campo: "customer_name", texto: conta.name });
  if (conta) campos.push({ campo: "customer_email_address", texto: conta.email });
  if (desde) campos.push({ campo: "service_date", texto: dataDeBrasilia(desde) });
  campos.push({ campo: "product_description", texto: descricaoDoProduto(espelho?.plan ?? null) });
  campos.push({ campo: "access_activity_log", texto: registroDeAcesso(conta?.email ?? null, aulas, ultima) });
  campos.push({ campo: "refund_policy_disclosure", texto: POLITICA_DE_REEMBOLSO });
  campos.push({ campo: "uncategorized_text", texto: resumo });
  return {
    contestacaoId,
    chave: caso.key,
    contaId: conta?.id ?? null,
    assinatura: caso.stripeSubscriptionId,
    centavos: caso.amount,
    provas: { prazo: lida.prazo?.toISOString() ?? null, motivo: lida.motivo, centavos: lida.centavos, campos },
    evidencia: Object.fromEntries(campos.map((c) => [c.campo, c.texto])),
  };
}

/** A PRÉVIA: o texto exato que vai ao banco, para o operador conferir. */
export async function previaDasProvas(casoId: number): Promise<Resultado<ProvasDaContestacao>> {
  const montadas = await montar(casoId);
  if ("resultado" in montadas) return montadas;
  return { resultado: "ok", feito: montadas.provas };
}

/** ENVIAR AO BANCO: monta de novo, com a Stripe lida agora, e envia — uma vez só. */
export async function enviarProvasPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const montadas = await montar(casoId);
  if ("resultado" in montadas) return montadas;
  const { contestacaoId, chave, contaId, assinatura, centavos, provas, evidencia } = montadas;
  let depois: string;
  try {
    depois = await enviarProvasDaContestacao(contestacaoId, evidencia);
  } catch (erro) {
    // O outro clique (outra aba) já enviou: ela não está mais aberta.
    if ((await statusDaContestacao(contestacaoId)) !== "needs_response") return { resultado: "contestacao-nao-aberta" };
    throw erro;
  }
  const em = dataDeBrasilia(new Date());
  // O caso continua ABERTO até o banco decidir — sem a urgência do prazo, que foi cumprido.
  await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave, urgente: false, detalhe: `provas enviadas em ${em} · ${provas.motivo}` });
  await registrar(por, "enviar-provas", { userId: contaId, assinatura }, `provas enviadas ao banco; a contestação ficou ${depois}`, centavos);
  return { resultado: "ok", feito: { detalhe: "as provas foram ao banco; agora é a decisão dele (a ficha mostra a situação da contestação)" } };
}

