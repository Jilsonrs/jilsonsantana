import { randomInt } from "node:crypto";
import Stripe from "stripe";
import type { CodigoDaLista, DuracaoDoCodigo } from "@jilson/core";
import { erroSemMensagem, stripe } from "./stripe-cliente.js";

// OS CÓDIGOS PROMOCIONAIS NA STRIPE (o painel da cobrança, 4.7b, passo 6d — P142): o cupom (o desconto e a duração) e o
// código que o aluno digita, criados juntos; a lista, com quantos usaram; pausar e reativar. `[FATO — context7
// /websites/stripe, 31/10/2026]` o código se cria com `promotion: { type: "coupon", coupon }`; `max_redemptions` e
// `expires_at` são do código; reativar só vale com o cupom ainda válido; o código é único entre os ATIVOS, sem diferenciar
// maiúsculas. A recusa sobe sem a mensagem crua.

/** As letras do código de cortesia: sem 0/O nem 1/I, que se confundem ao ditar. */
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** O código de CORTESIA (100%): difícil de adivinhar — `billing.md` → *Códigos promocionais* (decisão do operador, 21/10/2026). */
export function codigoDeCortesia(): string {
  let sufixo = "";
  for (let i = 0; i < 6; i++) sufixo += LETRAS[randomInt(LETRAS.length)];
  return `PRESENTE-${sufixo}`;
}

const DA_STRIPE: Record<string, CodigoDaLista["duracao"]> = { once: "uma-vez", forever: "para-sempre", repeating: "por-meses" };

/** O cupom do código, quando veio junto (expandido). */
function cupomDo(codigo: Stripe.PromotionCode): Stripe.Coupon | null {
  const cupom = codigo.promotion.coupon;
  return typeof cupom === "object" && cupom !== null ? cupom : null;
}

/** O código da Stripe (com o cupom expandido) no formato da lista do painel. Função pura. */
export function paraCodigoDaLista(codigo: Stripe.PromotionCode, agora: Date = new Date()): CodigoDaLista {
  const cupom = cupomDo(codigo);
  const maximo = codigo.max_redemptions ?? null;
  const vence = codigo.expires_at ? new Date(codigo.expires_at * 1000) : null;
  const situacao = maximo !== null && codigo.times_redeemed >= maximo ? "esgotado" : (vence !== null && vence <= agora) || cupom?.valid === false ? "vencido" : codigo.active ? "ativo" : "pausado";
  return {
    id: codigo.id,
    codigo: codigo.code,
    percentual: cupom?.percent_off ?? null,
    duracao: cupom ? (DA_STRIPE[cupom.duration] ?? null) : null,
    meses: cupom?.duration_in_months ?? null,
    usados: codigo.times_redeemed,
    maximo,
    validoAte: vence?.toISOString() ?? null,
    situacao,
    criadoEm: new Date(codigo.created * 1000).toISOString(),
  };
}

/** Os códigos da conta, do mais novo ao mais antigo — até 200. */
export async function listarCodigos(): Promise<Stripe.PromotionCode[]> {
  try {
    const codigos: Stripe.PromotionCode[] = [];
    for await (const codigo of stripe().promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] })) {
      codigos.push(codigo);
      if (codigos.length >= 200) break;
    }
    return codigos;
  } catch (erro) {
    throw erroSemMensagem(erro, "a lista dos códigos promocionais");
  }
}

/** Já existe um código ATIVO com este texto (a Stripe não deixa dois)? */
export async function codigoAtivoExiste(codigo: string): Promise<boolean> {
  try {
    return (await stripe().promotionCodes.list({ code: codigo, active: true, limit: 1 })).data.length > 0;
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca do código promocional");
  }
}

/** Quanto tempo atrás se procura o código de um pedido repetido. */
const JANELA_DO_PEDIDO_EM_SEGUNDOS = 30 * 60;

/** O código que ESTE pedido já criou (a resposta que se perdeu e o pedido que veio de novo) — entre os criados há pouco. */
export async function codigoDoPedido(pedido: string, agora: Date = new Date()): Promise<Stripe.PromotionCode | null> {
  try {
    const desde = Math.floor(agora.getTime() / 1000) - JANELA_DO_PEDIDO_EM_SEGUNDOS;
    for await (const codigo of stripe().promotionCodes.list({ limit: 100, created: { gte: desde }, expand: ["data.promotion.coupon"] })) {
      if (codigo.metadata?.pedido === pedido) return codigo;
    }
    return null;
  } catch (erro) {
    throw erroSemMensagem(erro, "a busca do código do pedido");
  }
}

/**
 * Cria o cupom e o código dele, numa ida cada — com quem criou e o pedido nos metadados. Devolve o código criado. A chave de
 * repetição leva o pedido E o código: a nova tentativa da biblioteca devolve o mesmo; a cortesia que vem de novo (com outro
 * código sorteado) cria outro cupom, e o que ficou sem código não vale nada (o site só aceita código).
 */
export async function criarCupomECodigo(pedido: { codigo: string; percentual: number; duracao: DuracaoDoCodigo; maxUsos: number | null; expiraEm: Date | null; operador: string; pedido: string }): Promise<Stripe.PromotionCode> {
  try {
    const marca = { criado_por: pedido.operador, pedido: pedido.pedido };
    const cupom = await stripe().coupons.create({ percent_off: pedido.percentual, duration: pedido.duracao === "uma-vez" ? "once" : "forever", name: pedido.codigo, metadata: marca }, { idempotencyKey: `cupom-${pedido.pedido}-${pedido.codigo}` });
    return await stripe().promotionCodes.create(
      {
        promotion: { type: "coupon", coupon: cupom.id },
        code: pedido.codigo,
        ...(pedido.maxUsos !== null ? { max_redemptions: pedido.maxUsos } : {}),
        ...(pedido.expiraEm !== null ? { expires_at: Math.floor(pedido.expiraEm.getTime() / 1000) } : {}),
        metadata: marca,
        expand: ["promotion.coupon"],
      },
      { idempotencyKey: `codigo-${pedido.pedido}-${pedido.codigo}` },
    );
  } catch (erro) {
    throw erroSemMensagem(erro, "a criação do código promocional");
  }
}

/** O código, com o cupom. Nada: a Stripe não o conhece. */
export async function lerCodigo(id: string): Promise<Stripe.PromotionCode | null> {
  try {
    return await stripe().promotionCodes.retrieve(id, { expand: ["promotion.coupon"] });
  } catch (erro) {
    if (erro instanceof Stripe.errors.StripeInvalidRequestError && erro.code === "resource_missing") return null;
    throw erroSemMensagem(erro, "a leitura do código promocional");
  }
}

/** Pausa ou reativa. */
export async function mudarAtivoDoCodigo(id: string, ativo: boolean): Promise<Stripe.PromotionCode> {
  try {
    return await stripe().promotionCodes.update(id, { active: ativo, expand: ["promotion.coupon"] });
  } catch (erro) {
    throw erroSemMensagem(erro, "a mudança do código promocional");
  }
}
