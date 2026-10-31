import type Stripe from "stripe";
import { TENTATIVAS_NA_LISTA, type CobrancaDaFicha, type EmailDaFicha, type FichaDaCobranca, type FichaQuery, type ListaDeTentativas, type OndeLeva, type TentativaDaLista, type VisitanteDaFicha } from "@jilson/core";
import { prisma } from "./prisma.js";
import { temAcessoAtivo } from "./acesso.js";
import { paraCartao } from "./stripe-assinatura.js";
import { clienteDoCodigo, lerClienteNaStripe, type ClienteNaStripe } from "./stripe-ficha.js";
import { paraAssinaturaDaLista } from "./painel-da-cobranca.js";
import { PRAZO_DA_FICHA_EM_MS } from "./quem-nao-terminou.js";
import { registroDaPessoa } from "./registro-da-cobranca.js";

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

type FichaDeEspera = { id: string; nome: string | null; email: string; ultimaTentativaEm: Date; lembreteEnviadoEm: Date | null; novidades: boolean; naoApagadaEm: Date | null };

/** A ficha de espera do visitante no formato da ficha da cobrança. Função pura. */
export function paraVisitanteDaFicha(ficha: FichaDeEspera): VisitanteDaFicha {
  return {
    id: ficha.id,
    nome: ficha.nome,
    email: ficha.email,
    ultimaTentativaEm: ficha.ultimaTentativaEm.toISOString(),
    lembreteEm: ficha.lembreteEnviadoEm?.toISOString() ?? null,
    someEm: new Date(ficha.ultimaTentativaEm.getTime() + PRAZO_DA_FICHA_EM_MS).toISOString(),
    novidades: ficha.novidades,
    naoApagada: ficha.naoApagadaEm !== null,
  };
}
const DA_FICHA_DE_ESPERA = { id: true, nome: true, email: true, ultimaTentativaEm: true, lembreteEnviadoEm: true, novidades: true, naoApagadaEm: true, userId: true, stripeCustomerId: true } as const;

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

/** A ficha de uma conta, de uma assinatura sem conta, ou de um visitante que não terminou de assinar. Vazio = não existe. */
export async function montarFicha(quem: FichaQuery): Promise<FichaDaCobranca | null> {
  let conta: { id: string; name: string | null; email: string; createdAt: Date } | null = null;
  let visitante: VisitanteDaFicha | null = null;
  let filtro: { ownerUserId: string } | { id: number } | { stripeCustomerId: string };
  if ("visitante" in quem) {
    const ficha = await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: DA_FICHA_DE_ESPERA });
    if (!ficha) return null;
    // A ficha que já virou conta: a ficha é a da conta.
    if (ficha.userId) return montarFicha({ conta: ficha.userId });
    visitante = paraVisitanteDaFicha(ficha);
    filtro = { stripeCustomerId: ficha.stripeCustomerId };
  } else if ("conta" in quem) {
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

  const doVisitante = "stripeCustomerId" in filtro ? [filtro.stripeCustomerId] : [];
  const clientes = await clientesDaConta(conta?.id ?? null, [...doVisitante, ...linhas.map((l) => l.stripeCustomerId)]);
  const registro = await registroDaPessoa({ conta: conta?.id ?? null, assinaturas: linhas.map((l) => l.stripeSubscriptionId), clientes });

  const ficha: FichaDaCobranca = {
    registro,
    conta: conta ? { id: conta.id, nome: conta.name, email: conta.email, criadaEm: conta.createdAt.toISOString() } : null,
    visitante,
    pixEsperando: [],
    temAcesso: conta ? await temAcessoAtivo(conta.id) : false,
    assinaturas,
    cobrancas: [],
    maisCobrancas: false,
    cartao: null,
    documento: null,
    emails,
    stripeIndisponivel: false,
  };

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
  ficha.pixEsperando = naStripe.flatMap((c) => c.pixEsperando.map((p) => ({ id: p.id, em: data(p.created), centavos: p.amount, moeda: p.currency })));
  return ficha;
}

/** Onde leva um cliente da Stripe: a conta dele (pelo checkout logado, pela ficha do visitante ou por uma assinatura com dono), ou a assinatura sem conta. */
async function ondeLevaOCliente(clienteId: string): Promise<OndeLeva | null> {
  const logado = await prisma.stripeCustomer.findUnique({ where: { stripeCustomerId: clienteId }, select: { userId: true } });
  if (logado) return { conta: logado.userId, assinatura: null, visitante: null };
  const visitante = await prisma.guestCheckout.findUnique({ where: { stripeCustomerId: clienteId }, select: { id: true, userId: true } });
  if (visitante) return visitante.userId ? { conta: visitante.userId, assinatura: null, visitante: null } : { conta: null, assinatura: null, visitante: visitante.id };
  const assinatura = await prisma.subscription.findFirst({ where: { stripeCustomerId: clienteId }, orderBy: { createdAt: "desc" }, select: { id: true, ownerUserId: true } });
  if (assinatura) return { conta: assinatura.ownerUserId, assinatura: assinatura.ownerUserId ? null : assinatura.id, visitante: null };
  return null;
}

/**
 * De quem é o código da Stripe que veio num alerta. A assinatura, o cliente e o Pix pré-pago se acham no NOSSO banco;
 * a cobrança, a fatura, a contestação e os outros pagamentos, na Stripe (pelo cliente). Vazio = ninguém da escola.
 */
export async function acharPeloCodigo(codigo: string): Promise<OndeLeva | null> {
  if (codigo.startsWith("sub_")) {
    const linha = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: codigo }, select: { id: true, ownerUserId: true } });
    return linha ? { conta: linha.ownerUserId, assinatura: linha.ownerUserId ? null : linha.id, visitante: null } : null;
  }
  if (codigo.startsWith("pi_")) {
    const prePaga = await prisma.subscription.findUnique({ where: { pixPaymentIntentId: codigo }, select: { id: true, ownerUserId: true } });
    if (prePaga) return { conta: prePaga.ownerUserId, assinatura: prePaga.ownerUserId ? null : prePaga.id, visitante: null };
  }
  const cliente = codigo.startsWith("cus_") ? codigo : await clienteDoCodigo(codigo);
  return cliente ? ondeLevaOCliente(cliente) : null;
}

const TRINTA_DIAS_EM_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * AS TENTATIVAS QUE NÃO TERMINARAM (passo 1e), da mais recente para a mais antiga: os visitantes cuja ficha de
 * espera ainda não virou conta (ela some sozinha 7 dias depois da última tentativa) e as contas com a assinatura
 * esperando — ou que expirou sem — o primeiro pagamento, dos últimos 30 dias. Só o NOSSO banco: o que aconteceu em
 * cada uma (o cartão recusado, o Pix aberto) a ficha mostra, pela Stripe.
 */
export async function listarTentativas(agora: Date = new Date()): Promise<ListaDeTentativas> {
  const visitantes = await prisma.guestCheckout.findMany({ where: { userId: null }, orderBy: { ultimaTentativaEm: "desc" }, take: TENTATIVAS_NA_LISTA + 1, select: DA_FICHA_DE_ESPERA });
  const contas = await prisma.subscription.findMany({
    where: { status: { in: ["incomplete", "incomplete_expired"] }, ownerUserId: { not: null }, createdAt: { gte: new Date(agora.getTime() - TRINTA_DIAS_EM_MS) } },
    orderBy: { createdAt: "desc" },
    take: TENTATIVAS_NA_LISTA + 1,
    select: { id: true, status: true, createdAt: true, owner: { select: { id: true, name: true, email: true } } },
  });
  const todas: { em: Date; tentativa: TentativaDaLista }[] = [
    ...visitantes.map((v) => ({ em: v.ultimaTentativaEm, tentativa: { tipo: "visitante" as const, visitante: paraVisitanteDaFicha(v) } })),
    ...contas.flatMap((c) =>
      c.owner ? [{ em: c.createdAt, tentativa: { tipo: "conta" as const, assinatura: c.id, conta: { id: c.owner.id, nome: c.owner.name, email: c.owner.email }, situacao: c.status === "incomplete" ? ("aguardando" as const) : ("expirou" as const), em: c.createdAt.toISOString() } }] : [],
    ),
  ].sort((a, b) => b.em.getTime() - a.em.getTime());
  return { tentativas: todas.slice(0, TENTATIVAS_NA_LISTA).map((t) => t.tentativa), temMais: todas.length > TENTATIVAS_NA_LISTA };
}
