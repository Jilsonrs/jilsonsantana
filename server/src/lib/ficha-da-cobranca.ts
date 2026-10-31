import type Stripe from "stripe";
import type { CobrancaDaFicha, EmailDaFicha, FichaDaCobranca, FichaQuery, OndeLeva } from "@jilson/core";
import { prisma } from "./prisma.js";
import { temAcessoAtivo } from "./acesso.js";
import { paraCartao } from "./stripe-assinatura.js";
import { clienteDoCodigo, lerClienteNaStripe, type ClienteNaStripe } from "./stripe-ficha.js";
import { paraAssinaturaDaLista } from "./painel-da-cobranca.js";

// A FICHA DO ALUNO NO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, passo 1c — o mapa aprovado pelo operador, 31/10/2026).
// A conta, as assinaturas e os e-mails vêm do NOSSO banco; as cobranças (cartão e Pix), o cartão em uso e o CPF ou
// CNPJ, da Stripe, NA HORA (nada disso é guardado aqui). Se a Stripe não responde, a ficha sai com o que está no
// banco e diz isso — nunca um erro que esconda o resto. Só LÊ. A operação mora aqui, e não na rota: o JilsonAI (ou
// outra automação) vai chamar a mesma.

/** No máximo tantos clientes da Stripe por conta (normalmente é um; o visitante que virou conta pode ter dois). */
const CLIENTES_POR_FICHA = 5;

const data = (segundos: number) => new Date(segundos * 1000).toISOString();

/** Uma cobrança da Stripe no formato da ficha. Função pura. */
export function paraCobrancaDaFicha(cobranca: Stripe.Charge, contestacao?: Stripe.Dispute): CobrancaDaFicha {
  const detalhes = cobranca.payment_method_details;
  const forma = detalhes?.type === "card" ? "cartao" : detalhes?.type === "pix" ? "pix" : "outra";
  const cartao = detalhes?.card ? { bandeira: detalhes.card.brand ?? "cartão", final: detalhes.card.last4 ?? "????" } : null;
  let situacao: CobrancaDaFicha["situacao"];
  if (cobranca.status === "failed") situacao = "falhou";
  else if (cobranca.status === "pending") situacao = "pendente";
  else if (cobranca.disputed) situacao = "contestada";
  else if (cobranca.refunded) situacao = "devolvida";
  else if (cobranca.amount_refunded > 0) situacao = "devolvida-em-parte";
  else situacao = "paga";
  return {
    id: cobranca.id,
    em: data(cobranca.created),
    centavos: cobranca.amount,
    moeda: cobranca.currency,
    forma,
    cartao,
    situacao,
    devolvido: cobranca.amount_refunded,
    motivoDaFalha: situacao === "falhou" ? (cobranca.outcome?.reason ?? cobranca.failure_code ?? null) : null,
    recibo: cobranca.status === "succeeded" ? (cobranca.receipt_url ?? null) : null,
    contestacao: contestacao ? { situacao: contestacao.status, motivo: contestacao.reason, prazo: contestacao.evidence_details?.due_by ? data(contestacao.evidence_details.due_by) : null } : null,
  };
}

/** O CPF ou CNPJ do cliente com o meio escondido (os 3 primeiros e os 2 últimos dígitos). Função pura. */
export function documentoEscondido(cliente: Stripe.Customer | null): string | null {
  const numero = cliente?.tax_ids?.data.find((t) => t.type === "br_cpf" || t.type === "br_cnpj");
  if (!numero) return null;
  const digitos = numero.value.replace(/[^0-9A-Za-z]/g, "");
  if (digitos.length < 6) return null;
  const tipo = numero.type === "br_cpf" ? "CPF" : "CNPJ";
  return `${tipo} ${digitos.slice(0, 3)}${"•".repeat(digitos.length - 5)}${digitos.slice(-2)}`;
}

/** O cartão padrão do cliente (o que a Stripe cobra quando a assinatura não tem um próprio). Função pura. */
export function cartaoDoCliente(cliente: Stripe.Customer | null) {
  return paraCartao(cliente?.invoice_settings?.default_payment_method ?? null);
}

/** Os clientes da Stripe de uma conta: o do checkout logado, o da ficha do visitante e os das assinaturas. */
async function clientesDaConta(conta: string | null, dasAssinaturas: (string | null)[]): Promise<string[]> {
  const ids = new Set<string>(dasAssinaturas.filter((id): id is string => id !== null));
  if (conta) {
    const logado = await prisma.stripeCustomer.findUnique({ where: { userId: conta }, select: { stripeCustomerId: true } });
    if (logado) ids.add(logado.stripeCustomerId);
    const visitante = await prisma.guestCheckout.findUnique({ where: { userId: conta }, select: { stripeCustomerId: true } });
    if (visitante) ids.add(visitante.stripeCustomerId);
  }
  return [...ids].slice(0, CLIENTES_POR_FICHA);
}

/** A ficha de uma conta, ou de uma assinatura sem conta. Vazio = não existe. */
export async function montarFicha(quem: FichaQuery): Promise<FichaDaCobranca | null> {
  let conta: { id: string; name: string | null; email: string; createdAt: Date } | null = null;
  let filtro: { ownerUserId: string } | { id: number };
  if ("conta" in quem) {
    conta = await prisma.user.findUnique({ where: { id: quem.conta }, select: { id: true, name: true, email: true, createdAt: true } });
    if (!conta) return null;
    filtro = { ownerUserId: conta.id };
  } else {
    const linha = await prisma.subscription.findUnique({ where: { id: quem.assinatura }, select: { ownerUserId: true } });
    if (!linha) return null;
    // Com conta, a ficha é a da conta inteira (todas as assinaturas dela), pelo caminho que for aberta.
    if (linha.ownerUserId) return montarFicha({ conta: linha.ownerUserId });
    filtro = { id: quem.assinatura };
  }

  const linhas = await prisma.subscription.findMany({ where: filtro, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const assinaturas = linhas.map((l) => paraAssinaturaDaLista({ ...l, plan: l.plan, name: conta?.name ?? null, email: conta?.email ?? null }));
  const emails: EmailDaFicha[] = (
    await prisma.subscriptionEmail.findMany({ where: { subscriptionId: { in: linhas.map((l) => l.id) } }, orderBy: { createdAt: "desc" }, select: { kind: true, createdAt: true, sentAt: true } })
  ).map((e) => ({ tipo: e.kind, em: (e.sentAt ?? e.createdAt).toISOString(), saiu: e.sentAt !== null }));
  if (conta) {
    const boasVindas = await prisma.guestCheckout.findUnique({ where: { userId: conta.id }, select: { boasVindasEnviadaEm: true } });
    if (boasVindas?.boasVindasEnviadaEm) emails.push({ tipo: "BOAS_VINDAS", em: boasVindas.boasVindasEnviadaEm.toISOString(), saiu: true });
  }

  const ficha: FichaDaCobranca = {
    conta: conta ? { id: conta.id, nome: conta.name, email: conta.email, criadaEm: conta.createdAt.toISOString() } : null,
    temAcesso: conta ? await temAcessoAtivo(conta.id) : false,
    assinaturas,
    cobrancas: [],
    maisCobrancas: false,
    cartao: null,
    documento: null,
    emails,
    stripeIndisponivel: false,
  };

  const clientes = await clientesDaConta(conta?.id ?? null, linhas.map((l) => l.stripeCustomerId));
  let naStripe: ClienteNaStripe[];
  try {
    naStripe = [];
    for (const cliente of clientes) naStripe.push(await lerClienteNaStripe(cliente));
  } catch (erro) {
    // Não é alerta: é uma leitura do admin, e a ficha diz que a Stripe não respondeu.
    console.warn(`[api] a ficha da cobrança saiu sem a Stripe: ${erro instanceof Error ? erro.message : String(erro)}`);
    return { ...ficha, stripeIndisponivel: true };
  }
  ficha.cobrancas = naStripe.flatMap((c) => c.cobrancas.map((cobranca) => paraCobrancaDaFicha(cobranca, c.contestacoes.get(cobranca.id)))).sort((a, b) => b.em.localeCompare(a.em));
  ficha.maisCobrancas = naStripe.some((c) => c.maisCobrancas);
  ficha.cartao = naStripe.map((c) => cartaoDoCliente(c.cliente)).find((c) => c !== null) ?? null;
  ficha.documento = naStripe.map((c) => documentoEscondido(c.cliente)).find((d) => d !== null) ?? null;
  return ficha;
}

/** Onde leva um cliente da Stripe: a conta dele (pelo checkout logado, pela ficha do visitante ou por uma assinatura com dono), ou a assinatura sem conta. */
async function ondeLevaOCliente(clienteId: string): Promise<OndeLeva | null> {
  const logado = await prisma.stripeCustomer.findUnique({ where: { stripeCustomerId: clienteId }, select: { userId: true } });
  if (logado) return { conta: logado.userId, assinatura: null };
  const visitante = await prisma.guestCheckout.findUnique({ where: { stripeCustomerId: clienteId }, select: { userId: true } });
  if (visitante?.userId) return { conta: visitante.userId, assinatura: null };
  const assinatura = await prisma.subscription.findFirst({ where: { stripeCustomerId: clienteId }, orderBy: { createdAt: "desc" }, select: { id: true, ownerUserId: true } });
  if (assinatura) return { conta: assinatura.ownerUserId, assinatura: assinatura.ownerUserId ? null : assinatura.id };
  return null;
}

/**
 * De quem é o código da Stripe que veio num alerta. A assinatura, o cliente e o Pix pré-pago se acham no NOSSO banco;
 * a cobrança, a fatura, a contestação e os outros pagamentos, na Stripe (pelo cliente). Vazio = ninguém da escola.
 */
export async function acharPeloCodigo(codigo: string): Promise<OndeLeva | null> {
  if (codigo.startsWith("sub_")) {
    const linha = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: codigo }, select: { id: true, ownerUserId: true } });
    return linha ? { conta: linha.ownerUserId, assinatura: linha.ownerUserId ? null : linha.id } : null;
  }
  if (codigo.startsWith("pi_")) {
    const prePaga = await prisma.subscription.findUnique({ where: { pixPaymentIntentId: codigo }, select: { id: true, ownerUserId: true } });
    if (prePaga) return { conta: prePaga.ownerUserId, assinatura: prePaga.ownerUserId ? null : prePaga.id };
  }
  const cliente = codigo.startsWith("cus_") ? codigo : await clienteDoCodigo(codigo);
  return cliente ? ondeLevaOCliente(cliente) : null;
}
