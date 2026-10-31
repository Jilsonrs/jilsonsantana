import { Prisma } from "./prisma.js";
import { prisma } from "./prisma.js";
import { abrirCaso, resolvidoSozinho, TipoDeCaso, transacaoDaCobranca } from "./casos.js";
import { assinaturaDaAcesso, cobrancaAtrasada, encerradaDeVez, temAcessoAtivo } from "./acesso.js";
import { AssinaturaNaoEncontrada, assinaturasDoCliente, buscarAssinatura, buscarPrecos, cancelarIncompleta, type AssinaturaNaStripe, type AvisoDaStripe, type PagamentoPrePago } from "./stripe.js";
import { assinaturaDoPagamento, cancelarPorAvisoDeFraude, cancelarPorContestacao, devolver, devolverPorAvisoDeFraude, type DevolucaoDaFraude } from "./stripe-reembolso.js";
import { cobrancaDoPagamento, pixDevolvido } from "./stripe-devolucao.js";
import { assinaturasDoPix, cancelarPagamentoPix, criarAssinaturaPrePaga, garantirFaturaPaga, lerPagamentoPix, listarPixDoCliente, marcarEmConferencia, tirarDeConferencia, type PixPago, type PixPendente, type PrePagaDoPix } from "./stripe-pix.js";
import { alertarNoMaximoACada15Min } from "./alerta-de-configuracao.js";
import { contaDoPedido, type SemContaDoVisitante } from "./pedido-do-visitante.js";

// O ESPELHO DA ASSINATURA (Fase 4, etapa 4.1 — CLAUDE.md → Membership Gating). A assinatura da
// Stripe é a CANÔNICA; a nossa é o espelho que o gate (`temAcessoAtivo()`) lê. Cada aviso:
//   1. repetido (o `event.id` já processado) → nada;
//   2. UMA ASSINATURA DE CADA VEZ (achado P1 da revisão de segurança, 09/10/2026): dois avisos
//      diferentes da mesma assinatura, processados juntos, gravariam na ordem em que as
//      transações fecham — e a resposta VELHA da Stripe ("atrasada") podia sobrescrever a NOVA
//      ("cancelada"); como assinatura cancelada não gera mais aviso, o acesso ficaria liberado
//      para sempre. Por isso tudo — a trava, a busca na Stripe, a leitura e a gravação — roda
//      numa transação só, que começa travando ESTA assinatura (`pg_advisory_xact_lock`: a trava
//      de TRANSAÇÃO, que solta sozinha no fim — a de sessão não serve com o pooler do Neon);
//   3. a assinatura é buscada NA STRIPE, agora — nunca o retrato do aviso, que pode chegar fora
//      de ordem;
//   4. o aviso fica marcado e o espelho é atualizado na MESMA transação. Se algo falhar, nada
//      fica marcado, a rota responde 5xx e a Stripe entrega de novo — é ela quem insiste (sem
//      fila nossa, CLAUDE.md → Background Jobs).
// A assinatura se liga à conta pelo `userId` que o NOSSO checkout grava na Stripe (etapa 4.2).
// A do VISITANTE, que assinou sem conta, leva a ficha de espera dele (`metadata.pedido`), e é aqui,
// na mesma transação do espelho, que a conta NASCE quando o pagamento passa (etapa 4.7, passo 4 —
// `pedido-do-visitante.ts`). Sem nenhum dos dois, e sem espelho anterior, o aviso fica registrado e
// o espelho não nasce — e a rota registra o caso em voz alta. O dono de um espelho nunca muda.
//
// A SINCRONIA É UMA ROTINA SÓ (etapa 4.4, 10/10/2026): o aviso, o checkout (a Stripe diz que há
// assinatura e o espelho não dá acesso) e o admin (o aviso que se perdeu) passam todos por
// `sincronizar`, com a MESMA trava. Um segundo caminho de gravar o espelho seria o que diverge.
//
// PERDER O ACESSO DERRUBA A SESSÃO (CLAUDE.md → Access Architecture): se a conta TINHA acesso
// antes desta gravação e DEIXOU de ter depois, as sessões dela são apagadas na mesma transação.
// A comparação é o que protege quem só está tentando pagar: uma incompleta que expira, ou a
// assinatura antiga de quem já estava sem acesso, nunca deslogam ninguém. E isto NÃO é a
// fronteira: quem só deixa o período pago vencer não recebe aviso da Stripe e continua logado —
// quem tranca a aula é o gate, a cada pedido.
// A EXCEÇÃO, decidida pelo operador, em TRÊS operações da própria pessoa: o REEMBOLSO e o CANCELAR
// com a cobrança atrasada (11/10/2026) e o PIX DA ATRASADA (P131, 30/10/2026) — ela continua logada:
// lê a confirmação, ou paga o QR, e segue no site, sem as aulas. É a opção `manterSessao`, que só
// essas três operações usam (CLAUDE.md → Access Architecture).
//
// O AVISO DE DINHEIRO DEVOLVIDO (`charge.refunded`) fala de uma cobrança, não de uma assinatura:
// a assinatura se acha pelo pagamento, e daí em diante é a sincronia de sempre — é o que faz o
// reembolso dado direto no painel da Stripe também cortar o acesso.

/** Por que o espelho não nasceu: a Stripe não diz de quem é a assinatura, ou diz alguém que não tem conta. */
export type MotivoSemConta = "sem userId" | "conta inexistente" | SemContaDoVisitante;

/**
 * O que a sincronia fez com o espelho de UMA assinatura. `contaNova`: o id da conta do visitante
 * que NASCEU nesta gravação (etapa 4.7, passo 4), ou nada — quem chama manda o e-mail de criar a
 * senha DEPOIS de a transação terminar (CLAUDE.md → Membership Gating: e-mail nunca dentro de
 * transação nem de trava), com o endereço lido do NOSSO banco por este id.
 */
export type Sincronia =
  | { resultado: "atualizada"; assinatura: AssinaturaNaStripe; perdeuAcesso: boolean; contaNova: string | null }
  | { resultado: "sem-conta"; assinatura: AssinaturaNaStripe; motivo: MotivoSemConta };

/**
 * `ocupada`: o Pix (ou a assinatura dele) está sendo processado agora por outro pedido — só para quem NÃO
 * espera a trava (o clique do aluno e o admin). `em-conferencia`: o Pix foi pago e não pôde virar
 * assinatura sozinho — marcado, com um alerta (`processarPixPago`).
 */
export type Desfecho = { resultado: "repetido" } | { resultado: "sem-assinatura" } | { resultado: "ocupada" } | { resultado: "em-conferencia" } | Sincronia;

/** O que o AVISO DE FRAUDE fez (P141 — 4.7b, passo 5c): se encerrou a assinatura agora, e o que devolveu. */
export type FraudeTratada = { encerrada: boolean; devolucao: DevolucaoDaFraude };
/** O desfecho de um aviso processado — com o que o aviso de fraude fez, quando é ele (`depois-do-aviso.ts` conta ao operador). */
export type DesfechoDoAviso = Desfecho & { fraude?: FraudeTratada };

/** A busca na Stripe roda dentro da transação: o tempo dela (até ~20 s com uma nova tentativa) cabe aqui. */
const TEMPO_DA_TRANSACAO = { maxWait: 10_000, timeout: 30_000 };

/**
 * Uma OPERAÇÃO faz várias idas à Stripe com a trava (o reembolso, perto de dez — achado da
 * revisão de segurança, 11/10/2026): com o tempo de uma ida só, a transação venceria no meio, a
 * trava soltaria com a operação ainda falando com a Stripe, e o aviso entraria antes da hora. A
 * mesma conta do checkout (`checkout.ts`).
 */
const TEMPO_DA_OPERACAO = { maxWait: 10_000, timeout: 90_000 };
/**
 * O Pix que caiu (`processarPixPrePago`): até 8 idas à Stripe dentro da transação — as pré-pagas do Pix, a
 * cobrança dele (`pixDevolvido`), os preços, criar, pagar por fora (e reler a fatura se falhar), a assinatura para o
 * espelho e a cobrança do Pix de novo (`periodoDevolvido`) —, cada uma com 10 s e uma nova tentativa
 * (`stripe-cliente.ts`): 8 × 20 s = 160 s no pior caso (E12 da revisão ampla, 30/10/2026 — os 150 s de antes eram de
 * 7 idas; os 90 s de antes disso não cobriam nem essas).
 */
export const TEMPO_DO_PIX = { maxWait: 10_000, timeout: 180_000 };

function eRepetido(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/** Uma assinatura de cada vez: quem chega depois espera aqui, e só então busca na Stripe. */
function travar(tx: Prisma.TransactionClient, assinaturaId: string) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${assinaturaId}))`;
}

/**
 * COM a trava desta assinatura já tomada por `tx`: o que a Stripe diz AGORA vira o espelho.
 * `manterSessao`: quem perde o acesso NÃO é deslogado — só nas três operações do dono (o reembolso, o cancelar da atrasada e o Pix da atrasada).
 */
async function sincronizar(tx: Prisma.TransactionClient, assinaturaId: string, { manterSessao = false }: { manterSessao?: boolean } = {}): Promise<Sincronia> {
  // Na Stripe, AGORA. Se ela não responder, a exceção sobe: nada é gravado.
  const naStripe = await buscarAssinatura(assinaturaId);
  const espelho = await tx.subscription.findUnique({ where: { stripeSubscriptionId: naStripe.id }, select: { id: true, ownerUserId: true, status: true, currentPeriodEnd: true } });
  // A ATRASADA QUE CONTINUA ATRASADA NÃO GANHA DATA NOVA (etapa 4.6b — achado da revisão de
  // segurança, 12/10/2026): os 3 dias de aula contam da PRIMEIRA cobrança que falhou. Se a
  // assinatura atravessa um ciclo ainda atrasada (o painel em "deixar atrasada", ou tentativas
  // por um mês ou mais), a Stripe abre um período novo, e o começo dele reabriria as aulas por 3
  // dias a cada ciclo, sem pagamento. Pagou, o status deixa de ser atrasada e a data volta a andar.
  const continuaAtrasada = espelho !== null && cobrancaAtrasada(espelho) && cobrancaAtrasada(naStripe);
  const desde = continuaAtrasada && espelho.currentPeriodEnd && naStripe.pagoAte && espelho.currentPeriodEnd < naStripe.pagoAte ? espelho.currentPeriodEnd : naStripe.pagoAte;
  const agora: AssinaturaNaStripe = { ...naStripe, pagoAte: desde };
  // O dono de um espelho nunca muda: vale o que já está gravado, mesmo se a Stripe disser outro.
  const quem = espelho ? { dono: espelho.ownerUserId, contaNova: null } : await donoDaAssinaturaNova(tx, agora);
  if ("motivo" in quem) return { resultado: "sem-conta", assinatura: agora, motivo: quem.motivo };
  const { dono, contaNova } = quem;
  // O Pix da PRÉ-PAGA vai para o espelho só na que o USOU (achado P1 da revisão do bloco 4, 31/10/2026): a coluna é única, e
  // a pré-paga que morreu sem ser paga continua com o Pix nos metadados — gravado nela, a substituta que o operador aceita (ou
  // um aviso atrasado da morta) bateria na coluna, e a sincronia cairia.
  const pixDoEspelho = agora.pixPaymentIntentId && pixConsumido(agora.status) ? agora.pixPaymentIntentId : null;
  // O plano, o fim marcado e o código vão junto (o painel da cobrança, etapa 4.7b): o gate não os lê.
  const dados = { status: agora.status, currentPeriodEnd: agora.pagoAte, stripeCustomerId: agora.clienteId, livemode: agora.livemode, pixPaymentIntentId: pixDoEspelho, plan: agora.planoAtual ?? null, cancelAt: agora.acabaEm ?? null, promotionCode: agora.codigoPromocional ?? null, cancelReason: agora.motivoDoCancelamento ?? null, paidOutOfBand: agora.pagoPorFora === true };
  const tinhaAcesso = dono !== null && (await temAcessoAtivo(dono, tx));

  if (espelho) await tx.subscription.update({ where: { id: espelho.id }, data: dados });
  else await tx.subscription.create({ data: { ...dados, stripeSubscriptionId: agora.id, ownerUserId: dono } });
  // A sincronia valeu: o "site e Stripe discordam" desta assinatura se resolveu; e a ativa sem período pago, quando ela
  // acabou ou voltou a ter período pago (4.7b, bloco 2).
  await resolvidoSozinho({ tipo: TipoDeCaso.DIVERGENCIA, chave: `sub:${agora.id}` }, tx);
  if (agora.status === "canceled" || (agora.pagoAte !== null && agora.pagoAte > new Date())) await resolvidoSozinho({ tipo: TipoDeCaso.ATIVA_SEM_PERIODO_PAGO, chave: `sub:${agora.id}` }, tx);
  // A conta nasceu do pagamento: o "pagou e está sem conta" desta assinatura e da ficha dela se resolveu sozinho (4.7b, bloco 2).
  if (contaNova) {
    await resolvidoSozinho({ tipo: TipoDeCaso.PAGOU_SEM_CONTA, chave: `sub:${agora.id}` }, tx);
    if (agora.pedido) await resolvidoSozinho({ tipo: TipoDeCaso.PAGOU_SEM_CONTA, chave: `ficha:${agora.pedido}` }, tx);
  }

  // O acesso de depois se lê pela TRANSAÇÃO (a gravação acima ainda não está no banco para mais
  // ninguém), e pela conta inteira: outra assinatura dela que ainda dê acesso segura a sessão.
  // `dono` é sempre um id de verdade aqui (`tinhaAcesso` só é sim com um) — nunca um filtro vazio,
  // que no Prisma apagaria as sessões de todo mundo.
  const perdeuAcesso = dono !== null && tinhaAcesso && !(await temAcessoAtivo(dono, tx));
  if (perdeuAcesso && dono !== null && !manterSessao) await tx.session.deleteMany({ where: { userId: dono } });
  return { resultado: "atualizada", assinatura: agora, perdeuAcesso, contaNova };
}

/**
 * O dono de uma assinatura que AINDA NÃO TEM espelho: a conta que o nosso checkout gravou nela
 * (`userId`); senão, a da ficha do visitante — que NASCE aqui, na transação do espelho, quando o
 * pagamento passou (`pedido-do-visitante.ts`); senão, ninguém (o motivo vai para o registro).
 */
async function donoDaAssinaturaNova(tx: Prisma.TransactionClient, agora: AssinaturaNaStripe): Promise<{ dono: string; contaNova: string | null } | { motivo: MotivoSemConta }> {
  if (agora.userId) {
    const conta = await tx.user.findUnique({ where: { id: agora.userId }, select: { id: true } });
    return conta ? { dono: conta.id, contaNova: null } : { motivo: "conta inexistente" };
  }
  if (agora.pedido) {
    const doPedido = await contaDoPedido(tx, agora.pedido, agora);
    return "motivo" in doPedido ? doPedido : { dono: doPedido.id, contaNova: doPedido.nova ? doPedido.id : null };
  }
  return { motivo: "sem userId" };
}

/**
 * De que assinatura é o pagamento devolvido: a PRÉ-PAGA, pela coluna do espelho (etapa 4.9, passo 3 — o Pix de
 * que ela nasceu não tem fatura, e a Stripe não a acharia por ele); a recorrente, pela fatura, na Stripe
 * (`assinaturaDoPagamento`). O espelho primeiro: é local.
 */
async function assinaturaDoPagamentoDevolvido(pagamentoId: string): Promise<string | null> {
  const prePaga = await prisma.subscription.findUnique({ where: { pixPaymentIntentId: pagamentoId }, select: { stripeSubscriptionId: true } });
  return prePaga?.stripeSubscriptionId ?? assinaturaDoPagamento(pagamentoId);
}

export async function processarAviso(aviso: AvisoDaStripe): Promise<DesfechoDoAviso> {
  if (await prisma.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };
  // O PIX PRÉ-PAGO que caiu (etapa 4.9): a assinatura ainda não existe — nasce aqui, e daí em diante é
  // a sincronia de sempre.
  if (aviso.pagamentoPrePago) return processarPixPrePago(aviso, aviso.pagamentoPrePago);
  const marcar = { id: aviso.id, type: aviso.tipo };
  // O aviso de dinheiro devolvido só traz o pagamento: a assinatura dele se acha na Stripe. Se a
  // busca falhar, sobe — nada fica marcado, e a Stripe entrega de novo.
  const assinaturaId = aviso.assinatura ?? (aviso.pagamento ? await assinaturaDoPagamentoDevolvido(aviso.pagamento) : null);
  const fraude = aviso.avisoDeFraude ?? null;

  if (!assinaturaId) {
    // O AVISO DE FRAUDE de uma cobrança que não é de assinatura da escola (P141 — 4.7b, passo 5c): devolvida do mesmo jeito,
    // ANTES de marcar — se a Stripe falhar, nada fica marcado e o aviso volta (a devolução repetida não devolve duas vezes).
    let devolucao: DevolucaoDaFraude | null = null;
    try {
      devolucao = fraude ? await devolverPorAvisoDeFraude(fraude.cobranca, fraude.id, { userId: null, assinaturaId: null }) : null;
    } catch (erro) {
      // O alerta diz QUAL aviso falhou, como no ramo com assinatura (revisão de segurança do bloco 5 da 4.7b).
      const motivo = erro instanceof Error ? erro.message : String(erro);
      throw new Error(`[stripe] aviso ${aviso.id} (fraude ${fraude?.id ?? "-"}, cobrança ${fraude?.cobranca ?? "-"}) falhou: ${motivo}`, { cause: erro });
    }
    try {
      await prisma.stripeEvent.create({ data: marcar });
    } catch (erro) {
      // O mesmo aviso, entregue duas vezes ao mesmo tempo: o segundo esbarra no id.
      if (eRepetido(erro)) return { resultado: "repetido" };
      throw erro;
    }
    return devolucao ? { resultado: "sem-assinatura", fraude: { encerrada: false, devolucao } } : { resultado: "sem-assinatura" };
  }

  try {
    return await transacaoDaCobranca(async (tx): Promise<DesfechoDoAviso> => {
      await travar(tx, assinaturaId);
      // Com a trava: o mesmo aviso que esperava na fila já foi processado por quem veio antes.
      if (await tx.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };
      // A CONTESTAÇÃO CUJO DINHEIRO SAIU (E7 — P122 e 30/10/2026): a assinatura é marcada e cancelada na Stripe, com a
      // trava dela; a sincronia logo abaixo corta o acesso e derruba as sessões. Se a Stripe falhar, nada fica marcado e
      // o aviso volta.
      if (aviso.contestacao?.fase === "dinheiro-saiu") await cancelarPorContestacao(assinaturaId, aviso.contestacao.id);
      // O AVISO DE FRAUDE (P141 — 4.7b, passo 5c; decisão do operador, 31/10/2026): com a trava da assinatura, a marca e o
      // encerramento na hora — a sincronia logo abaixo corta o acesso e derruba as sessões —, e então a cobrança avisada volta,
      // marcada como fraude. Se a Stripe falhar, nada fica marcado e o aviso volta; de novo, nada se repete (a encerrada só
      // ganha a marca, e a devolvida não tem o que devolver).
      let tratada: FraudeTratada | null = null;
      if (fraude) {
        const encerrada = await cancelarPorAvisoDeFraude(assinaturaId, fraude.id);
        const dono = (await tx.subscription.findUnique({ where: { stripeSubscriptionId: assinaturaId }, select: { ownerUserId: true } }))?.ownerUserId ?? null;
        tratada = { encerrada, devolucao: await devolverPorAvisoDeFraude(fraude.cobranca, fraude.id, { userId: dono, assinaturaId }) };
      }
      const sincronia = await sincronizar(tx, assinaturaId);
      // Marcado na MESMA transação do espelho — também quando não há conta: o aviso foi visto.
      await tx.stripeEvent.create({ data: marcar });
      return tratada ? { ...sincronia, fraude: tratada } : sincronia;
      // A contestação e o aviso de fraude fazem várias idas à Stripe aqui dentro (a marca, o cancelamento, a fatura, a
      // devolução, a busca, a cobrança): o tempo das operações, para a trava não soltar no meio do cancelamento.
    }, aviso.contestacao?.fase === "dinheiro-saiu" || fraude ? TEMPO_DA_OPERACAO : TEMPO_DA_TRANSACAO);
  } catch (erro) {
    // O registro precisa dizer QUAL aviso e QUAL assinatura falharam (achado P2 da revisão) —
    // sem o corpo do aviso, que nunca vai para o registro.
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] aviso ${aviso.id} (assinatura ${assinaturaId}) falhou: ${motivo}`, { cause: erro });
  }
}

/**
 * O PIX PRÉ-PAGO QUE CAIU (etapa 4.9 — billing.md → *Formas de pagamento*): o pagamento solto não é
 * assinatura; a assinatura pré-paga NASCE aqui, uma por pagamento — `cancel_at_period_end`, a
 * primeira fatura paga por fora (`stripe-pix.ts`) —, e então é a sincronia de sempre, com a trava
 * dela, que grava o espelho (e faz a conta do visitante nascer). UM PIX, UMA ASSINATURA, em três
 * camadas: a trava no id do pagamento (dois avisos do mesmo Pix ao mesmo tempo esperam um ao
 * outro); o espelho pela coluna `pixPaymentIntentId` (o aviso que chega de novo acha a assinatura
 * sem ir à Stripe); e, na Stripe, a chave de idempotência da criação (24 h) mais a busca pelos
 * metadados (o aviso que chegar depois disso). O aviso fica marcado na MESMA transação: se algo
 * falhar, nada fica, a rota responde 5xx e a Stripe entrega de novo — e a criação repetida devolve
 * a mesma assinatura.
 * A assinatura ACHADA (no espelho ou pela busca) tem a primeira fatura GARANTIDA paga por fora antes da
 * sincronia (achado 5 do passo 6, 29/10/2026): a Stripe pode ter caído entre o criar e o pagar, e a
 * reentrega sincronizaria uma `incomplete` — o aluno pagou e não entra. E o VALOR do Pix é conferido com
 * o preço do plano antes de criar (achado 9): um Pix nosso com valor diferente (o preço mudou entre o QR
 * e o pagamento; o preço saiu de venda) NÃO vira assinatura — fica marcado, com alerta, para gente decidir
 * (devolver, ou criar à mão): a assinatura cheia por um valor menor seria acesso sem pagar o preço.
 */
function processarPixPrePago(aviso: AvisoDaStripe, pagamento: PagamentoPrePago): Promise<Desfecho> {
  return processarPixPago(pagamento, aviso);
}

/** Os estados de uma pré-paga que NUNCA valeu (a primeira fatura não foi paga). */
const NUNCA_VALEU: ReadonlySet<string> = new Set(["incomplete", "incomplete_expired"]);

/**
 * O espelho deste Pix é de uma assinatura que VALEU (viva, ou encerrada depois de valer)? Um espelho que
 * nunca valeu não "consome" o Pix: ele continua pago e sem assinatura (achado 3 da segunda revisão do passo
 * 6, 29/10/2026 — antes, qualquer linha no espelho escondia o Pix, e as portas vendiam de novo). Função pura.
 */
export function pixConsumido(status: string): boolean {
  return !NUNCA_VALEU.has(status);
}

/**
 * Das assinaturas pré-pagas de um Pix (`assinaturasDoPix`): a que VALEU (a fatura paga); senão a que ainda
 * pode ser paga (incompleta); senão a que morreu sem ser paga; senão nada. Função pura — os testes da rotina
 * a cobrem (`pix-pre-pago.test.ts`, `pagar-com-pix.test.ts`; trocá-la por `escolherPrePaga([])` reprova 12).
 */
export function escolherPrePaga(lista: PrePagaDoPix[]): { valendo: string } | { aPagar: string } | { morta: string } | null {
  const valendo = lista.find((a) => a.faturaPaga && pixConsumido(a.status));
  if (valendo) return { valendo: valendo.id };
  const aPagar = lista.find((a) => a.status === "incomplete");
  if (aPagar) return { aPagar: aPagar.id };
  const morta = lista[0];
  return morta ? { morta: morta.id } : null;
}

/**
 * A trava de uma chave: o AVISO da Stripe espera a vez (se demorar, ela entrega de novo); o clique do aluno
 * e o admin NÃO esperam (achado 7 da segunda revisão — CLAUDE.md: quem espera a trava espera segurando uma
 * ligação com o banco, e vários juntos parariam o gate de todo mundo). Devolve se a pegou.
 */
async function travarChave(tx: Prisma.TransactionClient, chave: string, esperar: boolean): Promise<boolean> {
  if (esperar) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chave}))`;
    return true;
  }
  const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${chave})) AS livre`;
  return trava?.livre === true;
}

/**
 * A MESMA rotina do aviso, para o Pix pago que o aviso ainda não trouxe (achado 4 do passo 6, 29/10/2026):
 * o checkout por Pix e por cartão (logado e visitante) e o force-sync do admin a chamam quando acham um Pix
 * nosso `succeeded` sem espelho que valeu (`pixPagoSemEspelho`). Sem aviso, nenhum `event.id` é marcado, e
 * a trava não espera (`travarChave`): ocupada, devolve `ocupada`.
 * O QUE ELA FAZ COM O PIX (a segunda revisão do passo 6, 29/10/2026):
 *   - o espelho que VALEU: a sincronia de sempre (a devolução depois de valer é a P114 — o reembolso pelo
 *     admin; aqui, nada muda);
 *   - senão, pela lista consistente das assinaturas do cliente (`assinaturasDoPix` — achado 5): a que valeu
 *     → a sincronia; o Pix DEVOLVIDO por inteiro → nada nasce, e a incompleta dele é encerrada (achado 1: o
 *     dinheiro voltou, e uma assinatura nascida depois seria acesso sem pagar); a incompleta → a fatura paga
 *     por fora; a morta, a fatura que não se paga, o valor que não bate com o preço → EM CONFERÊNCIA
 *     (`marcarEmConferencia`, um alerta só): a pessoa vê o aviso e não paga de novo (achados 3 e 4);
 *   - nada achado → o valor conferido com o preço e a assinatura CRIADA, e só com a fatura paga ela segue.
 */
export async function processarPixPago(pagamento: PagamentoPrePago, aviso?: AvisoDaStripe): Promise<Desfecho> {
  const marcar = aviso ? { id: aviso.id, type: aviso.tipo } : null;
  const quem = marcar ? `aviso ${marcar.id}` : "pix pago sem aviso";
  try {
    return await transacaoDaCobranca(async (tx): Promise<Desfecho> => {
      if (!(await travarChave(tx, `pix:${pagamento.id}`, marcar !== null))) return { resultado: "ocupada" };
      if (marcar && (await tx.stripeEvent.findUnique({ where: { id: marcar.id }, select: { id: true } }))) return { resultado: "repetido" };
      const marcarAviso = async () => {
        if (marcar) await tx.stripeEvent.create({ data: marcar });
      };
      const emConferencia = async (motivo: string): Promise<Desfecho> => {
        if (await marcarEmConferencia(pagamento.id, motivo)) {
          console.error(`[stripe] ${quem}: o Pix ${pagamento.id} foi PAGO e não virou assinatura (${motivo}) — EM CONFERÊNCIA: a pessoa vê o aviso e não paga de novo; liberar o acesso ou devolver o Pix pelo painel da Stripe`);
        }
        // O caso (4.7b, bloco 2): gravado quando a transação terminar (`transacaoDaCobranca`).
        await abrirCaso({ tipo: TipoDeCaso.PIX_EM_CONFERENCIA, chave: `pix:${pagamento.id}`, urgente: true, conta: pagamento.userId, cliente: pagamento.clienteId, objeto: pagamento.id, centavos: pagamento.centavos, detalhe: motivo });
        await marcarAviso();
        return { resultado: "em-conferencia" };
      };
      const noEspelho = await tx.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { stripeSubscriptionId: true, status: true } });
      let assinaturaId: string;
      if (noEspelho && pixConsumido(noEspelho.status)) {
        assinaturaId = noEspelho.stripeSubscriptionId;
      } else {
        const escolhida = escolherPrePaga(await assinaturasDoPix(pagamento.clienteId, pagamento.id));
        if (escolhida && "valendo" in escolhida) {
          assinaturaId = escolhida.valendo;
        } else if (await pixDevolvido(pagamento.id)) {
          if (escolhida && "aPagar" in escolhida) await cancelarIncompleta(escolhida.aPagar);
          console.warn(`[stripe] ${quem}: o Pix ${pagamento.id} foi devolvido antes de virar assinatura — nada criado`);
          await resolvidoSozinho({ tipo: TipoDeCaso.PIX_EM_CONFERENCIA, chave: `pix:${pagamento.id}` }, tx);
          await marcarAviso();
          return { resultado: "sem-assinatura" };
        } else if (escolhida && "aPagar" in escolhida) {
          const fatura = await garantirFaturaPaga(escolhida.aPagar);
          if (fatura.status !== "paid") return emConferencia(`a fatura da pré-paga ${escolhida.aPagar} ficou ${fatura.status}`);
          assinaturaId = escolhida.aPagar;
        } else if (escolhida) {
          return emConferencia(`a pré-paga ${escolhida.morta} acabou sem ser paga`);
        } else {
          // O PLANO e o VALOR (E11 da revisão ampla da cobrança, 30/10/2026): vale o preço de AGORA do plano do Pix, e o
          // valor pago tem que ser o dele. O id do preço gravado no Pix pode ter saído de venda (um preço novo, com o
          // mesmo valor) — e a Stripe não aceita assinatura nova num preço arquivado: a pré-paga nasce no preço de agora.
          const preco = (await buscarPrecos()).find((p) => p.plano === pagamento.plano) ?? null;
          if (!preco || preco.centavos !== pagamento.centavos) {
            return emConferencia(`pagou ${pagamento.centavos} centavos e o plano ${pagamento.plano} ${preco ? `custa ${preco.centavos}` : "não está à venda"}`);
          }
          const criada = await criarAssinaturaPrePaga({ ...pagamento, precoId: preco.precoId });
          if (!criada.faturaPaga) return emConferencia(`a fatura da pré-paga ${criada.id} não pôde ser paga por fora`);
          assinaturaId = criada.id;
        }
      }
      if (!(await travarChave(tx, assinaturaId, marcar !== null))) return { resultado: "ocupada" };
      const sincronia = await sincronizar(tx, assinaturaId);
      // O Pix virou assinatura com acesso: o caso de conferência dele (se houver) se resolveu sozinho.
      if (sincronia.resultado === "atualizada" && assinaturaDaAcesso({ status: sincronia.assinatura.status, currentPeriodEnd: sincronia.assinatura.pagoAte })) {
        await resolvidoSozinho({ tipo: TipoDeCaso.PIX_EM_CONFERENCIA, chave: `pix:${pagamento.id}` }, tx);
      }
      await marcarAviso();
      return sincronia;
    }, TEMPO_DO_PIX);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] ${marcar ? `aviso ${marcar.id} (pagamento pré-pago ${pagamento.id})` : `o Pix pago ${pagamento.id}`} falhou: ${motivo}`, { cause: erro });
  }
}

/** O que "Aceitar este Pix" fez (o painel da cobrança, etapa 4.7b, passo 4c). */
export type PixAceito = { resultado: "aceito"; sincronia: Sincronia } | { resultado: "nao-pago" | "devolvido" | "ja-virou-assinatura" | "sem-preco" | "fatura-nao-paga" | "ocupada" | "ja-tem-outra-assinatura" };

/**
 * A conta do Pix JÁ TEM acesso, ou o cliente dele outra assinatura VIVA (achado P2 da revisão do bloco 4, 31/10/2026)?
 * Então fazer uma pré-paga do Pix valer seria uma segunda assinatura pelo mesmo período — o Pix se devolve. A incompleta (o
 * cartão começado) não conta: ela não deu acesso.
 */
async function temOutraAssinatura(tx: Prisma.TransactionClient, pagamento: PagamentoPrePago): Promise<boolean> {
  if (pagamento.userId && (await temAcessoAtivo(pagamento.userId, tx))) return true;
  const vivas = (await assinaturasDoCliente(pagamento.clienteId)).filter((a) => a.status !== "canceled" && a.status !== "incomplete_expired" && a.status !== "incomplete");
  return vivas.some((a) => a.pixPaymentIntentId !== pagamento.id);
}

/**
 * ACEITAR ESTE PIX (o painel da cobrança, etapa 4.7b, passo 4c — decisão do operador, 29/10/2026, P117): o Pix PAGO que ficou
 * EM CONFERÊNCIA (o valor não bateu com o preço, a pré-paga dele morreu sem ser paga, a fatura dela não se pagava por fora)
 * vira a assinatura pré-paga NO PREÇO DE AGORA do plano — o operador aceitou o dinheiro —, com a primeira fatura paga por fora,
 * e a marca de conferência sai. Com a trava do Pix (a mesma do aviso, sem esperar): a pré-paga que JÁ VALE é só sincronizada;
 * a incompleta, paga por fora — ou encerrada, se não der —; e a nova nasce com uma chave de repetição PRÓPRIA (a do aviso
 * devolveria, na janela, a que morreu). A sincronia de sempre grava o espelho (e faz a conta do visitante nascer). O Pix
 * devolvido não se aceita, e o que já virou assinatura não vira outra. A conta que já tem acesso, ou outra assinatura viva,
 * não ganha uma segunda (`temOutraAssinatura`); e as linhas do espelho das pré-pagas MORTAS deste Pix soltam a coluna antes de
 * a nova nascer (a regra de `sincronizar`, para as gravadas antes dela).
 */
export async function aceitarPixEmConferencia(pagamentoId: string): Promise<PixAceito> {
  const lido = await lerPagamentoPix(pagamentoId);
  if (lido.status !== "succeeded" || !lido.pagamento) return { resultado: "nao-pago" };
  const pagamento = lido.pagamento;
  return transacaoDaCobranca(async (tx): Promise<PixAceito> => {
    if (!(await travarChave(tx, `pix:${pagamento.id}`, false))) return { resultado: "ocupada" };
    const noEspelho = await tx.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { status: true } });
    if (noEspelho && pixConsumido(noEspelho.status)) return { resultado: "ja-virou-assinatura" };
    if (await pixDevolvido(pagamento.id)) return { resultado: "devolvido" };
    const escolhida = escolherPrePaga(await assinaturasDoPix(pagamento.clienteId, pagamento.id));
    let assinaturaId: string | null = null;
    if (escolhida && "valendo" in escolhida) {
      assinaturaId = escolhida.valendo;
    } else {
      if (await temOutraAssinatura(tx, pagamento)) return { resultado: "ja-tem-outra-assinatura" };
      if (escolhida && "aPagar" in escolhida) {
        if ((await garantirFaturaPaga(escolhida.aPagar)).status === "paid") assinaturaId = escolhida.aPagar;
        else await cancelarIncompleta(escolhida.aPagar);
      }
    }
    if (!assinaturaId) {
      const preco = (await buscarPrecos()).find((p) => p.plano === pagamento.plano);
      if (!preco) return { resultado: "sem-preco" };
      // Nenhuma linha deste Pix valeu (conferido acima): a da MORTA passa pela sincronia de sempre, com a trava dela — que a
      // grava sem o Pix, porque ela não o usou —, e só então a nova nasce e grava nele (o espelho tem UM escritor — a
      // conferência do revisor do bloco 4).
      const morta = await tx.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { stripeSubscriptionId: true } });
      if (morta) {
        if (!(await travarChave(tx, morta.stripeSubscriptionId, false))) return { resultado: "ocupada" };
        await sincronizar(tx, morta.stripeSubscriptionId);
      }
      const criada = await criarAssinaturaPrePaga({ ...pagamento, precoId: preco.precoId }, "operador");
      if (!criada.faturaPaga) return { resultado: "fatura-nao-paga" };
      assinaturaId = criada.id;
    }
    await tirarDeConferencia(pagamento.id);
    if (!(await travarChave(tx, assinaturaId, false))) return { resultado: "ocupada" };
    return { resultado: "aceito", sincronia: await sincronizar(tx, assinaturaId) };
  }, TEMPO_DO_PIX);
}

/** O que "Devolver o Pix" fez (o painel da cobrança, passo 4c). */
export type PixDevolvidoPeloOperador = { resultado: "devolvido"; centavos: number } | { resultado: "ja-devolvido" | "ja-virou-assinatura" | "ocupada" | "nao-pago" };

/**
 * DEVOLVER O PIX EM CONFERÊNCIA (o painel da cobrança, passo 4c — P117), com a trava do Pix — a do aviso e a do aceite —, sem
 * esperar (achado P1 da revisão do bloco 4, 31/10/2026). O Pix que JÁ VIROU uma assinatura que vale não se devolve solto: a
 * pré-paga ficaria ativa sem o dinheiro (a regra das aulas libera a ativa sem olhar o pagamento); para ele é o "Cancelar e
 * devolver o dinheiro" da ficha, que encerra e devolve. A pré-paga ainda incompleta dele morre ANTES — paga por fora depois,
 * ela abriria as aulas sem o dinheiro; e se ela foi paga no meio, o Pix virou assinatura. Devolve o que falta, inteiro.
 */
export async function devolverPixEmConferencia(pagamentoId: string, dono: { userId: string | null }): Promise<PixDevolvidoPeloOperador> {
  const lido = await lerPagamentoPix(pagamentoId);
  if (lido.status !== "succeeded" || !lido.pagamento) return { resultado: "nao-pago" };
  const pagamento = lido.pagamento;
  return transacaoDaCobranca(async (tx): Promise<PixDevolvidoPeloOperador> => {
    if (!(await travarChave(tx, `pix:${pagamento.id}`, false))) return { resultado: "ocupada" };
    const noEspelho = await tx.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { status: true } });
    if (noEspelho && pixConsumido(noEspelho.status)) return { resultado: "ja-virou-assinatura" };
    const escolhida = escolherPrePaga(await assinaturasDoPix(pagamento.clienteId, pagamento.id));
    if (escolhida && "valendo" in escolhida) return { resultado: "ja-virou-assinatura" };
    if (escolhida && "aPagar" in escolhida && (await cancelarIncompleta(escolhida.aPagar)) !== "incomplete_expired") return { resultado: "ja-virou-assinatura" };
    const { centavos, devolvido } = await cobrancaDoPagamento(pagamento.id);
    if (centavos - devolvido <= 0) return { resultado: "ja-devolvido" };
    await devolver({ pagamentoId: pagamento.id, centavos, devolvido }, { userId: dono.userId ?? "sem-conta", assinaturaId: "sem-assinatura" });
    return { resultado: "devolvido", centavos: centavos - devolvido };
  }, TEMPO_DO_PIX);
}

/**
 * O primeiro Pix NOSSO já PAGO deste cliente (da lista de `listarPixDoCliente`) que ainda não tem um espelho
 * que VALEU — ou nada. Em conferência ele também volta, com a marca: a porta responde o aviso sem processar
 * de novo. Lê o espelho pela transação de quem chama (com a trava da conta ou do e-mail).
 */
export async function pixPagoSemEspelho(tx: Prisma.TransactionClient, pagos: PixPago[]): Promise<PixPago | null> {
  for (const pago of pagos) {
    const espelho = await tx.subscription.findUnique({ where: { pixPaymentIntentId: pago.id }, select: { status: true } });
    if (!espelho || !pixConsumido(espelho.status)) return pago;
  }
  return null;
}

/**
 * A PRÉ-PAGA ainda incompleta, achada entre as assinaturas do cliente (o aviso do Pix dela está no meio, ou a
 * fatura dela falhou): NUNCA se cancela nem se reaproveita (achado 2 da segunda revisão) — o Pix dela já foi
 * pago, e é ele que se processa, fora da trava.
 */
export async function pixDaPrePagaIncompleta(pixId: string): Promise<{ resultado: "pix-pago"; pagamento: PagamentoPrePago } | { resultado: "em-conferencia" }> {
  const lido = await lerPagamentoPix(pixId);
  if (lido.status === "succeeded" && lido.pagamento) return { resultado: "pix-pago", pagamento: lido.pagamento };
  // Uma vez a cada 15 min por Pix, por cópia (revisão do grupo 3 da 4.9b): cada clique de novo dispararia o alerta.
  alertarNoMaximoACada15Min(`[stripe] pix: a pré-paga do Pix ${pixId} está incompleta e o Pix está ${lido.status} — conferir no painel`);
  return { resultado: "em-conferencia" };
}

/**
 * UM QR POR VEZ / UM PAGAMENTO ABERTO POR VEZ (etapa 4.9): cancela os Pix à espera, menos o que `manter`
 * escolher. O "outro" que foi PAGO entre a lista e o cancelamento (a Stripe recusa cancelar o pago) volta
 * para ser processado — nas portas do Pix e também nas do cartão (achado 9 da segunda revisão).
 */
export async function cancelarOutrosPix(clienteId: string, pendentes: PixPendente[], manter: (pendente: PixPendente) => boolean = () => false): Promise<{ mantido: PixPendente | null } | { pago: PagamentoPrePago }> {
  const mesmo = pendentes.find(manter) ?? null;
  for (const outro of pendentes) {
    if (outro === mesmo) continue;
    try {
      await cancelarPagamentoPix(outro.id);
    } catch (erro) {
      const lido = await lerPagamentoPix(outro.id);
      if (lido.status !== "succeeded" || !lido.pagamento) throw erro;
      console.warn(`[stripe] pix: o pagamento ${outro.id} (cliente ${clienteId}) foi PAGO no meio do cancelamento — processado em vez de cancelado`);
      return { pago: lido.pagamento };
    }
  }
  return { mantido: mesmo };
}

/** Os Pix pagos deste cliente que ainda não têm um espelho que valeu, cada um pela rotina do aviso: o que o force-sync e a sincronia da ficha fazem ANTES de listar as assinaturas. Os em conferência ficam para o operador. */
async function processarPixPagosSemEspelho(clienteId: string): Promise<void> {
  const { pagos } = await listarPixDoCliente(clienteId);
  for (const pago of pagos) {
    const espelho = await prisma.subscription.findUnique({ where: { pixPaymentIntentId: pago.id }, select: { status: true } });
    if (espelho && pixConsumido(espelho.status)) continue;
    if (pago.emConferencia) {
      console.info(`[stripe] sincronia: o Pix ${pago.id} do cliente ${clienteId} está EM CONFERÊNCIA (${pago.emConferencia}) — fica para o operador`);
      continue;
    }
    console.info(`[stripe] sincronia: o Pix ${pago.id} do cliente ${clienteId} está pago e sem assinatura — processado agora`);
    const desfecho = await processarPixPago(pago);
    if (desfecho.resultado === "ocupada") console.info(`[stripe] sincronia: o Pix ${pago.id} está sendo processado agora por outro pedido`);
  }
}

/**
 * A sincronia SEM aviso: quem pede é o checkout ou o admin (o aviso atrasou ou se perdeu). A
 * mesma trava e a mesma rotina do aviso; não marca nenhum `event.id`, então o aviso que chegar
 * depois é processado normalmente — e dá no mesmo, porque os dois leem a Stripe na hora.
 */
export async function sincronizarAssinatura(assinaturaId: string): Promise<Sincronia> {
  try {
    return await transacaoDaCobranca(async (tx): Promise<Sincronia> => {
      await travar(tx, assinaturaId);
      return sincronizar(tx, assinaturaId);
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] a sincronia da assinatura ${assinaturaId} falhou: ${motivo}`, { cause: erro });
  }
}

/**
 * A sincronia que NÃO ESPERA a trava (etapa 4.6 — achado da revisão de segurança, 11/10/2026).
 * Para quem é chamado pelo ALUNO e pode ser repetido à vontade (a tela de Faturamento e
 * Assinatura): quem espera a trava espera segurando uma conexão do banco, e vários pedidos
 * juntos esgotariam as conexões e parariam o gate de todo mundo. Se a assinatura já está sendo
 * sincronizada por outro, devolve nada na hora — o espelho está sendo acertado de qualquer jeito,
 * e o aviso da Stripe vem atrás. A mesma rotina e a mesma trava; só não fica na fila.
 */
export async function sincronizarSeLivre(assinaturaId: string, opcoes: { manterSessao?: boolean } = {}): Promise<Sincronia | null> {
  try {
    return await transacaoDaCobranca(async (tx): Promise<Sincronia | null> => {
      const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${assinaturaId})) AS livre`;
      if (!trava?.livre) return null;
      return sincronizar(tx, assinaturaId, opcoes);
    }, TEMPO_DA_TRANSACAO);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] a sincronia da assinatura ${assinaturaId} falhou: ${motivo}`, { cause: erro });
  }
}

/** O que a operação fez na Stripe. `sincronia` vazia: a Stripe mudou, e o espelho ficou para o aviso dela. */
export type Operacao<T> = { feito: T; sincronia: Sincronia | null };

/**
 * UMA OPERAÇÃO DO DONO SOBRE A ASSINATURA (etapa 4.6, sessão b — parar a renovação, voltar atrás,
 * devolver o dinheiro, mudar de plano): a mudança na Stripe e, em seguida, a sincronia de sempre —
 * as duas COM A TRAVA desta assinatura. O aviso que a própria mudança dispara espera a trava e já
 * encontra o espelho gravado; nada grava o espelho à mão.
 * NÃO ESPERA a trava (como `sincronizarSeLivre`, e pelo mesmo motivo): se a assinatura está
 * ocupada, devolve nada na hora, SEM ter ido à Stripe — quem pediu tenta de novo.
 * `manterSessao`: a exceção do reembolso pedido pelo dono (ver o topo do arquivo) — decidida
 * pelo RESULTADO da operação, e não por quem a chama: a operação que não devolveu nada e
 * descobre que o acesso acabou derruba a sessão, como toda perda de acesso.
 * Se a Stripe mudou e a sincronia falhou, a operação VALEU: devolve-a sem a sincronia (é aviso no
 * registro; o aviso da Stripe acerta o espelho). Se a própria mudança falhou, sobe.
 */
export async function operarNaAssinatura<T>(assinaturaId: string, naStripe: () => Promise<T>, opcoes: { manterSessao?: (feito: T) => boolean } = {}): Promise<Operacao<T> | null> {
  const feita: { valor?: T; foi: boolean } = { foi: false };
  try {
    return await transacaoDaCobranca(async (tx): Promise<Operacao<T> | null> => {
      const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${assinaturaId})) AS livre`;
      if (!trava?.livre) return null;
      // O caso que a operação abrir (4.7b) é gravado quando a transação terminar — também se a sincronia falhar.
      const feito = await naStripe();
      feita.valor = feito;
      feita.foi = true;
      return { feito, sincronia: await sincronizar(tx, assinaturaId, { manterSessao: opcoes.manterSessao?.(feito) ?? false }) };
    }, TEMPO_DA_OPERACAO);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    if (!feita.foi) throw new Error(`[stripe] a operação na assinatura ${assinaturaId} falhou: ${motivo}`, { cause: erro });
    console.warn(`[stripe] a operação na assinatura ${assinaturaId} valeu na Stripe, e a sincronia ficou para o aviso: ${motivo}`);
    // `as T`: `foi` só é sim depois de `valor` receber o que a operação devolveu.
    return { feito: feita.valor as T, sincronia: null };
  }
}

/** O que a sincronia de uma conta encontrou em CADA assinatura dela. */
export type Conferida = { id: string } & (Sincronia | { resultado: "nao-encontrada" });

/**
 * A SINCRONIA DE UMA CONTA — o que o admin força quando o aviso da Stripe se perdeu (etapa 4.4;
 * a Stripe reentrega por até 3 dias, e depois disso só isto recupera). Confere, uma a uma e
 * pela rotina de sempre, as assinaturas que a STRIPE lista para o cliente desta conta (as
 * últimas 20, de qualquer status) e as que o ESPELHO já conhece dela. Serve aos dois lados:
 * libera quem pagou e ficou trancado, e tira o acesso de quem a Stripe já encerrou.
 * A assinatura que a Stripe não conhece é RELATADA — o espelho dela nunca é apagado por aqui.
 * Qualquer outra falha sobe: o que já foi conferido fica gravado, e repetir não faz mal.
 */
export async function sincronizarConta(userId: string): Promise<Conferida[]> {
  // FECHA na dúvida, como o gate: no Prisma, um filtro vazio traria as assinaturas de todo mundo.
  if (typeof userId !== "string" || userId.length === 0) throw new Error("[stripe] sincronia de conta sem a conta");
  const cliente = await prisma.stripeCustomer.findUnique({ where: { userId }, select: { stripeCustomerId: true } });
  // O Pix pago cujo aviso se perdeu não tem assinatura para a lista achar (achado 9 do passo 6 da 4.9): nasce aqui, antes.
  if (cliente) await processarPixPagosSemEspelho(cliente.stripeCustomerId);
  const noEspelho = await prisma.subscription.findMany({ where: { ownerUserId: userId }, select: { stripeSubscriptionId: true }, orderBy: { id: "asc" } });
  const naStripe = cliente ? await assinaturasDoCliente(cliente.stripeCustomerId) : [];
  return conferirUmaAUma([...naStripe.map((a) => a.id), ...noEspelho.map((a) => a.stripeSubscriptionId)]);
}

/**
 * A SINCRONIA DE UMA FICHA DE ESPERA (etapa 4.7, passo 4): o mesmo "Conferir na Stripe" do admin,
 * com o e-mail de quem pagou SEM CONTA e ficou sem ela — o aviso da Stripe se perdeu, e não há
 * conta para `sincronizarConta` achar. Confere, pela rotina de sempre, as assinaturas que a Stripe
 * lista para o cliente da ficha: se o pagamento passou, a conta NASCE ali. Sem ficha para este
 * e-mail (já em minúsculas): nada.
 */
export async function sincronizarPedido(email: string): Promise<Conferida[] | null> {
  if (typeof email !== "string" || email.length === 0) throw new Error("[stripe] sincronia de ficha sem o e-mail");
  const pedido = await prisma.guestCheckout.findUnique({ where: { email }, select: { stripeCustomerId: true } });
  if (!pedido) return null;
  await processarPixPagosSemEspelho(pedido.stripeCustomerId);
  return conferirUmaAUma((await assinaturasDoCliente(pedido.stripeCustomerId)).map((a) => a.id));
}

/**
 * A que expirou sem o primeiro pagamento não cobra nem dá acesso: a conferência pedida pela tela não gasta ida à Stripe
 * com ela. A CANCELADA vai (C5 da revisão do grupo 1, 29/10/2026) enquanto o período dela não acabou: com dias pagos,
 * o gate ainda dá acesso (`assinaturaDaAcesso`), e o aviso dela também pode ter se perdido. Quem diz se os dias foram
 * PAGOS é o "pago até" da sincronia (`paraAssinaturaNaStripe`), nunca o status — a assinatura criada no painel com
 * "enviar fatura" nasce ativa sem pagamento. A cancelada já acabada fica de fora (R4): o "pago até" nunca passa do fim
 * do período, e quem paga por Pix junta uma cancelada por período. A lista é das últimas 20 (`assinaturasDoCliente`).
 */
const ENCERRADAS_NA_CONFERENCIA: ReadonlySet<string> = new Set(["incomplete_expired"]);

/**
 * A CONFERÊNCIA PEDIDA PELA TELA DE DEPOIS DO PAGAMENTO (E2 da revisão ampla da cobrança, 29/10/2026 — plano → 4.9b):
 * o mesmo "Conferir na Stripe" do admin, para o cliente da PRÓPRIA conta (ou da ficha do visitante, achada pela
 * tentativa), mas SEM ESPERAR nenhuma trava — `sincronizarSeLivre`, e o Pix pela rotina sem aviso, que também não
 * espera: quem pede é o aluno, e pode repetir (quem espera a trava segura uma ligação do banco). Nada do navegador
 * vale como prova: vale o que a Stripe diz agora. Devolve as sincronias feitas (a ocupada e a que a Stripe não
 * conhece ficam de fora).
 */
export async function conferirOCliente(clienteId: string): Promise<Sincronia[]> {
  if (typeof clienteId !== "string" || clienteId.length === 0) throw new Error("[stripe] conferência sem o cliente");
  await processarPixPagosSemEspelho(clienteId);
  const feitas: Sincronia[] = [];
  const agora = Date.now();
  for (const { id, status, fimDoPeriodo } of await assinaturasDoCliente(clienteId)) {
    if (ENCERRADAS_NA_CONFERENCIA.has(status)) continue;
    // A regra do próprio gate, nunca uma cópia: a encerrada que ele não libera mais nem com o fim do período.
    if (encerradaDeVez({ status }) && fimDoPeriodo && !assinaturaDaAcesso({ status, currentPeriodEnd: fimDoPeriodo }, new Date(agora))) continue;
    try {
      const sincronia = await sincronizarSeLivre(id);
      if (sincronia) feitas.push(sincronia);
    } catch (erro) {
      if (!(erro instanceof Error && erro.cause instanceof AssinaturaNaoEncontrada)) throw erro;
    }
  }
  return feitas;
}

/** Cada assinatura pela rotina de sempre; a que a Stripe não conhece é relatada, e qualquer outra falha sobe. */
async function conferirUmaAUma(assinaturas: string[]): Promise<Conferida[]> {
  const conferidas: Conferida[] = [];
  for (const id of new Set(assinaturas)) {
    try {
      conferidas.push({ id, ...(await sincronizarAssinatura(id)) });
    } catch (erro) {
      if (!(erro instanceof Error && erro.cause instanceof AssinaturaNaoEncontrada)) throw erro;
      conferidas.push({ id, resultado: "nao-encontrada" });
    }
  }
  return conferidas;
}
