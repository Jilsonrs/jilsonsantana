import { Prisma } from "./prisma.js";
import { prisma } from "./prisma.js";
import { cobrancaAtrasada, temAcessoAtivo } from "./acesso.js";
import { AssinaturaNaoEncontrada, assinaturasDoCliente, buscarAssinatura, buscarPrecos, type AssinaturaNaStripe, type AvisoDaStripe, type PagamentoPrePago } from "./stripe.js";
import { assinaturaDoPagamento } from "./stripe-reembolso.js";
import { assinaturaDoPagamentoPrePago, criarAssinaturaPrePaga, garantirFaturaPaga, pagamentosPixPagos } from "./stripe-pix.js";
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
// UMA EXCEÇÃO, decidida pelo operador (11/10/2026): depois do REEMBOLSO pedido pela própria
// pessoa, ela continua logada — lê a confirmação e segue no site, sem as aulas. É a opção
// `manterSessao`, que só a operação de reembolso do dono usa.
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

export type Desfecho = { resultado: "repetido" } | { resultado: "sem-assinatura" } | Sincronia;

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
 * O Pix que caiu (`processarPixPrePago`): até 7 idas à Stripe dentro da transação — a busca, os preços,
 * criar, pagar por fora (e reler a fatura se falhar), a assinatura para o espelho e a cobrança do Pix
 * (`periodoDevolvido`) —, cada uma com 10 s e uma nova tentativa (`stripe-cliente.ts`): 7 × 20 s = 140 s
 * no pior caso (achado da revisão geral, 29/10/2026 — os 90 s de antes não cobriam).
 */
const TEMPO_DO_PIX = { maxWait: 10_000, timeout: 150_000 };

function eRepetido(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/** Uma assinatura de cada vez: quem chega depois espera aqui, e só então busca na Stripe. */
function travar(tx: Prisma.TransactionClient, assinaturaId: string) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${assinaturaId}))`;
}

/**
 * COM a trava desta assinatura já tomada por `tx`: o que a Stripe diz AGORA vira o espelho.
 * `manterSessao`: quem perde o acesso NÃO é deslogado — só o reembolso pedido pelo dono.
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
  const dados = { status: agora.status, currentPeriodEnd: agora.pagoAte, stripeCustomerId: agora.clienteId, livemode: agora.livemode, pixPaymentIntentId: agora.pixPaymentIntentId ?? null };
  const tinhaAcesso = dono !== null && (await temAcessoAtivo(dono, tx));

  if (espelho) await tx.subscription.update({ where: { id: espelho.id }, data: dados });
  else await tx.subscription.create({ data: { ...dados, stripeSubscriptionId: agora.id, ownerUserId: dono } });

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

export async function processarAviso(aviso: AvisoDaStripe): Promise<Desfecho> {
  if (await prisma.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };
  // O PIX PRÉ-PAGO que caiu (etapa 4.9): a assinatura ainda não existe — nasce aqui, e daí em diante é
  // a sincronia de sempre.
  if (aviso.pagamentoPrePago) return processarPixPrePago(aviso, aviso.pagamentoPrePago);
  const marcar = { id: aviso.id, type: aviso.tipo };
  // O aviso de dinheiro devolvido só traz o pagamento: a assinatura dele se acha na Stripe. Se a
  // busca falhar, sobe — nada fica marcado, e a Stripe entrega de novo.
  const assinaturaId = aviso.assinatura ?? (aviso.pagamento ? await assinaturaDoPagamentoDevolvido(aviso.pagamento) : null);

  if (!assinaturaId) {
    try {
      await prisma.stripeEvent.create({ data: marcar });
    } catch (erro) {
      // O mesmo aviso, entregue duas vezes ao mesmo tempo: o segundo esbarra no id.
      if (eRepetido(erro)) return { resultado: "repetido" };
      throw erro;
    }
    return { resultado: "sem-assinatura" };
  }

  try {
    return await prisma.$transaction(async (tx): Promise<Desfecho> => {
      await travar(tx, assinaturaId);
      // Com a trava: o mesmo aviso que esperava na fila já foi processado por quem veio antes.
      if (await tx.stripeEvent.findUnique({ where: { id: aviso.id }, select: { id: true } })) return { resultado: "repetido" };
      const sincronia = await sincronizar(tx, assinaturaId);
      // Marcado na MESMA transação do espelho — também quando não há conta: o aviso foi visto.
      await tx.stripeEvent.create({ data: marcar });
      return sincronia;
    }, TEMPO_DA_TRANSACAO);
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

/**
 * A MESMA rotina do aviso, para o Pix pago que o aviso ainda não trouxe (achado 4 do passo 6, 29/10/2026):
 * o checkout por Pix e por cartão (logado e visitante) e o force-sync do admin a chamam quando acham um
 * Pix nosso `succeeded` sem espelho (`pixPagoSemEspelho`). Sem aviso, nenhum `event.id` é marcado — o
 * aviso que chegar depois encontra o espelho e é "atualizada" de novo, como a sincronia sem aviso.
 */
export async function processarPixPago(pagamento: PagamentoPrePago, aviso?: AvisoDaStripe): Promise<Desfecho> {
  const marcar = aviso ? { id: aviso.id, type: aviso.tipo } : null;
  try {
    return await prisma.$transaction(async (tx): Promise<Desfecho> => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pix:${pagamento.id}`}))`;
      if (marcar && (await tx.stripeEvent.findUnique({ where: { id: marcar.id }, select: { id: true } }))) return { resultado: "repetido" };
      const noEspelho = await tx.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { stripeSubscriptionId: true } });
      let assinaturaId = noEspelho?.stripeSubscriptionId ?? (await assinaturaDoPagamentoPrePago(pagamento.id));
      if (assinaturaId) {
        await garantirFaturaPaga(assinaturaId, pagamento.id);
      } else {
        const preco = (await buscarPrecos()).find((p) => p.precoId === pagamento.precoId) ?? null;
        if (!preco || preco.centavos !== pagamento.centavos) {
          console.error(`[stripe] ${marcar ? `aviso ${marcar.id}` : "pix pago sem aviso"}: o Pix ${pagamento.id} pagou ${pagamento.centavos} centavos e o preço ${pagamento.precoId} ${preco ? `custa ${preco.centavos}` : "não está mais à venda"} — a assinatura pré-paga NÃO foi criada; conferir no painel da Stripe (devolver o Pix, ou criar a assinatura à mão)`);
          if (marcar) await tx.stripeEvent.create({ data: marcar });
          return { resultado: "sem-assinatura" };
        }
        assinaturaId = await criarAssinaturaPrePaga(pagamento);
      }
      await travar(tx, assinaturaId);
      const sincronia = await sincronizar(tx, assinaturaId);
      if (marcar) await tx.stripeEvent.create({ data: marcar });
      return sincronia;
    }, TEMPO_DO_PIX);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    throw new Error(`[stripe] ${marcar ? `aviso ${marcar.id} (pagamento pré-pago ${pagamento.id})` : `o Pix pago ${pagamento.id}`} falhou: ${motivo}`, { cause: erro });
  }
}

/**
 * O primeiro Pix NOSSO já PAGO deste cliente que ainda não virou espelho — ou nada. Quem chama
 * (`processarPixPago`) o transforma em assinatura antes de criar outro QR ou outro cartão. Lê o espelho
 * pela transação de quem chama (com a trava da conta ou do e-mail): o aviso pode ter chegado no meio.
 */
export async function pixPagoSemEspelho(tx: Prisma.TransactionClient, clienteId: string): Promise<PagamentoPrePago | null> {
  for (const pagamento of await pagamentosPixPagos(clienteId)) {
    if (!(await tx.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { id: true } }))) return pagamento;
  }
  return null;
}

/** Os Pix pagos deste cliente que ainda não têm espelho, cada um pela rotina do aviso: o que o force-sync e a sincronia da ficha fazem ANTES de listar as assinaturas. */
async function processarPixPagosSemEspelho(clienteId: string): Promise<void> {
  for (const pagamento of await pagamentosPixPagos(clienteId)) {
    if (await prisma.subscription.findUnique({ where: { pixPaymentIntentId: pagamento.id }, select: { id: true } })) continue;
    console.info(`[stripe] sincronia: o Pix ${pagamento.id} do cliente ${clienteId} está pago e sem assinatura — processado agora`);
    await processarPixPago(pagamento);
  }
}

/**
 * A sincronia SEM aviso: quem pede é o checkout ou o admin (o aviso atrasou ou se perdeu). A
 * mesma trava e a mesma rotina do aviso; não marca nenhum `event.id`, então o aviso que chegar
 * depois é processado normalmente — e dá no mesmo, porque os dois leem a Stripe na hora.
 */
export async function sincronizarAssinatura(assinaturaId: string): Promise<Sincronia> {
  try {
    return await prisma.$transaction(async (tx): Promise<Sincronia> => {
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
    return await prisma.$transaction(async (tx): Promise<Sincronia | null> => {
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
    return await prisma.$transaction(async (tx): Promise<Operacao<T> | null> => {
      const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${assinaturaId})) AS livre`;
      if (!trava?.livre) return null;
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
