import { createHash } from "node:crypto";
import { NOME_DO_TIPO_DE_CASO, Role, type TipoDeCasoDaLista } from "@jilson/core";
import { prisma } from "./prisma.js";
import { enviarEmail } from "./email.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import type { MensagemDeEmail } from "../views/email.js";

// O AVISO AO OPERADOR (Fase 4, etapa 4.7b, passo 2d — decisão do operador, 31/10/2026, P137): o URGENTE por e-mail na
// hora (quem pagou e está sem acesso, e a contestação, que tem prazo); o resto num RESUMO por dia, de manhã, e só se
// houver caso aberto. Para o e-mail de cada conta de admin, lido do nosso banco.
// **O e-mail nunca sai de dentro de uma transação** (CLAUDE.md → Membership Gating): o caso aberto dentro de uma é
// gravado quando ela termina (`transacaoDaCobranca`), e o aviso sai depois — ao fim do processamento de cada aviso da
// Stripe (`depois-do-aviso.ts`) e na rodada de hora em hora.
// O caso urgente aberto numa tela do aluno (o checkout, o cancelamento) sai, assim, em até uma hora; o alerta do
// Sentry continua saindo na hora.
// Nunca lança: o aviso é para o operador saber, e não pode derrubar nada.

/** O resumo sai na rodada das 12h UTC (9h em Brasília) — a mesma da conferência das assinaturas ativas vencidas. */
export const HORA_DO_RESUMO_UTC = 12;
/** No máximo tantos casos listados num e-mail (o resto, "e mais N", está no painel). */
const CASOS_NO_EMAIL = 30;
const PAINEL = "/admin/cobranca/precisa-de-voce";

export function ehHoraDoResumo(agora: Date): boolean {
  return agora.getUTCHours() === HORA_DO_RESUMO_UTC;
}

type CasoNoEmail = { kind: string; detail: string | null };

/** Uma linha por caso: o tipo e o resumo (sem dado pessoal). Função pura. */
export function linhaDoCaso(caso: CasoNoEmail): string {
  const nome = (NOME_DO_TIPO_DE_CASO as Record<string, string>)[caso.kind] ?? caso.kind;
  return caso.detail ? `${nome} — ${caso.detail}` : nome;
}

function botao(): MensagemDeEmail["botao"] {
  const endereco = enderecoDoSite(PAINEL);
  return endereco ? { texto: "Abrir Precisa de você", endereco } : undefined;
}

/** O e-mail dos casos URGENTES. Função pura. */
export function mensagemDosUrgentes(casos: CasoNoEmail[]): MensagemDeEmail {
  const n = casos.length;
  const quais = casos.slice(0, CASOS_NO_EMAIL).map(linhaDoCaso);
  const mais = n > CASOS_NO_EMAIL ? [`E mais ${n - CASOS_NO_EMAIL}, no painel.`] : [];
  const link = botao();
  return { assunto: `Precisa de você: ${n} ${n === 1 ? "caso urgente" : "casos urgentes"} na cobrança`, titulo: "Precisa de você", paragrafos: [n === 1 ? "Este caso da cobrança precisa de você agora:" : "Estes casos da cobrança precisam de você agora:", ...quais, ...mais], ...(link ? { botao: link } : {}) };
}

/** O RESUMO da manhã: todos os casos abertos. Função pura. */
export function mensagemDoResumo(casos: CasoNoEmail[], total: number): MensagemDeEmail {
  const quais = casos.slice(0, CASOS_NO_EMAIL).map(linhaDoCaso);
  const mais = total > quais.length ? [`E mais ${total - quais.length}, no painel.`] : [];
  const link = botao();
  return { assunto: `Cobrança: ${total} ${total === 1 ? "caso aberto" : "casos abertos"}`, titulo: "O resumo da manhã", paragrafos: [total === 1 ? "Este caso da cobrança está aberto:" : "Estes casos da cobrança estão abertos:", ...quais, ...mais], ...(link ? { botao: link } : {}) };
}

/** As contas de admin (não apagadas): é para o e-mail delas que o aviso vai. */
function admins() {
  return prisma.user.findMany({ where: { role: Role.ADMIN, deletedAt: null }, select: { id: true, email: true } });
}

/**
 * A CHAVE DO E-MAIL DOS URGENTES (revisão de segurança do bloco 2, 31/10/2026): o MESMO lote, com o mesmo texto, para o
 * mesmo admin dá a mesma chave (o envio repetido em 24 h não sai duas vezes); um caso REABERTO (outro `openedAt`) ou um
 * texto diferente dá outra. Antes, a chave era feita só dos ids — o caso reaberto repetia a do primeiro aviso, e o Resend
 * descartava o e-mail novo (ou o recusava, com o texto diferente). Função pura.
 */
export function chaveDosUrgentes(adminId: string, casos: { id: number; openedAt: Date }[], mensagem: MensagemDeEmail): string {
  const lote = casos.map((c) => `${c.id}:${c.openedAt.toISOString()}`).sort().join(",");
  return `casos-urgentes/${adminId}/${createHash("sha256").update(lote).update("\n").update(JSON.stringify(mensagem)).digest("hex").slice(0, 32)}`;
}

/** Devolve a marca dos casos tomados: a próxima vez tenta de novo. Nunca lança — se não voltar, eles saem no resumo da manhã. */
async function devolverAMarca(ids: number[]): Promise<void> {
  try {
    await prisma.billingCase.updateMany({ where: { id: { in: ids } }, data: { notifiedAt: null } });
  } catch (erro) {
    console.warn(`[api] a marca dos casos urgentes ${ids.join(",")} não voltou — eles saem no resumo da manhã: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
}

/**
 * Avisa os casos URGENTES abertos que ainda não foram avisados: toma-os num comando só (`notifiedAt`, para duas cópias do
 * servidor nunca mandarem o mesmo aviso), manda UM e-mail a cada admin e, se nenhum saiu, devolve a marca — a próxima
 * vez tenta de novo. Devolve quantos casos foram avisados.
 * As contas de admin são lidas ANTES de tomar os casos, e qualquer falha depois de tomá-los devolve a marca (revisão de
 * segurança do bloco 2). Só um processo que MORRE entre tomar e enviar deixa casos marcados sem e-mail: o resumo da manhã
 * lista todos os abertos, os urgentes primeiro.
 */
export async function avisarUrgentes(): Promise<number> {
  let ids: number[] = [];
  try {
    const contas = await admins();
    if (contas.length === 0) return 0;
    const tomados = await prisma.$queryRaw<{ id: number; kind: TipoDeCasoDaLista; detail: string | null; openedAt: Date }[]>`
      UPDATE "billing_case" SET "notifiedAt" = now() WHERE "open" AND "urgent" AND "notifiedAt" IS NULL
      RETURNING "id", "kind"::text AS "kind", "detail", "openedAt"`;
    ids = tomados.map((c) => c.id);
    if (ids.length === 0) return 0;
    const mensagem = mensagemDosUrgentes(tomados);
    let saiu = false;
    for (const admin of contas) {
      const envio = await enviarEmail({ para: admin.email, tipo: "casos-urgentes", referencia: `conta:${admin.id} casos:${ids.length}`, chave: chaveDosUrgentes(admin.id, tomados, mensagem), mensagem });
      if (envio.enviado || envio.motivo === "duplicado") saiu = true;
    }
    if (saiu) return ids.length;
    await devolverAMarca(ids);
    return 0;
  } catch (erro) {
    console.warn(`[api] o aviso dos casos urgentes ao operador falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
    if (ids.length > 0) await devolverAMarca(ids);
    return 0;
  }
}

/** O RESUMO da manhã: os casos abertos (os urgentes primeiro), um e-mail por dia a cada admin — só se houver algum. */
export async function mandarResumoDosCasos(agora: Date = new Date()): Promise<boolean> {
  try {
    const total = await prisma.billingCase.count({ where: { open: true } });
    if (total === 0) return false;
    const casos = await prisma.billingCase.findMany({ where: { open: true }, orderBy: [{ urgent: "desc" }, { openedAt: "desc" }], take: CASOS_NO_EMAIL, select: { kind: true, detail: true } });
    const mensagem = mensagemDoResumo(casos, total);
    const dia = agora.toISOString().slice(0, 10);
    let saiu = false;
    for (const admin of await admins()) {
      const envio = await enviarEmail({ para: admin.email, tipo: "resumo-dos-casos", referencia: `conta:${admin.id} dia:${dia}`, chave: `resumo-dos-casos/${admin.id}/${dia}`, mensagem });
      if (envio.enviado || envio.motivo === "duplicado") saiu = true;
    }
    return saiu;
  } catch (erro) {
    console.warn(`[api] o resumo dos casos ao operador falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
    return false;
  }
}
