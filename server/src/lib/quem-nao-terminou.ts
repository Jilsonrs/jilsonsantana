import { OrigemDoLead, prisma } from "./prisma.js";
import { travarSeLivre, temConta } from "./checkout-do-visitante.js";
import { modoDaChave } from "./conferencia-da-cobranca.js";
import { getDict } from "./dict.js";
import { enviarEmail } from "./email.js";
import { enderecoDoSite } from "./endereco-do-site.js";
import { leadAtivo, registrarLead } from "./leads.js";
import { caminhoDoLink } from "./links-do-email.js";
import { apagarClienteNaStripe, cancelarPagamentoAberto, lerClienteNaStripe, type ClienteNaStripe } from "./stripe-limpeza.js";
import { montarLembrete, type Lembrete } from "../views/email-do-lembrete.js";

// QUEM NÃO TERMINOU DE ASSINAR (Fase 4, etapa 4.7, passo 9 — decisões do operador, 29/10/2026; plano aprovado em
// 30/10/2026). Quem começou a assinar sem conta e não pagou deixou uma FICHA (`guest_checkout`, sem conta) com o que a
// ÚLTIMA tentativa deixou: o nome, a caixa de novidades, o UTM e a hora. A rodada de hora em hora (o job
// `jilson-prod-avisos`, `tarefas/avisos-da-cobranca.ts`) passa por elas:
//   - O LEMBRETE, 2 horas depois da última tentativa, UM por ficha: "você não terminou a assinatura", com o botão de
//     terminar. Antes, a Stripe é conferida — quem já pagou (o aviso dela atrasou) não recebe. Quem marcou "Quero receber
//     novidades" vira LEAD nessa hora (nome e e-mail, nunca o CPF) e lê o link de descadastrar; quem não marcou lê o link
//     "Quero receber novidades" (clicou, vira lead — `routes/novidades.ts`).
//   - A LIMPEZA, 7 dias depois da última tentativa: a ficha e o CLIENTE DA STRIPE (com o CPF) são apagados. APAGAR UM
//     CLIENTE DA STRIPE CANCELA NA HORA AS ASSINATURAS ATIVAS DELE (context7 e medido, 30/10/2026): só se apaga o cliente
//     que nunca pagou nada — todas as assinaturas expiradas sem pagamento, nenhum pagamento pago, a lista inteira lida.
//     Qualquer pagamento: não apaga, e o alerta sai uma vez (alguém pagou e não tem conta — precisa de gente); a ficha é
//     conferida de novo uma vez por dia. A Stripe primeiro, a ficha depois: se a Stripe falha, a ficha fica e a próxima
//     hora tenta; o cliente que ela não conhece mais conta como apagado. Tudo com a TRAVA DO E-MAIL (a mesma do assinar
//     sem login), que não espera: o visitante que volta exatamente agora segue, e a ficha fica para a próxima hora.
// Fora de transação e de trava, o e-mail (CLAUDE.md → Membership Gating). Uma ficha que falha não para as outras.

const HORA_EM_MS = 60 * 60 * 1000;
const DIA_EM_MS = 24 * HORA_EM_MS;
/** O lembrete sai 2 horas depois da última tentativa (decisão do operador, 29/10/2026). */
export const ESPERA_DO_LEMBRETE_EM_MS = 2 * HORA_EM_MS;
/** A ficha e o cliente da Stripe saem 7 dias depois da última tentativa (decisão do operador, 29/10/2026). */
export const PRAZO_DA_FICHA_EM_MS = 7 * DIA_EM_MS;
/** O lembrete tomado e sem a confirmação do Resend há mais que isto é retomado: quem o tomou caiu no meio. */
export const PRAZO_DO_LEMBRETE_PENDENTE_EM_MS = 15 * 60 * 1000;
/** A ficha que não pôde ser apagada (houve pagamento) volta a ser conferida uma vez por dia — sem alerta de novo. */
export const INTERVALO_DA_NAO_APAGADA_EM_MS = DIA_EM_MS;
/** No máximo tantas fichas por rodada (as mais antigas primeiro): o resto fica para a próxima hora. */
export const MAXIMO_DE_FICHAS_POR_RODADA = 100;
/**
 * A margem que o job deixa para a última ficha começada: a limpeza vai à Stripe até umas 7 vezes, e o job tem 5 minutos
 * ao todo (`tarefas/avisos-da-cobranca.ts`) — sem margem, uma ficha começada no fim do prazo passaria do tempo do job.
 */
export const MARGEM_DA_ULTIMA_FICHA_EM_MS = 50_000;
/** A limpeza vai à Stripe até umas 7 vezes com a trava do e-mail na mão (10 s cada, com uma nova tentativa). */
const TEMPO_DA_LIMPEZA = { maxWait: 10_000, timeout: 120_000 };

/** A ficha como a rodada a lê. */
export type FichaDaRodada = {
  id: string;
  email: string;
  stripeCustomerId: string;
  livemode: boolean;
  userId: string | null;
  nome: string | null;
  novidades: boolean;
  acquisitionSource: string | null;
  acquisitionCampaign: string | null;
  ultimaTentativaEm: Date;
  lembreteTomadoEm: Date | null;
  lembreteEnviadoEm: Date | null;
  naoApagadaEm: Date | null;
};

const CAMPOS = {
  id: true,
  email: true,
  stripeCustomerId: true,
  livemode: true,
  userId: true,
  nome: true,
  novidades: true,
  acquisitionSource: true,
  acquisitionCampaign: true,
  ultimaTentativaEm: true,
  lembreteTomadoEm: true,
  lembreteEnviadoEm: true,
  naoApagadaEm: true,
} as const;

export type OQueFazer = "nada" | "lembrar" | "apagar";

/** O que fazer com a ficha AGORA. Função pura. */
export function oQueFazerComAFicha(ficha: Pick<FichaDaRodada, "userId" | "ultimaTentativaEm" | "lembreteTomadoEm" | "lembreteEnviadoEm" | "naoApagadaEm">, agora: Date): OQueFazer {
  // A ficha que virou conta é a origem da conta: some com ela, nunca aqui.
  if (ficha.userId !== null) return "nada";
  const desde = agora.getTime() - ficha.ultimaTentativaEm.getTime();
  if (desde >= PRAZO_DA_FICHA_EM_MS) {
    if (ficha.naoApagadaEm && agora.getTime() - ficha.naoApagadaEm.getTime() < INTERVALO_DA_NAO_APAGADA_EM_MS) return "nada";
    return "apagar";
  }
  if (desde < ESPERA_DO_LEMBRETE_EM_MS || ficha.lembreteEnviadoEm) return "nada";
  if (ficha.lembreteTomadoEm && agora.getTime() - ficha.lembreteTomadoEm.getTime() < PRAZO_DO_LEMBRETE_PENDENTE_EM_MS) return "nada";
  return "lembrar";
}

/** Os pagamentos que contam como pagos (ou a caminho de ser): o dinheiro saiu, ou vai sair. */
const PAGO = new Set(["succeeded", "processing", "requires_capture"]);

/** O cliente já pagou, ou está pagando? Uma assinatura que passou da incompleta, ou um pagamento pago. Função pura. */
export function pagouOuEstaPagando(cliente: ClienteNaStripe): boolean {
  return cliente.assinaturas.some((status) => status !== "incomplete" && status !== "incomplete_expired") || cliente.pagamentos.some((p) => PAGO.has(p.status));
}

/**
 * Pode apagar o cliente? SÓ o que nunca pagou nada: a lista inteira lida, todas as assinaturas EXPIRADAS SEM PAGAMENTO
 * (`incomplete_expired` — a incompleta ainda pode ser paga), nenhum pagamento pago. Os pagamentos ainda abertos (o QR
 * vencido) são cancelados antes. Função pura.
 */
export function podeApagar(cliente: ClienteNaStripe): { pode: true; aCancelar: string[] } | { pode: false; motivo: string } {
  if (!cliente.completo) return { pode: false, motivo: "a Stripe tem mais assinaturas ou pagamentos deste cliente do que a limpeza lê" };
  const assinatura = cliente.assinaturas.find((status) => status !== "incomplete_expired");
  if (assinatura) return { pode: false, motivo: `há uma assinatura ${assinatura}` };
  const pago = cliente.pagamentos.find((p) => PAGO.has(p.status));
  if (pago) return { pode: false, motivo: `o pagamento ${pago.id} está ${pago.status}` };
  return { pode: true, aCancelar: cliente.pagamentos.filter((p) => p.status !== "canceled").map((p) => p.id) };
}

/** O que a rodada fez com as fichas. */
export type RodadaDeQuemNaoTerminou = {
  /** Lembretes entregues ao Resend. */
  lembretes: number;
  /** Fichas que não recebem lembrete: o e-mail tem conta, ou a Stripe diz que houve pagamento. */
  semLembrete: number;
  apagadas: number;
  /** Fichas com pagamento na Stripe: não apagadas (o alerta sai uma vez). */
  comPagamento: number;
  /** Fichas de outro modo da Stripe (teste numa chave de verdade, ou o contrário): não apagadas. */
  outroModo: number;
  /** A trava do e-mail ocupada, ou o lembrete tomado por outro: ficam para a próxima hora. */
  ocupadas: number;
  falhas: number;
  /** As que ficaram para a próxima hora pelo prazo da rodada. */
  adiadas: number;
};

/** O link do lembrete: o de descadastrar (quem é lead) ou o de pedir as novidades (quem não é). Sem endereço que sirva, nenhum. */
function linkDoLembrete(ficha: FichaDaRodada, lead: { id: string } | null): Lembrete["link"] {
  const caminho = lead ? caminhoDoLink("descadastrar", lead.id) : caminhoDoLink("novidades", ficha.id);
  const endereco = enderecoDoSite(caminho);
  return endereco ? { tipo: lead ? "descadastrar" : "novidades", endereco } : null;
}

/** O lembrete não será mandado (o e-mail tem conta, ou houve pagamento): a marca fica resolvida, e a rodada não volta aqui. */
async function semLembrete(ficha: FichaDaRodada, agora: Date, motivo: string): Promise<void> {
  await prisma.guestCheckout.updateMany({ where: { id: ficha.id, lembreteEnviadoEm: null }, data: { lembreteTomadoEm: agora, lembreteEnviadoEm: agora } });
  console.info(`[avisos] a ficha ${ficha.id} não recebe o lembrete: ${motivo}`);
}

/** O consentimento da caixa marcada ao assinar: o lead da ficha (o nome, o e-mail e o UTM — nunca o CPF). */
function consentimentoDaCaixa(ficha: FichaDaRodada) {
  return {
    email: ficha.email,
    nome: ficha.nome,
    origem: OrigemDoLead.CAIXA_AO_ASSINAR,
    consentimentoEm: ficha.ultimaTentativaEm,
    confirmadoEm: null,
    acquisitionSource: ficha.acquisitionSource,
    acquisitionCampaign: ficha.acquisitionCampaign,
  };
}

/** O LEMBRETE desta ficha — UM. */
async function lembrar(ficha: FichaDaRodada, agora: Date): Promise<"lembrete" | "sem-lembrete" | "ocupada" | "falha"> {
  if (await temConta(prisma, ficha.email)) {
    await semLembrete(ficha, agora, "o e-mail tem conta");
    return "sem-lembrete";
  }
  // Quem já pagou (o aviso da Stripe atrasou, ou o Pix está em conferência) não recebe "você não terminou".
  const naStripe = await lerClienteNaStripe(ficha.stripeCustomerId);
  if (naStripe !== "nao-existe" && pagouOuEstaPagando(naStripe)) {
    await semLembrete(ficha, agora, "há pagamento na Stripe");
    return "sem-lembrete";
  }
  // Quem marcou a caixa vira lead agora (a última tentativa decide); quem não marcou pode já ser lead de antes. Quem é
  // lead (e recebe novidades) lê o link de descadastrar; os outros, o de pedir as novidades.
  const lead = ficha.novidades ? await registrarLead(consentimentoDaCaixa(ficha)) : await leadAtivo(ficha.email);
  const recebeNovidades = lead !== null && ("ativo" in lead ? lead.ativo : true);
  // Montado ANTES de tomar a marca: uma falha aqui não deixa a marca presa sem e-mail.
  const mensagem = montarLembrete({ nome: ficha.nome, link: linkDoLembrete(ficha, recebeNovidades ? { id: lead.id } : null) }, (await getDict()).app.email.lembrete);
  const limite = new Date(agora.getTime() - PRAZO_DO_LEMBRETE_PENDENTE_EM_MS);
  const tomada = await prisma.guestCheckout.updateMany({
    where: { id: ficha.id, userId: null, lembreteEnviadoEm: null, OR: [{ lembreteTomadoEm: null }, { lembreteTomadoEm: { lt: limite } }] },
    data: { lembreteTomadoEm: agora },
  });
  if (tomada.count !== 1) return "ocupada";
  const envio = await enviarEmail({ para: ficha.email, tipo: "lembrete-da-assinatura", referencia: `ficha:${ficha.id}`, chave: `lembrete-da-assinatura/${ficha.id}`, mensagem });
  // Enviado: a marca fica confirmada. Falhou: a marca sai, e a próxima hora tenta. "Duplicado" é o outro envio, com a
  // mesma chave, saindo agora: a marca fica pendente, e é retomada se ninguém a confirmar.
  if (envio.enviado) {
    await prisma.guestCheckout.updateMany({ where: { id: ficha.id }, data: { lembreteEnviadoEm: agora } });
    return "lembrete";
  }
  if (envio.motivo === "falhou") {
    await prisma.guestCheckout.updateMany({ where: { id: ficha.id, lembreteEnviadoEm: null }, data: { lembreteTomadoEm: null } });
    return "falha";
  }
  return "ocupada";
}

/** A LIMPEZA desta ficha, 7 dias depois da última tentativa. */
async function apagar(ficha: FichaDaRodada, agora: Date): Promise<"apagada" | "com-pagamento" | "outro-modo" | "ocupada" | "nada"> {
  const modo = modoDaChave(process.env.STRIPE_SECRET_KEY, ["sk", "rk"]);
  if (modo === null) throw new Error("[stripe] limpeza: sem uma chave secreta da Stripe com a forma de chave");
  if (ficha.livemode !== (modo === "live")) {
    // A ficha de outro modo (teste com a chave de verdade, ou o contrário): esta chave não alcança o cliente dela.
    await prisma.guestCheckout.updateMany({ where: { id: ficha.id }, data: { naoApagadaEm: agora } });
    console.warn(`[stripe] limpeza: a ficha ${ficha.id} é do ${ficha.livemode ? "modo de verdade" : "modo de teste"} e a chave não — não apagada`);
    return "outro-modo";
  }
  // Quem marcou a caixa vira lead (o lembrete pode não ter saído) — antes, fora da trava: se a limpeza falhar no meio,
  // o lead fica, e a próxima hora não o duplica.
  if (ficha.novidades) await registrarLead(consentimentoDaCaixa(ficha));
  return prisma.$transaction(async (tx) => {
    if (!(await travarSeLivre(tx, ficha.email))) return "ocupada";
    // Relida COM a trava: o visitante pode ter voltado (a última tentativa mudou) ou ter pago (a conta nasceu).
    const atual = await tx.guestCheckout.findUnique({ where: { id: ficha.id }, select: CAMPOS });
    if (!atual || oQueFazerComAFicha(atual, agora) !== "apagar") return "nada";
    const naStripe = await lerClienteNaStripe(atual.stripeCustomerId);
    if (naStripe !== "nao-existe") {
      const decisao = podeApagar(naStripe);
      if (!decisao.pode) {
        await tx.guestCheckout.update({ where: { id: atual.id }, data: { naoApagadaEm: agora } });
        if (atual.naoApagadaEm === null) {
          console.error(`[stripe] limpeza: a ficha ${atual.id} (cliente ${atual.stripeCustomerId}) NÃO foi apagada — ${decisao.motivo}: alguém pagou e ficou sem conta? Conferir no painel da Stripe`);
        }
        return "com-pagamento";
      }
      for (const pagamento of decisao.aCancelar) await cancelarPagamentoAberto(pagamento);
      await apagarClienteNaStripe(atual.stripeCustomerId);
    }
    await tx.guestCheckout.delete({ where: { id: atual.id } });
    console.info(`[stripe] limpeza: a ficha ${atual.id} e o cliente ${atual.stripeCustomerId} apagados (7 dias sem pagamento)`);
    return "apagada";
  }, TEMPO_DA_LIMPEZA);
}

/**
 * A RODADA DE QUEM NÃO TERMINOU DE ASSINAR (de hora em hora, pelo job `jilson-prod-avisos`, depois dos e-mails da
 * cobrança). Para de pegar fichas quando o prazo acaba: as que sobram ficam para a próxima hora, com um aviso.
 */
export async function rodadaDeQuemNaoTerminou(agora: Date = new Date(), prazoEmMs: number = 60_000): Promise<RodadaDeQuemNaoTerminou> {
  const limiteDoRelogio = Date.now() + prazoEmMs;
  const candidatas = await prisma.guestCheckout.findMany({
    where: {
      userId: null,
      ultimaTentativaEm: { lte: new Date(agora.getTime() - ESPERA_DO_LEMBRETE_EM_MS) },
      OR: [
        { lembreteEnviadoEm: null },
        { ultimaTentativaEm: { lte: new Date(agora.getTime() - PRAZO_DA_FICHA_EM_MS) }, OR: [{ naoApagadaEm: null }, { naoApagadaEm: { lt: new Date(agora.getTime() - INTERVALO_DA_NAO_APAGADA_EM_MS) } }] },
      ],
    },
    select: CAMPOS,
    orderBy: { ultimaTentativaEm: "asc" },
    take: MAXIMO_DE_FICHAS_POR_RODADA + 1,
  });
  if (candidatas.length > MAXIMO_DE_FICHAS_POR_RODADA) {
    console.warn(`[avisos] mais de ${MAXIMO_DE_FICHAS_POR_RODADA} fichas de quem não terminou de assinar para uma rodada — as mais antigas primeiro, o resto na próxima hora`);
    candidatas.length = MAXIMO_DE_FICHAS_POR_RODADA;
  }
  const rodada: RodadaDeQuemNaoTerminou = { lembretes: 0, semLembrete: 0, apagadas: 0, comPagamento: 0, outroModo: 0, ocupadas: 0, falhas: 0, adiadas: 0 };
  for (const ficha of candidatas) {
    const fazer = oQueFazerComAFicha(ficha, agora);
    if (fazer === "nada") continue;
    if (Date.now() >= limiteDoRelogio) {
      rodada.adiadas++;
      continue;
    }
    try {
      if (fazer === "lembrar") {
        const feito = await lembrar(ficha, agora);
        if (feito === "lembrete") rodada.lembretes++;
        else if (feito === "sem-lembrete") rodada.semLembrete++;
        else if (feito === "ocupada") rodada.ocupadas++;
        else rodada.falhas++;
      } else {
        const feito = await apagar(ficha, agora);
        if (feito === "apagada") rodada.apagadas++;
        else if (feito === "com-pagamento") rodada.comPagamento++;
        else if (feito === "outro-modo") rodada.outroModo++;
        else if (feito === "ocupada") rodada.ocupadas++;
      }
    } catch (erro) {
      rodada.falhas++;
      console.error(`[avisos] a rodada de quem não terminou de assinar falhou na ficha ${ficha.id}: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  if (rodada.adiadas > 0) console.warn(`[avisos] a rodada de quem não terminou parou pelo prazo (${Math.round(prazoEmMs / 1000)} s): ${rodada.adiadas} ficha(s) ficaram para a próxima hora`);
  return rodada;
}
