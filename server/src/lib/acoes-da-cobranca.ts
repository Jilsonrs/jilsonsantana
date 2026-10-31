import { entrarPara, lerDocumentoFiscal, TELA_DE_PAGAR_COM_PIX, type AcaoFeita, type ConferenciaPelaFicha, type ConsertoDoCaso, type FichaQuery, type LinkParaOAluno } from "@jilson/core";
import { prisma, QuemFez, TipoDeCaso } from "./prisma.js";
import { consertosDoCaso } from "./casos.js";
import { AssinaturaNaoEncontrada, buscarAssinatura, DocumentoRecusado, trocarNumeroFiscal } from "./stripe.js";
import { buscarDetalhes, pagarFatura, type CobrancaDaFatura, type DetalhesDaAssinatura } from "./stripe-assinatura.js";
import { anularFatura, assinaturaDaFatura, soltarAgendamento } from "./stripe-plano.js";
import { cancelarNaHora } from "./stripe-reembolso.js";
import { pixConfigurado } from "./stripe-pix.js";
import { enviarEmail } from "./email.js";
import { getDict } from "./dict.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import { manterAssinaturaDe, pararRenovacaoDe } from "./minha-assinatura.js";
import { aceitarPixEmConferencia, operarNaAssinatura, sincronizarAssinatura, sincronizarConta, sincronizarPedido, type Conferida } from "./assinaturas.js";
import { cobrancaAtrasada, temAcessoAtivo } from "./acesso.js";
import { mandarBoasVindasDaAssinatura } from "./boas-vindas.js";
import { avisarSobreAAssinatura } from "./avisos-da-assinatura.js";

// AS AÇÕES DO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, bloco 3 — o mapa aprovado pelo operador, 31/10/2026). Cada ação
// chama a MESMA operação que o aluno (ou a rodada) já usa — "o painel e o JilsonAI chamam as mesmas" (CLAUDE.md) — e
// grava no registro da cobrança QUEM fez (o operador hoje; o JilsonAI depois), em quem e o que a Stripe respondeu. A
// assinatura vem pelo id do ESPELHO; o que fazer com ela sai da Stripe, na hora. Nenhuma devolve dinheiro (isso é o
// bloco 4).

/** Quem faz a ação: o operador (a conta dele) — e, no futuro, o JilsonAI. */
export type PorQuem = { quem: typeof QuemFez.OPERADOR | typeof QuemFez.JILSONAI; conta: string };

/** O que não deu para fazer — cada um vira um status na rota. */
export type NaoFeita = "nao-encontrada" | "ocupada" | "pre-paga" | "nada-a-fazer" | "stripe-nao-conhece" | "assinatura-viva" | "valor-mudou" | "valor-acima" | "devolucao-falhou" | "pix-nao-aceito";
export type Resultado<T> = { resultado: "ok"; feito: T } | { resultado: NaoFeita };

/** Grava a ação no registro: quem fez, em quem, o valor (quando há dinheiro) e o que a Stripe respondeu (sem dado pessoal). */
export async function registrar(por: PorQuem, acao: string, alvo: { userId?: string | null; assinatura?: string | null; cliente?: string | null }, detalhe: string, centavos: number | null = null): Promise<void> {
  const conta = alvo.userId ? await prisma.user.findUnique({ where: { id: alvo.userId }, select: { id: true } }) : null;
  await prisma.billingLog.create({ data: { who: por.quem, actorUserId: por.conta, action: acao, userId: conta?.id ?? null, stripeSubscriptionId: alvo.assinatura ?? null, stripeCustomerId: alvo.cliente ?? null, amount: centavos, detail: detalhe } });
}

/** A linha do espelho e os detalhes da assinatura na Stripe, agora. */
export async function naStripe(espelhoId: number) {
  const linha = await prisma.subscription.findUnique({ where: { id: espelhoId }, select: { stripeSubscriptionId: true, ownerUserId: true, stripeCustomerId: true } });
  if (!linha) return { resultado: "nao-encontrada" as const };
  try {
    return { resultado: "ok" as const, linha, detalhes: await buscarDetalhes(linha.stripeSubscriptionId) };
  } catch (erro) {
    if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" as const };
    throw erro;
  }
}

/** O que a conferência achou, em poucas palavras. */
function resumoDaConferencia(conferidas: Conferida[]): string {
  if (conferidas.length === 0) return "nenhuma assinatura na Stripe";
  return conferidas.map((c) => ("assinatura" in c ? c.assinatura.status : c.resultado)).join(", ");
}

/**
 * CONFERIR NA STRIPE (passo 3a): a sincronia de sempre (`assinaturas.ts`), pela conta, pela assinatura ou pela ficha do
 * visitante — com a ficha, a conta NASCE se o pagamento passou (etapa 4.7, passo 4), e as boas-vindas saem.
 */
export async function conferirPeloOperador(quem: FichaQuery, por: PorQuem): Promise<Resultado<ConferenciaPelaFicha>> {
  let conta: string | null = null;
  let conferidas: Conferida[];
  let cliente: string | null = null;
  if ("conta" in quem) {
    const achada = await prisma.user.findUnique({ where: { id: quem.conta }, select: { id: true } });
    if (!achada) return { resultado: "nao-encontrada" };
    conta = achada.id;
    conferidas = await sincronizarConta(conta);
  } else if ("assinatura" in quem) {
    const linha = await prisma.subscription.findUnique({ where: { id: quem.assinatura }, select: { stripeSubscriptionId: true, ownerUserId: true, stripeCustomerId: true } });
    if (!linha) return { resultado: "nao-encontrada" };
    conta = linha.ownerUserId;
    cliente = linha.stripeCustomerId;
    conferidas = conta ? await sincronizarConta(conta) : [{ id: linha.stripeSubscriptionId, ...(await sincronizarAssinatura(linha.stripeSubscriptionId)) }];
  } else {
    const ficha = await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: { email: true, stripeCustomerId: true } });
    if (!ficha) return { resultado: "nao-encontrada" };
    cliente = ficha.stripeCustomerId;
    conferidas = (await sincronizarPedido(ficha.email)) ?? [];
    // A conta pode ter nascido agora: as boas-vindas saem daqui (depois do commit; uma vez só).
    for (const c of conferidas) if (c.resultado === "atualizada") await mandarBoasVindasDaAssinatura(c.id);
    conta = (await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: { userId: true } }))?.userId ?? null;
  }
  const temAcesso = conta ? await temAcessoAtivo(conta) : false;
  const detalhe = `${resumoDaConferencia(conferidas)}; ${temAcesso ? "com acesso" : "sem acesso"}`;
  await registrar(por, "conferir-na-stripe", { userId: conta, cliente }, detalhe);
  return { resultado: "ok", feito: { temAcesso, detalhe } };
}

/**
 * CANCELAR (passo 3a): a MESMA operação do aluno (`pararRenovacaoDe`) — em dia, para de renovar e o acesso continua até
 * o fim do que foi pago; com a cobrança atrasada, termina agora e a cobrança em aberto não é mais tentada. Sem motivo:
 * o motivo é o do aluno, e o operador não escolhe por ele.
 */
export async function cancelarPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  const feita = await pararRenovacaoDe(detalhes, linha.ownerUserId ?? "sem-conta", {}, { peloDono: false });
  if (feita.resultado === "ocupada" || feita.resultado === "pre-paga") return { resultado: feita.resultado };
  if (feita.resultado !== "ok") return { resultado: "nada-a-fazer" };
  const detalhe = feita.terminou ? "terminou agora (a cobrança estava atrasada)" : `não renova; acesso até ${feita.acessoAte?.slice(0, 10) ?? "o fim do período"}`;
  await registrar(por, "cancelar", { userId: linha.ownerUserId, assinatura: linha.stripeSubscriptionId, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * TENTAR COBRAR DE NOVO AGORA (bloco 4, passo 4b): a cobrança em aberto da ATRASADA, no cartão da assinatura — quando o
 * aluno avisa que resolveu o cartão. A MESMA cobrança que a troca de cartão do aluno faz (`pagarFatura`), com a trava e a
 * sincronia, e relida com a trava (paga no meio, não cobra de novo): passou, as aulas voltam na hora. Recusada, a Stripe
 * segue tentando sozinha. O banco pedindo uma confirmação, só a pessoa a completa — pelo link de trocar o cartão.
 */
export async function cobrarDeNovoPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  if (!cobrancaAtrasada(detalhes) || !detalhes.faturaEmAbertoId) return { resultado: "nada-a-fazer" };
  const id = linha.stripeSubscriptionId;
  const operacao = await operarNaAssinatura(id, async (): Promise<CobrancaDaFatura | "nada"> => {
    const agora = await buscarDetalhes(id);
    if (!cobrancaAtrasada(agora) || !agora.faturaEmAbertoId) return "nada";
    return pagarFatura(agora.faturaEmAbertoId);
  });
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nada") return { resultado: "nada-a-fazer" };
  const comAcesso = linha.ownerUserId ? await temAcessoAtivo(linha.ownerUserId) : false;
  const detalhe =
    operacao.feito === "paga"
      ? `a cobrança passou; ${comAcesso ? "com acesso" : "sem acesso"} às aulas`
      : operacao.feito === "recusada"
        ? "o cartão foi recusado de novo; a Stripe segue tentando sozinha"
        : "o banco pede uma confirmação que só a pessoa dá: mande o link de trocar o cartão";
  await registrar(por, "cobrar-de-novo", { userId: linha.ownerUserId, assinatura: id, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/** DESFAZER O CANCELAMENTO (passo 3a): a MESMA operação do aluno (`manterAssinaturaDe`) — volta a renovar. */
export async function desfazerCancelamentoPeloOperador(espelhoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const achada = await naStripe(espelhoId);
  if (achada.resultado !== "ok") return achada;
  const { linha, detalhes } = achada;
  const feita = await manterAssinaturaDe(detalhes, linha.ownerUserId ?? "sem-conta");
  if (feita.resultado === "ocupada" || feita.resultado === "pre-paga") return { resultado: feita.resultado };
  if (feita.resultado !== "ok") return { resultado: "nada-a-fazer" };
  const detalhe = "volta a renovar";
  await registrar(por, "desfazer-cancelamento", { userId: linha.ownerUserId, assinatura: linha.stripeSubscriptionId, cliente: linha.stripeCustomerId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * REENVIAR o e-mail de um caso "e-mail que não saiu" (passo 3a): a MESMA rotina que manda — as boas-vindas, ou o e-mail
 * da cobrança devido agora. Ela é idempotente (uma vez cada); se sair, o caso fecha sozinho.
 */
export async function reenviarPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true } });
  if (!caso || caso.kind !== TipoDeCaso.EMAIL_NAO_SAIU || !caso.open || !caso.stripeSubscriptionId) return { resultado: "nao-encontrada" };
  if (caso.key.startsWith("boas-vindas:")) {
    await mandarBoasVindasDaAssinatura(caso.stripeSubscriptionId);
  } else {
    try {
      await avisarSobreAAssinatura(await buscarAssinatura(caso.stripeSubscriptionId));
    } catch (erro) {
      if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" };
      throw erro;
    }
  }
  const depois = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { open: true } });
  const detalhe = depois?.open ? "o e-mail não saiu de novo" : "o e-mail saiu";
  await registrar(por, "reenviar-email", { userId: caso.userId, assinatura: caso.stripeSubscriptionId }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

// ── OS CONSERTOS DO PASSO 3b: o que hoje só o painel da Stripe faz ───────────────────────────────────────────────────

/** Fecha o caso pelo operador, com o que foi feito na nota, e grava a ação no registro. */
export async function concluirCaso(casoId: number, por: PorQuem, acao: string, alvo: { userId: string | null; assinatura: string | null }, detalhe: string, centavos: number | null = null): Promise<void> {
  await prisma.billingCase.updateMany({ where: { id: casoId, open: true }, data: { open: false, closedAt: new Date(), closedBy: por.quem, closedByUserId: por.conta, note: detalhe } });
  await registrar(por, acao, alvo, detalhe, centavos);
}

const ENCERRADA = new Set(["canceled", "incomplete_expired"]);

/**
 * RESOLVER UM CASO com o conserto que ele pede (passo 3b), dentro das travas:
 *   - ANULAR A COBRANÇA EM ABERTO (caso "cobrança em aberto"): só com a assinatura ENCERRADA, ou quando a fatura é a da
 *     troca de plano — `[FATO — medido na área restrita, 11/10/2026]` anular a renovação de uma assinatura viva a
 *     devolve a `active` sem pagamento (aulas abertas de graça): aí é 409 `AssinaturaViva`;
 *   - SOLTAR O AGENDAMENTO pela metade (caso "troca de plano"): o mesmo `soltarAgendamento` do aluno;
 *   - ENCERRAR NA HORA, SEM DEVOLVER (caso "ativa sem período pago"): `cancelarNaHora` (sem crédito nem fatura), pela
 *     operação na assinatura — a sincronia corta o acesso.
 */
export async function resolverCasoPeloOperador(casoId: number, acao: "anular-cobranca" | "soltar-agendamento" | "encerrar-na-hora", por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeSubscriptionId: true, stripeObjectId: true } });
  // O conserto tem de ser O DO CASO (o tipo e a chave): o "soltar" de um caso de troca sem agendamento na chave soltaria o
  // que a Stripe tiver agora — talvez a troca que o próprio aluno marcou (revisão de segurança do bloco 3).
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes(acao) || !caso.stripeSubscriptionId) return { resultado: "nao-encontrada" };
  const id = caso.stripeSubscriptionId;
  const alvo = { userId: caso.userId, assinatura: id };
  let detalhes: DetalhesDaAssinatura;
  try {
    detalhes = await buscarDetalhes(id);
  } catch (erro) {
    if (erro instanceof AssinaturaNaoEncontrada) return { resultado: "stripe-nao-conhece" };
    throw erro;
  }

  if (acao === "anular-cobranca") {
    const fatura = caso.stripeObjectId;
    if (!fatura) return { resultado: "nada-a-fazer" };
    if (!ENCERRADA.has(detalhes.status) && fatura !== detalhes.faturaDaTrocaId) return { resultado: "assinatura-viva" };
    // A fatura é DESTA assinatura (revisão de segurança do bloco 3): a de outra, ainda viva, seria reativada sem pagamento.
    if ((await assinaturaDaFatura(fatura)) !== id) return { resultado: "nada-a-fazer" };
    const ficou = await anularFatura(fatura);
    const detalhe = ficou === "anulada" ? "a cobrança em aberto foi anulada" : "a cobrança já estava paga: nada foi anulado";
    await concluirCaso(casoId, por, "anular-cobranca", alvo, detalhe);
    return { resultado: "ok", feito: { detalhe } };
  }

  if (acao === "soltar-agendamento") {
    const agendamento = caso.key.slice("agendamento:".length);
    const operacao = await operarNaAssinatura(id, () => soltarAgendamento(agendamento));
    if (!operacao) return { resultado: "ocupada" };
    const detalhe = "o agendamento da troca foi solto";
    await concluirCaso(casoId, por, "soltar-agendamento", alvo, detalhe);
    return { resultado: "ok", feito: { detalhe } };
  }

  if (ENCERRADA.has(detalhes.status)) return { resultado: "nada-a-fazer" };
  const operacao = await operarNaAssinatura(id, async (): Promise<"encerrada" | "nada"> => {
    // COM A TRAVA, relida (revisão de segurança do bloco 3): quem pagou entre o caso e o clique (a renovação passou e o
    // aviso ainda não chegou) não é encerrado — a sincronia logo depois fecha o caso sozinha.
    const agora = await buscarDetalhes(id);
    if (ENCERRADA.has(agora.status) || (agora.pagoAte !== null && agora.pagoAte.getTime() > Date.now())) return "nada";
    await cancelarNaHora(id, {});
    return "encerrada";
  });
  if (!operacao) return { resultado: "ocupada" };
  if (operacao.feito === "nada") return { resultado: "nada-a-fazer" };
  const detalhe = "encerrada agora, sem devolver";
  await concluirCaso(casoId, por, "encerrar-na-hora", alvo, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * ACEITAR ESTE PIX (o conserto do caso "Pix em conferência", passo 4c — P117): o Pix pago vira a assinatura pré-paga no preço
 * de agora (`aceitarPixEmConferencia`, com a trava do Pix). Valeu: o caso fecha, e as boas-vindas saem se a conta nasceu
 * agora (a do visitante). O Pix que já voltou, ou que já virou assinatura: o caso fecha também — a situação acabou. O plano
 * fora de venda, ou a fatura que não se paga por fora: 409, e o caminho é devolver.
 */
export async function aceitarPixPeloOperador(casoId: number, por: PorQuem): Promise<Resultado<AcaoFeita>> {
  const caso = await prisma.billingCase.findUnique({ where: { id: casoId }, select: { kind: true, key: true, open: true, userId: true, stripeCustomerId: true } });
  if (!caso || !caso.open || !consertosDoCaso(caso.kind, caso.key).includes("aceitar-pix")) return { resultado: "nao-encontrada" };
  const feito = await aceitarPixEmConferencia(caso.key.slice("pix:".length));
  if (feito.resultado !== "aceito") {
    if (feito.resultado === "ocupada") return { resultado: "ocupada" };
    if (feito.resultado === "devolvido" || feito.resultado === "ja-virou-assinatura") {
      const detalhe = feito.resultado === "devolvido" ? "o Pix já tinha voltado para a pessoa" : "o Pix já tinha virado assinatura";
      await concluirCaso(casoId, por, "aceitar-pix", { userId: caso.userId, assinatura: null }, detalhe);
      return { resultado: "ok", feito: { detalhe } };
    }
    return { resultado: "pix-nao-aceito" };
  }
  const assinatura = "assinatura" in feito.sincronia ? feito.sincronia.assinatura : null;
  if (assinatura) await mandarBoasVindasDaAssinatura(assinatura.id);
  const dono = assinatura?.userId ?? caso.userId;
  const comAcesso = dono ? await temAcessoAtivo(dono) : false;
  const detalhe = `o Pix virou a assinatura pré-paga; ${comAcesso ? "com acesso" : "sem acesso"} às aulas`;
  await concluirCaso(casoId, por, "aceitar-pix", { userId: dono, assinatura: assinatura?.id ?? null }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/** Os clientes da Stripe de uma conta, ou da ficha de um visitante. */
export async function clientesDe(quem: { conta: string } | { visitante: string }): Promise<{ clientes: string[]; conta: string | null } | null> {
  if ("visitante" in quem) {
    const ficha = await prisma.guestCheckout.findUnique({ where: { id: quem.visitante }, select: { stripeCustomerId: true, userId: true } });
    return ficha ? { clientes: [ficha.stripeCustomerId], conta: ficha.userId } : null;
  }
  const conta = await prisma.user.findUnique({ where: { id: quem.conta }, select: { id: true } });
  if (!conta) return null;
  const ids = new Set<string>();
  const logado = await prisma.stripeCustomer.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
  if (logado) ids.add(logado.stripeCustomerId);
  const visitante = await prisma.guestCheckout.findUnique({ where: { userId: conta.id }, select: { stripeCustomerId: true } });
  if (visitante) ids.add(visitante.stripeCustomerId);
  return { clientes: [...ids], conta: conta.id };
}

/**
 * CORRIGIR O CPF OU CNPJ (passo 3b): em cada cliente da Stripe da pessoa (vale para as próximas faturas). O número é
 * conferido no `core` (o dígito) e na Stripe; NUNCA vai para o registro.
 */
export async function corrigirDocumentoPeloOperador(quem: { conta: string } | { visitante: string }, texto: string, por: PorQuem): Promise<Resultado<AcaoFeita> | { resultado: "documento-invalido" }> {
  const documento = lerDocumentoFiscal(texto);
  if (!documento) return { resultado: "documento-invalido" };
  const de = await clientesDe(quem);
  if (!de || de.clientes.length === 0) return { resultado: "nao-encontrada" };
  try {
    for (const cliente of de.clientes) await trocarNumeroFiscal(cliente, documento);
  } catch (erro) {
    if (erro instanceof DocumentoRecusado) return { resultado: "documento-invalido" };
    throw erro;
  }
  const detalhe = `${documento.tipo === "cpf" ? "CPF" : "CNPJ"} corrigido`;
  await registrar(por, "corrigir-documento", { userId: de.conta, cliente: de.clientes[0] ?? null }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}

/**
 * ENVIAR O LINK ao aluno por e-mail (passo 3b): o e-mail da conta (do nosso banco), com o botão para entrar e seguir à
 * tela certa — os mesmos links da ficha. A chave (por conta, link e minuto) segura o clique duplo.
 */
export async function enviarLinkPeloOperador(contaId: string, link: LinkParaOAluno, por: PorQuem, agora: Date = new Date()): Promise<Resultado<AcaoFeita>> {
  const conta = await prisma.user.findUnique({ where: { id: contaId }, select: { id: true, email: true, deletedAt: true } });
  if (!conta || conta.deletedAt) return { resultado: "nao-encontrada" };
  const endereco = link === "trocarCartao" ? enderecoDoSite(entrarPara("cartao")) : link === "reativar" ? enderecoDoSite(entrarPara("assinar")) : pixConfigurado() ? enderecoDoSite(TELA_DE_PAGAR_COM_PIX) : null;
  if (!endereco) return { resultado: "nada-a-fazer" };
  const t = (await getDict()).app.email.linkDoPainel[link];
  const envio = await enviarEmail({ para: conta.email, tipo: "link-do-painel", referencia: `conta:${conta.id} link:${link}`, chave: `link-do-painel/${conta.id}/${link}/${agora.toISOString().slice(0, 16)}`, mensagem: { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.texto], botao: { texto: t.botao, endereco } } });
  const detalhe = envio.enviado || envio.motivo === "duplicado" ? `o link (${link}) foi enviado` : `o link (${link}) não saiu`;
  await registrar(por, "enviar-link", { userId: conta.id }, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}
