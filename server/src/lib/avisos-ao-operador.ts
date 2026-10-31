import { NOME_DO_TIPO_DE_CASO, Role, type TipoDeCasoDaLista } from "@jilson/core";
import { prisma } from "./prisma.js";
import { enviarEmail } from "./email.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import type { MensagemDeEmail } from "../views/email.js";

// O AVISO AO OPERADOR (Fase 4, etapa 4.7b, passo 2d — decisão do operador, 31/10/2026, P137): o URGENTE por e-mail na
// hora (quem pagou e está sem acesso, e a contestação, que tem prazo); o resto num RESUMO por dia, de manhã, e só se
// houver caso aberto. Para o e-mail de cada conta de admin, lido do nosso banco.
// **O e-mail nunca sai de dentro de uma transação** (CLAUDE.md → Membership Gating): o caso é aberto dentro delas; o
// aviso sai depois — ao fim do processamento de cada aviso da Stripe (`depois-do-aviso.ts`) e na rodada de hora em hora.
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
 * Avisa os casos URGENTES abertos que ainda não foram avisados: toma-os num comando só (`notifiedAt`, para duas cópias do
 * servidor nunca mandarem o mesmo aviso), manda UM e-mail a cada admin e, se nenhum saiu, devolve a marca — a próxima
 * vez tenta de novo. Devolve quantos casos foram avisados.
 */
export async function avisarUrgentes(): Promise<number> {
  try {
    const tomados = await prisma.$queryRaw<{ id: number; kind: TipoDeCasoDaLista; detail: string | null }[]>`
      UPDATE "billing_case" SET "notifiedAt" = now() WHERE "open" AND "urgent" AND "notifiedAt" IS NULL
      RETURNING "id", "kind"::text AS "kind", "detail"`;
    if (tomados.length === 0) return 0;
    const ids = tomados.map((c) => c.id).sort((a, b) => a - b);
    const mensagem = mensagemDosUrgentes(tomados);
    let saiu = false;
    for (const admin of await admins()) {
      const envio = await enviarEmail({ para: admin.email, tipo: "casos-urgentes", referencia: `conta:${admin.id} casos:${ids.length}`, chave: `casos-urgentes/${admin.id}/${ids[0]}-${ids[ids.length - 1]}-${ids.length}`, mensagem });
      if (envio.enviado || envio.motivo === "duplicado") saiu = true;
    }
    if (!saiu) {
      await prisma.billingCase.updateMany({ where: { id: { in: ids } }, data: { notifiedAt: null } });
      return 0;
    }
    return ids.length;
  } catch (erro) {
    console.warn(`[api] o aviso dos casos urgentes ao operador falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
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
