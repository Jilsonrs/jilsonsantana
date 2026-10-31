import { MOTIVOS_DE_CANCELAMENTO, REGISTRO_POR_PAGINA, type LinhaDoRegistro, type MotivoContado, type OQueAconteceu } from "@jilson/core";
import type { AvisoDaStripe } from "./stripe.js";
import type { DesfechoDoAviso } from "./assinaturas.js";
import { Prisma, prisma, QuemFez } from "./prisma.js";

// O REGISTRO DA COBRANÇA (Fase 4, etapa 4.7b, passo 1f — o mapa aprovado pelo operador, 31/10/2026): o que
// aconteceu, de quem fez. Aqui moram a gravação de cada aviso da Stripe processado (chamada por `depois-do-aviso.ts`,
// que serve aos dois caminhos do aviso — o endereço e a conferência da rodada) e as leituras do painel. Só
// acrescenta; nunca decide acesso. Sem dado pessoal no texto: ids, valores e status.

/** O resumo de um aviso processado, em poucas palavras e sem dado pessoal. Função pura. */
export function resumoDoAviso(aviso: AvisoDaStripe, desfecho: DesfechoDoAviso): { detalhe: string | null; centavos: number | null } {
  if (aviso.contestacao) return { detalhe: `${aviso.contestacao.fase} · ${aviso.contestacao.motivo}`, centavos: aviso.contestacao.centavos };
  // O aviso de fraude (P141 — 4.7b, passo 5c): o tipo, o que voltou e como ficou — o valor é o que a escola devolveu.
  if (aviso.avisoDeFraude) {
    const devolucao = desfecho.fraude?.devolucao;
    const partes = [aviso.avisoDeFraude.tipo, !devolucao ? null : "devolvidos" in devolucao ? "devolvido-como-fraude" : `sem-devolucao:${devolucao.semDevolucao}`];
    if (desfecho.resultado === "atualizada" && desfecho.perdeuAcesso) partes.push("perdeu-acesso");
    return { detalhe: partes.filter((parte): parte is string => parte !== null).join(" · "), centavos: devolucao && "devolvidos" in devolucao ? devolucao.devolvidos : null };
  }
  if (aviso.devolucaoFalhou) return { detalhe: "devolucao-falhou", centavos: aviso.devolucaoQueFalhou?.centavos ?? null };
  if (!("assinatura" in desfecho)) return { detalhe: null, centavos: null };
  const assinatura = desfecho.assinatura;
  const partes: string[] = [assinatura.status];
  // A pré-paga do Pix sempre tem data de fim (nunca renova): não é "vai cancelar".
  if (assinatura.acabaEm && !assinatura.pixPaymentIntentId && assinatura.status !== "canceled") partes.push("vai-cancelar");
  if (assinatura.motivoDoCancelamento) partes.push(`motivo:${assinatura.motivoDoCancelamento}`);
  if (desfecho.resultado === "atualizada" && desfecho.perdeuAcesso) partes.push("perdeu-acesso");
  if (desfecho.resultado === "atualizada" && desfecho.contaNova) partes.push("conta-nasceu");
  if (desfecho.resultado === "sem-conta") partes.push("sem-conta");
  return { detalhe: partes.join(" · "), centavos: null };
}

/**
 * Grava o aviso processado: UMA linha por aviso (a reentrega não repete — `stripeEventId` único). A assinatura
 * atualizada sem mudança nenhuma (a renovação manda um "updated" junto do "paid") não ganha linha nova. NUNCA lança: o
 * aviso já foi processado e gravado, e o registro é para acompanhar — falhar aqui não pode pedir à Stripe que entregue
 * de novo.
 */
export async function registrarAviso(aviso: AvisoDaStripe, desfecho: DesfechoDoAviso): Promise<void> {
  if (desfecho.resultado === "repetido") return;
  try {
    const assinaturaId = aviso.assinatura ?? ("assinatura" in desfecho ? desfecho.assinatura.id : null);
    const espelho = assinaturaId ? await prisma.subscription.findUnique({ where: { stripeSubscriptionId: assinaturaId }, select: { ownerUserId: true, stripeCustomerId: true } }) : null;
    const { detalhe, centavos } = resumoDoAviso(aviso, desfecho);
    if (aviso.tipo === "customer.subscription.updated" && assinaturaId) {
      const ultima = await prisma.billingLog.findFirst({ where: { stripeSubscriptionId: assinaturaId, who: QuemFez.STRIPE, action: { in: ["customer.subscription.created", "customer.subscription.updated"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { detail: true } });
      if (ultima && ultima.detail === detalhe) return;
    }
    const clienteId = espelho?.stripeCustomerId ?? ("assinatura" in desfecho ? desfecho.assinatura.clienteId : null);
    await prisma.billingLog.createMany({
      data: [{ who: QuemFez.STRIPE, action: aviso.tipo, stripeEventId: aviso.id, userId: espelho?.ownerUserId ?? null, stripeSubscriptionId: assinaturaId, stripeCustomerId: clienteId, amount: centavos, detail: detalhe }],
      skipDuplicates: true,
    });
  } catch (erro) {
    console.warn(`[api] o aviso ${aviso.id} (${aviso.tipo}) não entrou no registro da cobrança: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
}

type LinhaBruta = { id: number; createdAt: Date; who: QuemFez; action: string; detail: string | null; amount: number | null; userId: string | null; user: { name: string | null; email: string } | null };

function paraLinha(linha: LinhaBruta): LinhaDoRegistro {
  return {
    id: linha.id,
    em: linha.createdAt.toISOString(),
    quem: linha.who,
    acao: linha.action,
    detalhe: linha.detail,
    centavos: linha.amount,
    aluno: linha.userId && linha.user ? { id: linha.userId, nome: linha.user.name, email: linha.user.email } : null,
  };
}

const DA_LINHA = { id: true, createdAt: true, who: true, action: true, detail: true, amount: true, userId: true, user: { select: { name: true, email: true } } } as const;

/** O registro de UMA pessoa (a ficha): pela conta, pelas assinaturas e pelos clientes da Stripe dela — os 50 mais recentes. */
export async function registroDaPessoa(quem: { conta: string | null; assinaturas: string[]; clientes: string[] }): Promise<LinhaDoRegistro[]> {
  const ou: Prisma.BillingLogWhereInput[] = [];
  if (quem.conta) ou.push({ userId: quem.conta });
  if (quem.assinaturas.length > 0) ou.push({ stripeSubscriptionId: { in: quem.assinaturas } });
  if (quem.clientes.length > 0) ou.push({ stripeCustomerId: { in: quem.clientes } });
  if (ou.length === 0) return [];
  const linhas = await prisma.billingLog.findMany({ where: { OR: ou }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: DA_LINHA });
  return linhas.map(paraLinha);
}

/** "O que aconteceu" na escola inteira (uma página, da mais nova para a mais velha) e os motivos de cancelamento contados. */
export async function oQueAconteceu(pagina: number): Promise<OQueAconteceu> {
  const linhas = await prisma.billingLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (pagina - 1) * REGISTRO_POR_PAGINA, take: REGISTRO_POR_PAGINA + 1, select: DA_LINHA });
  const contados = await prisma.subscription.groupBy({ by: ["cancelReason"], where: { cancelReason: { in: [...MOTIVOS_DE_CANCELAMENTO] } }, _count: { _all: true } });
  const motivos: MotivoContado[] = MOTIVOS_DE_CANCELAMENTO.map((motivo) => ({ motivo, total: contados.find((c) => c.cancelReason === motivo)?._count._all ?? 0 }));
  return { linhas: linhas.slice(0, REGISTRO_POR_PAGINA).map(paraLinha), temMais: linhas.length > REGISTRO_POR_PAGINA, motivos };
}
