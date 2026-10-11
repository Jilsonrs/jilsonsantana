import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { escolherCartaoConfirmado, paraCartao, paraDetalhesDaAssinatura, paraMotivoNaStripe, paraPedidoDeCartao, paraPedidoDeManter, paraPedidoDeParar, paraTrocaMarcada } from "./stripe-assinatura.js";
import { planoDoPreco } from "./stripe.js";

// A ASSINATURA DA STRIPE NO FORMATO DA TELA (Fase 4, etapa 4.6) — funções puras, teste unitário
// (CLAUDE.md → Testing: só função pura, sem I/O). O que protege: a tela de Faturamento e
// Assinatura nunca mostra o plano errado, a data errada de fim nem o cartão que não é o cobrado —
// e do cartão só saem a bandeira, os 4 últimos e a validade.

const DIA = 24 * 60 * 60;
const inicio = 1_800_000_000;
const fim = inicio + 30 * DIA;

function preco({ intervalo = "month", cada = 1, centavos = 9990 as number | null, chave = "assinatura_mensal" as string | null } = {}): Stripe.Price {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id: "price_1", lookup_key: chave, unit_amount: centavos, currency: "brl", recurring: { interval: intervalo, interval_count: cada } } as unknown as Stripe.Price;
}

const VISA = { id: "pm_visa", card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2028 } };
const MASTER = { id: "pm_master", card: { brand: "mastercard", last4: "4444", exp_month: 1, exp_year: 2030 } };

function assinatura({
  status = "active",
  doPreco = preco(),
  acabaNoFim = false,
  acabaEm = null as number | null,
  cartao = VISA as object | string | null,
  cliente = { id: "cus_1", metadata: {}, invoice_settings: { default_payment_method: null as object | string | null } } as object | string,
  pausa = null as { behavior: string } | null,
  itens = undefined as object[] | undefined,
  fatura = { id: "in_1", status: "paid" } as object | string | null,
} = {}): Stripe.Subscription {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return {
    id: "sub_1",
    status,
    latest_invoice: fatura,
    items: { data: itens ?? [{ current_period_start: inicio, current_period_end: fim, price: doPreco }] },
    metadata: {},
    customer: cliente,
    pause_collection: pausa,
    livemode: false,
    cancel_at_period_end: acabaNoFim,
    cancel_at: acabaEm,
    default_payment_method: cartao,
    start_date: inicio - 3 * DIA,
  } as unknown as Stripe.Subscription;
}

describe("de que plano é o preço", () => {
  it("pelo intervalo da cobrança: por mês é o mensal, por ano é o anual", () => {
    expect(planoDoPreco(preco())).toBe("mensal");
    expect(planoDoPreco(preco({ intervalo: "year" }))).toBe("anual");
  });

  it("o preço ANTIGO, que perdeu a lookup key quando o valor mudou, continua sendo do plano dele", () => {
    expect(planoDoPreco(preco({ chave: null }))).toBe("mensal");
    // E a chave nunca decide: a do mensal num preço que renova por ano é o anual.
    expect(planoDoPreco(preco({ intervalo: "year", chave: "assinatura_mensal" }))).toBe("anual");
  });

  it("preço que renova a cada 3 meses, por semana, ou que nem renova: nenhum plano", () => {
    expect(planoDoPreco(preco({ cada: 3 }))).toBeNull();
    expect(planoDoPreco(preco({ intervalo: "week" }))).toBeNull();
    // Seguro: preço avulso, sem `recurring` — só o campo que a função lê.
    expect(planoDoPreco({ id: "price_avulso", recurring: null } as unknown as Stripe.Price)).toBeNull();
  });
});

describe("a assinatura da Stripe no formato da tela", () => {
  it("o plano, o preço cheio e o fim do período", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ doPreco: preco({ intervalo: "year", centavos: 99500 }) }));
    expect(detalhes.plano).toBe("anual");
    expect(detalhes.preco).toEqual({ centavos: 99500, moeda: "brl" });
    expect(detalhes.fimDoPeriodo?.getTime()).toBe(fim * 1000);
  });

  it("preço que não é de nenhum dos dois planos: sem plano e sem preço, em vez de um rótulo errado", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ doPreco: preco({ cada: 6 }) }));
    expect([detalhes.plano, detalhes.preco]).toEqual([null, null]);
  });

  it("sem item: sem plano, sem preço e sem data — não quebra", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ itens: [] }));
    expect([detalhes.plano, detalhes.preco, detalhes.fimDoPeriodo, detalhes.pagoAte]).toEqual([null, null, null, null]);
  });

  it("renovando: não acaba", () => {
    expect(paraDetalhesDaAssinatura(assinatura()).acabaEm).toBeNull();
  });

  it("marcada para acabar no fim do período: acaba no fim do período", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ acabaNoFim: true })).acabaEm?.getTime()).toBe(fim * 1000);
  });

  it("marcada para acabar numa data: vale a data que a Stripe diz", () => {
    const data = inicio + 10 * DIA;
    expect(paraDetalhesDaAssinatura(assinatura({ acabaEm: data })).acabaEm?.getTime()).toBe(data * 1000);
    expect(paraDetalhesDaAssinatura(assinatura({ acabaNoFim: true, acabaEm: data })).acabaEm?.getTime()).toBe(data * 1000);
  });

  it("o status e o 'pago até' são os do ESPELHO: a cobrança pausada é `paused`", () => {
    const detalhes = paraDetalhesDaAssinatura(assinatura({ pausa: { behavior: "void" } }));
    expect(detalhes.status).toBe("paused");
    expect(detalhes.pagoAte?.getTime()).toBe(fim * 1000);
  });
});

describe("o cartão que a tela mostra", () => {
  it("o da assinatura: a bandeira, os 4 últimos e a validade — e mais nada", () => {
    expect(paraDetalhesDaAssinatura(assinatura()).cartao).toEqual({ bandeira: "visa", final: "4242", mes: 12, ano: 2028 });
  });

  it("assinatura sem cartão próprio: o padrão do cliente (é o que a Stripe cobra)", () => {
    const cliente = { id: "cus_1", metadata: {}, invoice_settings: { default_payment_method: MASTER } };
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null, cliente })).cartao).toEqual({ bandeira: "mastercard", final: "4444", mes: 1, ano: 2030 });
  });

  it("os dois: vale o da assinatura", () => {
    const cliente = { id: "cus_1", metadata: {}, invoice_settings: { default_payment_method: MASTER } };
    expect(paraDetalhesDaAssinatura(assinatura({ cliente })).cartao?.final).toBe("4242");
  });

  it("nenhum, cliente apagado ou só o id do cliente: sem cartão", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null })).cartao).toBeNull();
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null, cliente: { id: "cus_1", deleted: true } })).cartao).toBeNull();
    expect(paraDetalhesDaAssinatura(assinatura({ cartao: null, cliente: "cus_1" })).cartao).toBeNull();
  });

  it("forma de pagamento que veio só com o id, ou que não é cartão: sem cartão", () => {
    expect(paraCartao("pm_sem_expandir")).toBeNull();
    // Seguro: uma forma de pagamento que não é cartão — só os campos que a função lê.
    expect(paraCartao({ id: "pm_pix", type: "pix" } as unknown as Stripe.PaymentMethod)).toBeNull();
    expect(paraCartao(null)).toBeNull();
  });
});

// TROCAR O CARTÃO (passo 4). O que protege: o cartão novo só vai para a assinatura de quem o
// confirmou. Quem escolhe é o servidor, lendo os pedidos de guardar cartão na Stripe.
describe("o que o servidor guarda da assinatura para trocar o cartão", () => {
  it("o cliente que a assinatura cobra — é dele o cartão novo, e são dele os antigos que saem", () => {
    expect(paraDetalhesDaAssinatura(assinatura()).clienteId).toBe("cus_1");
    expect(paraDetalhesDaAssinatura(assinatura({ cliente: "cus_so_o_id" })).clienteId).toBe("cus_so_o_id");
  });

  it("a fatura em aberto: só a que está aberta — paga, anulada, sem expandir ou ausente, nenhuma", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ status: "past_due", fatura: { id: "in_aberta", status: "open" } })).faturaEmAbertoId).toBe("in_aberta");
    for (const fatura of [{ id: "in_paga", status: "paid" }, { id: "in_anulada", status: "void" }, { id: "in_rascunho", status: "draft" }, "in_so_o_id", null]) {
      expect(paraDetalhesDaAssinatura(assinatura({ fatura })).faturaEmAbertoId).toBeNull();
    }
  });
});

describe("o pedido de guardar cartão que vai à Stripe", () => {
  const PEDIDO = { clienteId: "cus_1", userId: "u-1", assinaturaId: "sub_1" };

  it("é do cliente da assinatura, só aceita as formas de pagamento da escola e serve para cobrar depois", () => {
    const pedido = paraPedidoDeCartao(PEDIDO);
    expect(pedido.customer).toBe("cus_1");
    expect(pedido.allowed_payment_method_types).toEqual(["card"]);
    expect(pedido.usage).toBe("off_session");
  });

  it("leva de quem é e para qual assinatura — é o que o servidor confere depois", () => {
    expect(paraPedidoDeCartao(PEDIDO).metadata).toEqual({ para: "trocar-cartao", userId: "u-1", assinatura: "sub_1" });
  });
});

describe("qual cartão confirmado vale para este pedido", () => {
  const PEDIDO = { clienteId: "cus_1", userId: "u-1", assinaturaId: "sub_1" };
  const NOSSO = { para: "trocar-cartao", userId: "u-1", assinatura: "sub_1" };
  const AGORA = 1_800_000_000_000;
  const MINUTO = 60;
  function guardado({ id = "seti_1", status = "succeeded", cliente = "cus_1" as string | { id: string } | null, metadata = NOSSO as Record<string, string> | null, forma = "pm_novo" as string | { id: string } | null, haMinutos = 1 } = {}): Stripe.SetupIntent {
    // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
    return { id, status, customer: cliente, metadata, payment_method: forma, created: AGORA / 1000 - haMinutos * MINUTO } as unknown as Stripe.SetupIntent;
  }
  const escolher = (pedidos: Stripe.SetupIntent[]) => escolherCartaoConfirmado(pedidos, PEDIDO, AGORA);

  it("só vale o pedido aberto HÁ POUCO: o de semanas atrás não repõe um cartão antigo por cima do atual", () => {
    expect(escolher([guardado({ haMinutos: 59 })])).toBe("pm_novo");
    expect(escolher([guardado({ haMinutos: 61 })])).toBeNull();
    expect(escolher([guardado({ haMinutos: 60 * 24 * 30 })])).toBeNull();
    // Um novo que não deu certo NÃO faz valer o antigo, vencido, que deu.
    expect(escolher([guardado({ status: "requires_payment_method", forma: null }), guardado({ haMinutos: 600, forma: "pm_de_ontem" })])).toBeNull();
  });

  it("o pedido que deu certo, deste cliente, desta conta e desta assinatura: o cartão dele", () => {
    expect(escolher([guardado()])).toBe("pm_novo");
    expect(escolher([guardado({ cliente: { id: "cus_1" }, forma: { id: "pm_expandido" } })])).toBe("pm_expandido");
  });

  it("vários: vale o mais novo que serve (a Stripe lista o mais novo primeiro)", () => {
    const lista = [guardado({ status: "requires_payment_method", forma: null }), guardado({ forma: "pm_mais_novo" }), guardado({ forma: "pm_mais_velho" })];
    expect(escolher(lista)).toBe("pm_mais_novo");
  });

  it("pedido que NÃO deu certo nunca vale: pela metade, pedindo confirmação, processando ou cancelado", () => {
    for (const status of ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "canceled"]) {
      expect(escolher([guardado({ status })]), status).toBeNull();
    }
  });

  it("de outro cliente, de outra conta, de outra assinatura ou de outro fluxo: nunca vale", () => {
    expect(escolher([guardado({ cliente: "cus_alheio" })])).toBeNull();
    expect(escolher([guardado({ cliente: null })])).toBeNull();
    expect(escolher([guardado({ metadata: { ...NOSSO, userId: "u-outro" } })])).toBeNull();
    expect(escolher([guardado({ metadata: { ...NOSSO, assinatura: "sub_outra" } })])).toBeNull();
    // O pedido de cartão do CHECKOUT (o da assinatura que nasce sem nada a pagar) não tem a nossa marca.
    expect(escolher([guardado({ metadata: {} })])).toBeNull();
    expect(escolher([guardado({ metadata: null })])).toBeNull();
  });

  it("deu certo mas veio sem cartão, ou a lista veio vazia: nenhum", () => {
    expect(escolher([guardado({ forma: null })])).toBeNull();
    expect(escolher([])).toBeNull();
  });
});

// PARAR A RENOVAÇÃO E VOLTAR ATRÁS (passo 7). O que protege: parar NUNCA encerra na hora (tiraria
// o acesso de quem já pagou o período); o motivo que fica na Stripe é o que a pessoa disse; e
// voltar atrás desfaz a marca que existe, sem deixar motivo de cancelamento em quem ficou.
describe("como a assinatura foi marcada para acabar", () => {
  it("no fim do período (a tela de cancelar) ou numa data avulsa (o painel da Stripe): diz como se desfaz", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ acabaNoFim: true, acabaEm: fim })).acabaNoFimDoPeriodo).toBe(true);
    expect(paraDetalhesDaAssinatura(assinatura({ acabaEm: fim + DIA })).acabaNoFimDoPeriodo).toBe(false);
    expect(paraDetalhesDaAssinatura(assinatura()).acabaNoFimDoPeriodo).toBe(false);
  });
});

describe("o pedido de parar a renovação", () => {
  it("marca para acabar no FIM DO PERÍODO — sem motivo, vai só a marca", () => {
    expect(paraPedidoDeParar({})).toEqual({ cancel_at_period_end: true });
    // Comentário só de espaços é o mesmo que nenhum.
    expect(paraPedidoDeParar({ comentario: "   " })).toEqual({ cancel_at_period_end: true });
  });

  it("cada motivo da escola vai com o par dele na lista da Stripe, e o motivo EXATO fica junto da assinatura", () => {
    const pares = (["caro", "sem-tempo", "ja-aprendi", "sem-conteudo", "outro"] as const).map((motivo) => {
      const pedido = paraPedidoDeParar({ motivo });
      return [pedido.cancellation_details?.feedback, pedido.metadata];
    });
    expect(pares).toEqual([
      ["too_expensive", { motivo: "caro" }],
      ["unused", { motivo: "sem-tempo" }],
      ["other", { motivo: "ja-aprendi" }],
      ["missing_features", { motivo: "sem-conteudo" }],
      ["other", { motivo: "outro" }],
    ]);
  });

  it("o comentário vai aparado; só o comentário, sem motivo, também vale — e não inventa motivo", () => {
    expect(paraMotivoNaStripe({ comentario: "  volto em janeiro  " })).toEqual({ cancellation_details: { comment: "volto em janeiro" } });
    expect(paraMotivoNaStripe({ motivo: "caro", comentario: "volto em janeiro" })).toEqual({ cancellation_details: { feedback: "too_expensive", comment: "volto em janeiro" }, metadata: { motivo: "caro" } });
    expect(paraMotivoNaStripe({})).toEqual({});
  });
});

describe("o pedido de voltar atrás", () => {
  it("desfaz a marca que existe — a do fim do período OU a data avulsa, nunca as duas — e apaga o motivo", () => {
    const apagado = { cancellation_details: { feedback: "", comment: "" }, metadata: { motivo: "" } };
    expect(paraPedidoDeManter(true)).toEqual({ cancel_at_period_end: false, ...apagado });
    expect(paraPedidoDeManter(false)).toEqual({ cancel_at: "", ...apagado });
  });
});

// O REEMBOLSO (passo 8). O que protege: o prazo conta do primeiro dia da assinatura, e a fatura
// devolvida por inteiro deixa de contar como paga na TELA do mesmo jeito que no espelho.
describe("o que a tela precisa saber para o reembolso", () => {
  it("o primeiro dia da assinatura: é dele que o prazo conta", () => {
    expect(paraDetalhesDaAssinatura(assinatura()).comecouEm?.getTime()).toBe((inicio - 3 * DIA) * 1000);
  });

  it("última fatura devolvida por inteiro: 'pago até' é o começo do período — a mesma conta do espelho", () => {
    expect(paraDetalhesDaAssinatura(assinatura({ status: "canceled" }), true).pagoAte?.getTime()).toBe(inicio * 1000);
    expect(paraDetalhesDaAssinatura(assinatura({ status: "canceled" })).pagoAte?.getTime()).toBe(fim * 1000);
  });
});

// MUDAR DE PLANO (passo 10). O que protege: a tela só diz "seu plano muda em tal data" quando a
// Stripe tem MESMO uma troca marcada, para o plano certo; e o servidor sabe em que item o preço
// troca e qual fatura anular quando a troca na hora não se completa.
describe("a troca de plano marcada para o fim do período", () => {
  const fase = (inicio: number, termino: number, intervalo: string | null) => ({ start_date: inicio, end_date: termino, items: [{ price: intervalo ? preco({ intervalo }) : "price_so_o_id" }] });
  // Seguro: só os campos que a função lê; a forma completa é da Stripe.
  const agendamento = (fases: object[], fimDaAtual: number | null = fim) => ({ id: "sub_sched_1", current_phase: fimDaAtual ? { start_date: inicio, end_date: fimDaAtual } : null, phases: fases }) as unknown as Stripe.SubscriptionSchedule;

  it("a fase que começa quando a atual termina, de OUTRO plano: para qual plano e quando", () => {
    expect(paraTrocaMarcada(agendamento([fase(inicio, fim, "year"), fase(fim, fim + 30 * DIA, "month")]), "anual")).toEqual({ plano: "mensal", em: new Date(fim * 1000) });
  });

  it("sem fase seguinte, com a fase seguinte do MESMO plano, ou com o preço que veio só com o id: nenhuma troca", () => {
    expect(paraTrocaMarcada(agendamento([fase(inicio, fim, "year")]), "anual")).toBeNull();
    expect(paraTrocaMarcada(agendamento([fase(inicio, fim, "year"), fase(fim, fim + 365 * DIA, "year")]), "anual")).toBeNull();
    expect(paraTrocaMarcada(agendamento([fase(inicio, fim, "year"), fase(fim, fim + 30 * DIA, null)]), "anual")).toBeNull();
  });

  it("sem agendamento, com ele só pelo id, ou já sem fase atual: nenhuma troca", () => {
    expect(paraTrocaMarcada(null, "anual")).toBeNull();
    expect(paraTrocaMarcada("sub_sched_so_o_id", "anual")).toBeNull();
    expect(paraTrocaMarcada(agendamento([fase(inicio, fim, "year"), fase(fim, fim + 30 * DIA, "month")], null), "anual")).toBeNull();
  });

  it("os detalhes levam o item, o agendamento e a troca marcada — e a assinatura comum, nada disso", () => {
    // Seguro: acrescenta ao objeto de teste os campos que só este bloco lê.
    const comAgendamento = { ...assinatura({ doPreco: preco({ intervalo: "year" }), itens: [{ id: "si_1", current_period_start: inicio, current_period_end: fim, price: preco({ intervalo: "year" }) }] }), schedule: agendamento([fase(inicio, fim, "year"), fase(fim, fim + 30 * DIA, "month")]) } as unknown as Stripe.Subscription;
    const detalhes = paraDetalhesDaAssinatura(comAgendamento);
    expect([detalhes.itemId, detalhes.agendamentoId, detalhes.trocaMarcada]).toEqual(["si_1", "sub_sched_1", { plano: "mensal", em: new Date(fim * 1000) }]);
    const comum = paraDetalhesDaAssinatura(assinatura());
    expect([comum.agendamentoId, comum.trocaMarcada, comum.faturaDaTrocaId]).toEqual([null, null, null]);
  });

  it("a fatura da troca que não se completou: só com a troca PENDENTE e a fatura em aberto", () => {
    const pendente = (fatura: object, comPendencia: boolean) => ({ ...assinatura({ fatura }), pending_update: comPendencia ? { expires_at: fim } : null }) as unknown as Stripe.Subscription;
    expect(paraDetalhesDaAssinatura(pendente({ id: "in_troca", status: "open" }, true)).faturaDaTrocaId).toBe("in_troca");
    expect(paraDetalhesDaAssinatura(pendente({ id: "in_troca", status: "open" }, false)).faturaDaTrocaId).toBeNull();
    expect(paraDetalhesDaAssinatura(pendente({ id: "in_paga", status: "paid" }, true)).faturaDaTrocaId).toBeNull();
  });
});
