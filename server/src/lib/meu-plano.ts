import type { Plano, PlanoMudado, TrocaDePlano, TrocaDesfeita } from "@jilson/core";
import { operarNaAssinatura } from "./assinaturas.js";
import { assinaturaDaConta, outroPlano } from "./minha-assinatura.js";
import { buscarPrecos } from "./stripe.js";
import { buscarDetalhes } from "./stripe-assinatura.js";
import { agendarTroca, anularFatura, calcularTroca, soltarAgendamento, trocarAgora, type DesfechoDaTroca } from "./stripe-plano.js";

// MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b — billing.md → Minha assinatura). As operações da
// tela `…/faturamento/plano`, na mesma disciplina de `minha-assinatura.ts`: o pedido nunca diz
// QUAL assinatura (é a da conta da sessão) nem preço ou valor — só PARA QUAL plano. Decisões do
// operador (11/10/2026):
//   - mensal → anual vale NA HORA, com o valor mostrado antes — e o ano começa no dia da troca;
//   - anual → mensal vale NO FIM do ano já pago — nada muda nem é cobrado até lá —, e dá para
//     desistir;
//   - trocar de plano não recomeça o prazo do reembolso (a data de início da assinatura não muda).
// O VALOR MOSTRADO É O COBRADO, NUM CLIQUE SÓ (decisões do operador, 11/10/2026: "prefiro perder
// 1 centavo a cobrar a mais do que foi mostrado" e, depois de testar, "tem que acontecer num
// passo só […] sem uma segunda confirmação do aluno"). O que sobra do mês diminui com o tempo —
// perto de 1 centavo a cada 4 minutos e meio —, e a Stripe faz a conta sempre no momento do
// pedido. Então a escola ABRE MÃO da diferença: o site devolve o valor que mostrou, e a cobrança
// sai exatamente nesse valor (`trocarAgora`), sem prazo — quem demorou meia hora na tela paga o
// que leu. UMA CONFERÊNCIA, porque o valor vem do navegador: ele tem que estar no máximo
// `FOLGA_DO_VALOR_MOSTRADO` ABAIXO da conta refeita AGORA, com a trava — nunca acima dela. Um
// valor inventado não passa: o máximo que alguém tira da escola mentindo é a folga. Só fora
// dela (a tela aberta por muitas horas, o mês que virou, o preço que mudou) a troca não
// acontece, e a tela mostra o valor novo para a pessoa confirmar.
// Cada operação é a Stripe e depois a sincronia, com a trava da assinatura (`operarNaAssinatura`)
// — e, com a trava, os detalhes são RELIDOS: a decisão vale pelo que a Stripe diz AGORA (duas
// abas: o que já foi desfeito na outra não vira erro, e o que foi criado nela não escapa).

type SemTroca = { resultado: "sem-assinatura" } | { resultado: "desconhecida" } | { resultado: "ocupada" };

/**
 * Quanto a escola abre mão, no máximo, para cobrar o valor mostrado — em centavos. É também o
 * teto do que um valor forjado consegue tirar. R$ 1,00 cobre a tela aberta por umas 7 horas com
 * o mensal de R$ 99,90 (ele anda uns 13 centavos por hora).
 * NÚMERO ESCOLHIDO PELO AGENTE, a confirmar pelo operador (pendência P77): ele pediu a troca
 * num clique só, sem dizer até quanto.
 */
export const FOLGA_DO_VALOR_MOSTRADO = 100;

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
  const conta = await calcularTroca({ assinaturaId: detalhes.id, itemId: detalhes.itemId, precoId: novo.precoId });
  return { resultado: "ok", troca: { para, quando: "agora", preco, hoje: { centavos: conta.centavosHoje, moeda: conta.moeda }, proximaEm: conta.proximaEm ? conta.proximaEm.toISOString() : null } };
}

/**
 * `indisponivel`: esta assinatura não pode ir para esse plano agora (já é dele, não renova, está
 * atrasada, ou já tem troca marcada). `previa-vencida`: o valor mostrado não confere com a conta — a tela pede
 * outra. `recusado`: o cartão não passou; o plano continua o mesmo e nada foi cobrado.
 */
export type Mudanca = ({ resultado: "ok" } & PlanoMudado) | { resultado: "indisponivel" } | { resultado: "previa-vencida" } | { resultado: "recusado" } | SemTroca;

/** Muda o plano da assinatura DESTA conta: para o anual, na hora; para o mensal, no fim do período pago. */
export async function mudarMeuPlano(userId: string, pedido: { plano: Plano; valorMostrado?: number }): Promise<Mudanca> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { id } = achada.detalhes;
  if (outroPlano(achada.detalhes) !== pedido.plano) return { resultado: "indisponivel" };
  const novo = await precoDoPlano(pedido.plano);

  if (pedido.plano === "mensal") {
    const operacao = await operarNaAssinatura(id, async () => {
      const agora = await buscarDetalhes(id);
      if (outroPlano(agora) !== "mensal") return null;
      // O agendamento de uma troca que JÁ aconteceu fica preso por mais um mês: sai antes (com
      // ele a Stripe não deixa criar outro). Só o NOSSO chega aqui: com um que não é da escola,
      // `outroPlano` já disse que não há troca.
      if (agora.agendamentoId) await soltarAgendamento(agora.agendamentoId);
      return agendarTroca(id, novo.precoId);
    });
    if (!operacao) return { resultado: "ocupada" };
    if (!operacao.feito) return { resultado: "indisponivel" };
    console.info(`[stripe] mudar de plano: conta ${userId}, assinatura ${id}, mensal marcado para o fim do período`);
    return { resultado: "ok", estado: "marcado", em: operacao.feito.toISOString() };
  }

  // Sem o valor que a tela mostrou: nada é trocado, e a tela pede a conta. O valor é conferido
  // AQUI também, e não só no formato da rota: este arquivo é a porta que o painel do admin e o
  // JilsonAI vão usar (um `NaN` passaria por toda comparação de folga).
  const { valorMostrado } = pedido;
  if (typeof valorMostrado !== "number" || !Number.isInteger(valorMostrado) || valorMostrado < 0) return { resultado: "previa-vencida" };
  const operacao = await operarNaAssinatura(id, async (): Promise<DesfechoDaTroca | "mudou-o-valor" | null> => {
    const agora = await buscarDetalhes(id);
    if (outroPlano(agora) !== "anual" || !agora.itemId) return null;
    // O agendamento de uma troca que JÁ aconteceu (a virada para o mensal) sai antes: quem manda
    // no preço da assinatura, enquanto ele está preso, é ele.
    if (agora.agendamentoId) await soltarAgendamento(agora.agendamentoId);
    // Uma troca anterior ainda ESPERANDO a confirmação do banco é anulada antes de pedir outra
    // (achado da revisão de segurança): duas cobranças do plano novo nunca ficam em aberto. Se a
    // resposta for "paga", a pessoa confirmou no mesmo instante — o plano já mudou, e nada mais
    // é cobrado.
    if (agora.faturaDaTrocaId && (await anularFatura(agora.faturaDaTrocaId)) === "paga") return { estado: "trocado" };
    const troca = { assinaturaId: id, itemId: agora.itemId, precoId: novo.precoId };
    // A CONTA É REFEITA AGORA, com a trava: o valor mostrado só é cobrado se estiver até a folga
    // ABAIXO dela (a escola abre mão desses centavos). Acima (o mês virou, o preço mudou), ou
    // longe demais (um valor inventado): nada é cobrado — a pessoa vê o valor novo e decide.
    const deAgora = (await calcularTroca(troca)).centavosHoje;
    const abreMao = deAgora - valorMostrado;
    // Escrito pelo que PASSA: qualquer coisa fora de "entre zero e a folga" é recusa.
    if (!(abreMao >= 0 && abreMao <= FOLGA_DO_VALOR_MOSTRADO)) {
      // Fora da folga: a tela ficou aberta por muitas horas, o mês virou, o preço mudou — ou o
      // valor foi inventado. Fica o rastro (aviso, não erro: nada foi cobrado).
      console.warn(`[stripe] mudar de plano: o valor mostrado (${valorMostrado}) não confere com a conta de agora (${deAgora}) — conta ${userId}, assinatura ${id}; nada foi cobrado`);
      return "mudou-o-valor";
    }
    const desfecho = await trocarAgora(troca, valorMostrado);
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
  if (!desfecho) return { resultado: "indisponivel" };
  if (desfecho === "mudou-o-valor") return { resultado: "previa-vencida" };
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
 * A RESPOSTA DIZ EM QUE PLANO A ASSINATURA FICOU, relido (achado da revisão de segurança,
 * 11/10/2026): se a confirmação do banco passou e só a resposta se perdeu, não há mais nada
 * pendente para desfazer — e a tela só pode dizer "nada foi cobrado" se o plano continua o mesmo.
 * Só o agendamento NOSSO é solto, e nenhuma fatura é anulada com a cobrança atrasada (anular a
 * fatura de uma assinatura viva a devolveria a `active`, sem pagar).
 */
export async function desistirDaTroca(userId: string): Promise<Desistencia> {
  const achada = await assinaturaDaConta(userId);
  if (achada.resultado === "desconhecida") return achada;
  if (achada.resultado === "nenhuma") return { resultado: "sem-assinatura" };
  const { id } = achada.detalhes;
  // O agendamento que desistir solta: SÓ o que a escola criou.
  const aSoltar = (d: typeof achada.detalhes) => (d.agendamentoNosso ? d.agendamentoId : null);
  const nadaADesfazer = (d: typeof achada.detalhes) => !aSoltar(d) && !d.faturaDaTrocaId;
  if (nadaADesfazer(achada.detalhes)) return { resultado: "ok", trocado: false, plano: achada.detalhes.plano };
  const operacao = await operarNaAssinatura(id, async () => {
    // Relido com a trava: o que a outra aba já desfez não é desfeito de novo (viraria erro).
    const agora = await buscarDetalhes(id);
    if (nadaADesfazer(agora)) return { trocado: false, plano: agora.plano };
    const agendamento = aSoltar(agora);
    if (agendamento) await soltarAgendamento(agendamento);
    // `paga`: a pessoa completou a confirmação no mesmo instante — o plano mudou.
    const trocado = agora.faturaDaTrocaId && agora.status !== "past_due" ? (await anularFatura(agora.faturaDaTrocaId)) === "paga" : false;
    return { trocado, plano: (await buscarDetalhes(id)).plano };
  });
  if (!operacao) return { resultado: "ocupada" };
  console.info(`[stripe] desistir da troca de plano: conta ${userId}, assinatura ${id}${operacao.feito.trocado ? " — o pagamento já tinha passado: o plano mudou" : ""}`);
  return { resultado: "ok", ...operacao.feito };
}
