import Stripe from "stripe";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";

// A STRIPE NA LIMPEZA DE QUEM NÃO TERMINOU DE ASSINAR (etapa 4.7, passo 9 — decisões do operador, 29/10/2026): aos 7
// dias, a ficha e o CLIENTE DA STRIPE (com o CPF) são apagados. `[FATO — context7 /websites/stripe e medido na área
// restrita, 30/10/2026]` APAGAR UM CLIENTE CANCELA NA HORA TODA ASSINATURA ATIVA DELE — por isso quem decide se pode
// apagar é a regra (`quem-nao-terminou.ts`), com o que a Stripe diz AGORA de tudo o que o cliente tem; aqui só se lê e
// se executa. E o CPF continua na fatura anulada da tentativa com cartão (a Stripe não deixa apagar fatura fechada) —
// aceito pelo operador em 30/10/2026.
// O que sobe daqui vai para o registro: o erro da Stripe vai sem a mensagem dela (`erroSemMensagem`).

/** Tudo o que o cliente tem na Stripe, agora: o status de cada assinatura e de cada pagamento. `completo`: a lista não foi cortada. */
export type ClienteNaStripe = { assinaturas: string[]; pagamentos: Array<{ id: string; status: string }>; completo: boolean };

/** Até quantos de cada a limpeza lê: um visitante tem poucas tentativas; mais que isto, a lista vem incompleta e nada se apaga. */
const ATE = 100;

function naoExiste(erro: unknown): boolean {
  return erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "resource_missing";
}

/** O cliente, como a Stripe o diz agora — ou "nao-existe" (apagado no painel, ou já apagado por uma limpeza que caiu no meio). */
export async function lerClienteNaStripe(clienteId: string): Promise<ClienteNaStripe | "nao-existe"> {
  try {
    const cliente = await stripe().customers.retrieve(clienteId);
    if ("deleted" in cliente && cliente.deleted) return "nao-existe";
    const [assinaturas, pagamentos] = await Promise.all([
      stripe().subscriptions.list({ customer: clienteId, status: "all", limit: ATE }),
      stripe().paymentIntents.list({ customer: clienteId, limit: ATE }),
    ]);
    return {
      assinaturas: assinaturas.data.map((a) => a.status),
      pagamentos: pagamentos.data.map((p) => ({ id: p.id, status: p.status })),
      completo: !assinaturas.has_more && !pagamentos.has_more,
    };
  } catch (erro) {
    if (naoExiste(erro)) return "nao-existe";
    throw erroSemMensagem(erro, "a leitura do cliente para a limpeza");
  }
}

/** Cancela um pagamento ainda aberto (o QR do Pix vencido, por exemplo): depois de apagado o cliente, nada dele pode ser pago. */
export async function cancelarPagamentoAberto(id: string): Promise<void> {
  try {
    await stripe().paymentIntents.cancel(id);
  } catch (erro) {
    throw erroSemMensagem(erro, "o cancelamento do pagamento aberto");
  }
}

/** Apaga o cliente na Stripe. O que ela já não conhece conta como apagado. */
export async function apagarClienteNaStripe(clienteId: string): Promise<"apagado" | "nao-existe"> {
  try {
    await stripe().customers.del(clienteId);
    return "apagado";
  } catch (erro) {
    if (naoExiste(erro)) return "nao-existe";
    throw erroSemMensagem(erro, "a exclusão do cliente");
  }
}
