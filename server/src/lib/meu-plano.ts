import { VALIDADE_DA_PREVIA_DA_TROCA, type Plano, type PlanoMudado, type TrocaDePlano, type TrocaDesfeita } from "@jilson/core";
import { operarNaAssinatura } from "./assinaturas.js";
import { assinaturaDaConta, outroPlano } from "./minha-assinatura.js";
import { buscarPrecos } from "./stripe.js";
import { agendarTroca, anularFatura, calcularTroca, soltarAgendamento, trocarAgora, type DesfechoDaTroca } from "./stripe-plano.js";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b — billing.md → Minha assinatura). As operações da
// tela `…/faturamento/plano`, na mesma disciplina de `minha-assinatura.ts`: o pedido nunca diz
// QUAL assinatura (é a da conta da sessão) nem preço ou valor — só PARA QUAL plano. Decisões do
// operador (11/10/2026):
//   - mensal → anual vale NA HORA, com o valor mostrado antes;
//   - anual → mensal vale NO FIM do ano já pago — nada muda nem é cobrado até lá —, e dá para
//     desistir;
//   - trocar de plano não recomeça o prazo do reembolso (a data de início da assinatura não muda).
// O VALOR MOSTRADO É O COBRADO: a prévia devolve o instante da conta (`previaDe`), o site o manda
// de volta, e a troca usa o MESMO instante. O servidor só aceita um instante RECENTE: um antigo
// daria crédito por dias do mês que a pessoa já usou.
// Cada operação é a Stripe e depois a sincronia, com a trava da assinatura (`operarNaAssinatura`).

type SemTroca = { resultado: "sem-assinatura" } | { resultado: "desconhecida" } | { resultado: "ocupada" };

const emSegundos = (data: Date) => Math.floor(data.getTime() / 1000);

/** O instante da conta ainda vale? Nem velho (daria crédito por dias já usados), nem do futuro. Função pura. */
export function previaAindaVale(previaDe: number | undefined, agora: Date = new Date()): previaDe is number {
  if (typeof previaDe !== "number" || !Number.isInteger(previaDe)) return false;
  const [limiteVelho, limiteNovo] = [emSegundos(agora) - VALIDADE_DA_PREVIA_DA_TROCA, emSegundos(agora) + 60];
  return previaDe >= limiteVelho && previaDe <= limiteNovo;
}

/** O preço do plano, lido da Stripe pela lookup key — o mesmo da tela de assinar. */
async function precoDoPlano(plano: Plano): Promise<{ precoId: string; centavos: number; moeda: string }> {
  const preco = (await buscarPrecos()).find((p) => p.plano === plano);
  if (!preco) throw new Error(`[stripe] plano ${plano} sem preço`);
  return preco;
}

export type OfertaDeTroca = { resultado: "ok"; troca: TrocaDePlano | null } | Exclude<SemTroca, { resultado: "ocupada" }>;

/** A troca de plano que ESTA conta pode fazer agora, já com a conta da Stripe — ou nenhuma. Não muda nada. */
export async function lerTrocaDePlano(userId: string): Promise<OfertaDeTroca> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { detalhes } = achada;
  const para = outroPlano(detalhes);
  if (!para || !detalhes.itemId) return { resultado: "ok", troca: null };
  const novo = await precoDoPlano(para);
  const preco = { centavos: novo.centavos, moeda: novo.moeda };
  if (para === "mensal") {
    // Vale no fim do período já pago: sem essa data não há o que prometer.
    if (!detalhes.fimDoPeriodo) return { resultado: "ok", troca: null };
    return { resultado: "ok", troca: { para, quando: "fim-do-periodo", preco, em: detalhes.fimDoPeriodo.toISOString() } };
  }
  const previaDe = emSegundos(new Date());
  const conta = await calcularTroca({ assinaturaId: detalhes.id, itemId: detalhes.itemId, precoId: novo.precoId, em: previaDe });
  return { resultado: "ok", troca: { para, quando: "agora", preco, hoje: { centavos: conta.centavosHoje, moeda: conta.moeda }, proximaEm: conta.proximaEm ? conta.proximaEm.toISOString() : null, previaDe } };
}

/**
 * `indisponivel`: esta assinatura não pode ir para esse plano agora (já é dele, não renova, está
 * atrasada, ou já tem troca marcada). `previa-vencida`: a conta mostrada envelheceu — a tela pede
 * outra. `recusado`: o cartão não passou; o plano continua o mesmo e nada foi cobrado.
 */
export type Mudanca = ({ resultado: "ok" } & PlanoMudado) | { resultado: "indisponivel" } | { resultado: "previa-vencida" } | { resultado: "recusado" } | SemTroca;

/** Muda o plano da assinatura DESTA conta: para o anual, na hora; para o mensal, no fim do período pago. */
export async function mudarMeuPlano(userId: string, pedido: { plano: Plano; previaDe?: number }): Promise<Mudanca> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { detalhes } = achada;
  const { id, itemId } = detalhes;
  if (outroPlano(detalhes) !== pedido.plano || !itemId) return { resultado: "indisponivel" };
  const novo = await precoDoPlano(pedido.plano);

  if (pedido.plano === "mensal") {
    const operacao = await operarNaAssinatura(id, () => agendarTroca(id, novo.precoId));
    if (!operacao) return { resultado: "ocupada" };
    console.info(`[stripe] mudar de plano: conta ${userId}, assinatura ${id}, mensal marcado para o fim do período`);
    return { resultado: "ok", estado: "marcado", em: operacao.feito.toISOString() };
  }

  const { previaDe } = pedido;
  if (!previaAindaVale(previaDe)) return { resultado: "previa-vencida" };
  const operacao = await operarNaAssinatura(id, async (): Promise<DesfechoDaTroca> => {
    const desfecho = await trocarAgora({ assinaturaId: id, itemId, precoId: novo.precoId, em: previaDe });
    // RECUSADO: a fatura da troca é anulada JÁ — a tela diz "nada foi cobrado", e uma fatura em
    // aberto ainda poderia ser cobrada depois. Se não anular, precisa de gente.
    if (desfecho.estado === "recusado" && desfecho.faturaId) {
      try {
        await anularFatura(desfecho.faturaId);
      } catch (erro) {
        console.error(`[stripe] mudar de plano: o cartão da assinatura ${id} (conta ${userId}) foi recusado e a fatura da troca continuou em aberto — anular pelo painel da Stripe: ${erro instanceof Error ? erro.message : String(erro)}`);
      }
    }
    return desfecho;
  });
  if (!operacao) return { resultado: "ocupada" };
  const desfecho = operacao.feito;
  if (desfecho.estado === "recusado") {
    console.warn(`[stripe] mudar de plano: o cartão da assinatura ${id} (conta ${userId}) foi recusado; o plano continua o mesmo`);
    return { resultado: "recusado" };
  }
  console.info(`[stripe] mudar de plano: conta ${userId}, assinatura ${id}, anual ${desfecho.estado === "trocado" ? "na hora" : "esperando a confirmação do banco"}`);
  // O segredo vai SÓ na resposta — nunca para o registro.
  return desfecho.estado === "trocado" ? { resultado: "ok", estado: "trocado" } : { resultado: "ok", estado: "confirmar", segredo: desfecho.segredo };
}

export type Desistencia = ({ resultado: "ok" } & TrocaDesfeita) | SemTroca;

/**
 * DESISTE da troca: solta a que estava marcada para o fim do período (a assinatura segue no
 * plano de hoje), ou anula a troca na hora que ficou esperando a confirmação do banco (nada mais
 * é cobrado por ela). Sem troca nenhuma, não faz nada: repetir não faz mal.
 */
export async function desistirDaTroca(userId: string): Promise<Desistencia> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { id, agendamentoId, faturaDaTrocaId } = achada.detalhes;
  if (!agendamentoId && !faturaDaTrocaId) return { resultado: "ok", trocado: false };
  const operacao = await operarNaAssinatura(id, async () => {
    if (agendamentoId) await soltarAgendamento(agendamentoId);
    // `paga`: a pessoa completou a confirmação no mesmo instante — o plano mudou.
    return faturaDaTrocaId ? (await anularFatura(faturaDaTrocaId)) === "paga" : false;
  });
  if (!operacao) return { resultado: "ocupada" };
  console.info(`[stripe] desistir da troca de plano: conta ${userId}, assinatura ${id}${operacao.feito ? " — o pagamento já tinha passado: o plano mudou" : ""}`);
  return { resultado: "ok", trocado: operacao.feito };
}
