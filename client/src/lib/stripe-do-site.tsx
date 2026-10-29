import type { ReactNode } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { ConfirmPaymentData, Stripe, StripeConstructorOptions, StripeElementLocale, StripeElementsOptionsMode, StripeError, StripePaymentElementOptions } from "@stripe/stripe-js";

// A NOSSA FRONTEIRA COM O STRIPE.JS (Fase 4, etapa 4.2). Só este arquivo importa `@stripe/*` no
// site; as telas usam o que sai daqui, e os testes simulam ESTE módulo (nunca o da Stripe).
// O dado do cartão nunca passa por nós: o campo é da Stripe, dentro de uma moldura dela.
//
// O campo abre ANTES de a assinatura existir (context7 /websites/stripe, 10/10/2026: Elements
// em modo `subscription`, com o valor e a moeda): quem só olha a tela não deixa assinatura pela
// metade na Stripe. No envio: confere o que foi preenchido → o servidor cria a assinatura → a
// confirmação usa o segredo que ele devolveu.
//
// `/pure`: o script da Stripe só é baixado quando a tela de assinar abre, não em toda página.

/** O idioma do campo do cartão e das janelas da Stripe: a escola é só em português (12/10/2026). */
const IDIOMA_DO_CAMPO: StripeElementLocale = "pt-BR";

/**
 * Como o Stripe.js é carregado. O IDIOMA vai aqui também, não só no campo: a janela do QR do Pix
 * aberta pelo "Mostrar o QR de novo" (`handleNextAction`) não passa pelo campo, e sem isto ela sai
 * no idioma do NAVEGADOR `[FATO — medido em 29/10/2026, passo 6 da etapa 4.9: num Chrome em inglês,
 * "Simulate scan", "Copy the code"]`. Sem a ajuda de teste da Stripe (o botão "stripe" no canto da
 * tela): ela aparece sozinha com as chaves de teste, e a produção fica com chaves de teste até o
 * lançamento (decisão do operador, 10/10/2026: "não precisamos desse botão").
 */
export const OPCOES_DO_STRIPE: StripeConstructorOptions = { locale: IDIOMA_DO_CAMPO, developerTools: { assistant: { enabled: false } } };

const carregadas = new Map<string, Promise<Stripe | null>>();
/** Uma Stripe por chave publicável (carregar de novo a cada desenho recriaria o campo). */
function stripeDoSite(chavePublicavel: string): Promise<Stripe | null> {
  let stripe = carregadas.get(chavePublicavel);
  if (!stripe) {
    stripe = loadStripe(chavePublicavel, OPCOES_DO_STRIPE);
    carregadas.set(chavePublicavel, stripe);
  }
  return stripe;
}
/** A cor da marca (`docs/design.md`); o campo mora numa moldura da Stripe e não herda o CSS do site. */
const APARENCIA: StripeElementsOptionsMode["appearance"] = { theme: "stripe", variables: { colorPrimary: "#238FE8", borderRadius: "8px" } };

export type PedidoDeCartao = {
  chavePublicavel: string;
  /** Quanto se paga HOJE, em centavos. Zero: nada hoje, o cartão só fica guardado para depois. */
  centavos: number;
  moeda: string;
  /** A lista do servidor — a mesma com que ele cria a assinatura. */
  formasDePagamento: string[];
  /** O PIX PRÉ-PAGO (etapa 4.9): a configuração só-Pix do servidor. Com ela, o campo abre em modo pagamento, só com o Pix. */
  pix?: { configuracao: string } | null;
};

/**
 * AS OPÇÕES COM QUE O CAMPO ABRE. Função pura, com teste — as linhas que nenhum teste de tela vê
 * (as telas simulam este módulo) e que o Stripe.js recusa EM SILÊNCIO, sem erro na tela nem no console:
 * - `allowedPaymentMethodTypes`: o campo só mostra as formas da lista do servidor.
 *   `[FATO — medido no navegador, 10/10/2026]` o Stripe.js no ar RECUSA a opção antiga
 *   (`paymentMethodTypes`: "is no longer supported in this version of Stripe.js") e o campo
 *   simplesmente não aparece. E os tipos não acusaram porque as opções eram montadas com
 *   `...espalhar`, que o TypeScript não confere — por isso aqui é tudo escrito por extenso, com o
 *   tipo: nome de opção errado volta a quebrar a compilação.
 * - O PIX PRÉ-PAGO (etapa 4.9, passo 2b): um PAGAMENTO SOLTO (`mode: "payment"`), só com o Pix da
 *   configuração do servidor (context7 /websites/stripe, 28/10/2026: `paymentMethodConfiguration` nas
 *   opções do Elements com intenção adiada; é a mesma configuração do pagamento que o servidor cria).
 *   É a configuração, SOZINHA, que garante "nunca cartão aqui": `[FATO — medido no navegador,
 *   29/10/2026, passo 6]` o Stripe.js RECUSA `paymentMethodConfiguration` junto com
 *   `allowedPaymentMethodTypes` ("You may only specify one of these parameters: allowedPaymentMethodTypes,
 *   paymentMethodTypes or paymentMethodConfiguration"), o `react-stripe-js` engole o erro, e o campo
 *   não aparece. O teste trava a forma; a prova de que abre é no navegador.
 */
export function opcoesDoCampo(pedido: PedidoDeCartao): StripeElementsOptionsMode {
  if (pedido.pix) return { mode: "payment", amount: pedido.centavos, currency: pedido.moeda, paymentMethodConfiguration: pedido.pix.configuracao, locale: IDIOMA_DO_CAMPO, appearance: APARENCIA };
  if (pedido.centavos > 0) return { mode: "subscription", amount: pedido.centavos, currency: pedido.moeda, allowedPaymentMethodTypes: pedido.formasDePagamento, locale: IDIOMA_DO_CAMPO, appearance: APARENCIA };
  return { mode: "setup", currency: pedido.moeda, allowedPaymentMethodTypes: pedido.formasDePagamento, locale: IDIOMA_DO_CAMPO, appearance: APARENCIA };
}

/** Dá o campo do cartão e o `useCartao()` a quem estiver dentro. */
export function CartaoProvider({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) {
  const opcoes = opcoesDoCampo(pedido);
  // A `key`: trocar entre "cobra hoje", "só guarda o cartão" e o Pix monta um campo novo.
  return (
    <Elements key={opcoes.mode} stripe={stripeDoSite(pedido.chavePublicavel)} options={opcoes}>
      {children}
    </Elements>
  );
}

/**
 * AS OPÇÕES DO CAMPO EM SI (não do Elements). No PIX, o quadro da Stripe pede um e-mail próprio — e o
 * aluno já o digitou no nosso formulário, ou está logado: o campo fica ESCONDIDO (decisão do operador,
 * P113, 29/10/2026) e o e-mail que o servidor devolveu vai na confirmação (`confirmar`). `[FATO — docs da
 * Stripe, context7, 29/10/2026]` com `fields.billingDetails.email: "never"` a Stripe EXIGE o e-mail em
 * `payment_method_data.billing_details` ao confirmar, senão recusa o pagamento. Função pura, com teste.
 */
export function opcoesDoElemento(pix: boolean): StripePaymentElementOptions {
  return pix ? { fields: { billingDetails: { email: "never" } } } : {};
}

/** O campo de pagamento da Stripe. `pix`: o quadro do Pix, sem o campo de e-mail (`opcoesDoElemento`). */
export function CampoDoCartao({ pix = false }: { pix?: boolean }) {
  return <PaymentElement options={opcoesDoElemento(pix)} />;
}

/** Deu certo, ou não — com a frase da Stripe quando ela é para o aluno ler (cartão recusado, dado faltando). */
export type Desfecho = { ok: true } | { ok: false; mensagem: string | null };

export type Cartao = {
  /** Confere o que o aluno preencheu, antes de criar qualquer coisa no servidor. */
  validar: () => Promise<Desfecho>;
  /**
   * Confirma com o segredo que o servidor devolveu: `pagamento` cobra hoje; `cartao` só guarda o cartão;
   * `pix` abre o QR — e leva `pagador`, o e-mail que o servidor devolveu, porque o quadro do Pix não o pede.
   */
  confirmar: (segredo: string, tipo: "pagamento" | "cartao" | "pix", voltarPara: string, pagador?: { email: string }) => Promise<Desfecho>;
};

/** Só os erros de cartão e de preenchimento trazem frase para o aluno; o resto vira a frase da escola. */
function falhou(erro: StripeError): Desfecho {
  const paraOAluno = erro.type === "card_error" || erro.type === "validation_error";
  return { ok: false, mensagem: paraOAluno ? (erro.message ?? null) : null };
}

/** O cartão que o aluno está preenchendo. Só dentro de `CartaoProvider`. */
export function useCartao(): Cartao {
  const stripe = useStripe();
  const elements = useElements();
  return {
    async validar() {
      if (!stripe || !elements) return { ok: false, mensagem: null };
      const { error } = await elements.submit();
      return error ? falhou(error) : { ok: true };
    },
    async confirmar(segredo, tipo, voltarPara, pagador) {
      if (!stripe || !elements) return { ok: false, mensagem: null };
      // `if_required`: o cartão confirma sem sair da tela (a conferência do banco abre por cima);
      // só forma de pagamento que precise sair volta pelo endereço abaixo.
      const return_url = new URL(voltarPara, window.location.origin).toString();
      // O e-mail de quem paga, no Pix (o campo escondido — `opcoesDoElemento`): escrito por extenso, com o tipo.
      const confirmParams: ConfirmPaymentData = pagador ? { return_url, payment_method_data: { billing_details: { email: pagador.email } } } : { return_url };
      const pedido = { elements, clientSecret: segredo, confirmParams, redirect: "if_required" as const };
      // O Pix pré-pago (etapa 4.9) confirma como pagamento: a própria Stripe.js mostra o QR e espera o Pix cair.
      const { error } = tipo === "cartao" ? await stripe.confirmSetup(pedido) : await stripe.confirmPayment(pedido);
      return error ? falhou(error) : { ok: true };
    },
  };
}

/** O que deu a confirmação do banco: passou, ou a pessoa não concluiu (fechou a janela, o banco recusou). */
export type ConfirmacaoDoBanco = "confirmado" | "nao-concluido";

/**
 * COMPLETA A CONFIRMAÇÃO DO BANCO de uma cobrança que o SERVIDOR já tentou (etapa 4.6, sessão b:
 * a troca para o plano anual, e a cobrança atrasada paga com o cartão novo). Não há campo de
 * cartão aqui: a janela do banco abre por cima da tela, com o segredo que o servidor devolveu.
 * `[FATO — medido na área restrita, 11/10/2026]` o pagamento fica à espera de uma ação que só o
 * Stripe.js conduz (`requires_action`); passou, a Stripe aplica o que estava pendente sozinha.
 */
export async function confirmarNoBanco(chavePublicavel: string, segredo: string): Promise<ConfirmacaoDoBanco> {
  const stripe = await stripeDoSite(chavePublicavel);
  if (!stripe) return "nao-concluido";
  const { paymentIntent, error } = await stripe.handleNextAction({ clientSecret: segredo });
  if (error || !paymentIntent) return "nao-concluido";
  // SÓ o pagamento que PASSOU é "confirmado" (achado da revisão de segurança, 11/10/2026): em
  // qualquer outro estado quem diz o que aconteceu é o servidor, relendo a assinatura.
  return paymentIntent.status === "succeeded" ? "confirmado" : "nao-concluido";
}

/** O que fazer com o QR, pelo status do pagamento agora: reabrir o mesmo, gerar outro no mesmo pagamento, nada (já pago), ou não há como. */
export type ComoMostrarOQr = "reabrir" | "gerar-novo" | "pago" | "sem-jeito";

/**
 * Pelo status do pagamento Pix lido agora. `[FATO — medido na área restrita, 29/10/2026, passo 6]` o QR
 * vencido volta o pagamento a `requires_payment_method` (o `handleNextAction` então LANÇA: "not in the
 * requires_action state"), e confirmá-lo de novo dá um QR novo no MESMO pagamento. `requires_confirmation`
 * (criado e nunca confirmado — a aba fechou antes) também se confirma. Cancelado não tem volta: é o
 * clique em "Pagar com Pix" na tela de assinar.
 * O QR NOVO SÓ SAI SE O VALOR DO PAGAMENTO AINDA FOR O PREÇO DE UM PLANO (achado 8 da segunda revisão do
 * passo 6, 29/10/2026): o pagamento guarda o valor de quando nasceu, e pago depois de o preço mudar ele fica
 * EM CONFERÊNCIA no servidor. Então não há como, e a frase manda clicar em "Pagar com Pix" de novo — que
 * cria o Pix no preço de agora. Os preços só são lidos neste caso (`precosDeAgora`). Sem Stripe.js: com teste.
 */
export async function comoMostrarOQr(status: string, centavos: number, precosDeAgora: () => Promise<number[]>): Promise<ComoMostrarOQr> {
  if (status === "requires_action") return "reabrir";
  if (status === "requires_payment_method" || status === "requires_confirmation") return (await precosDeAgora()).includes(centavos) ? "gerar-novo" : "sem-jeito";
  if (status === "succeeded") return "pago";
  return "sem-jeito";
}

/** O que o "Mostrar o QR de novo" conseguiu: a janela abriu, o Pix já estava pago (a tela de concluído confirma sozinha), ou não deu. */
export type QrMostrado = "aberto" | "pago" | "falhou";

/**
 * MOSTRA O QR DO PIX DE NOVO (etapa 4.9, passo 2b; P115, decisão do operador, 29/10/2026: "o mesmo botão
 * gera o QR novo quando venceu"), para quem fechou a janela do QR sem pagar: a tela de concluído chama com
 * o segredo e o e-mail guardados na aba (`lib/pix-pendente.ts`). Lê o pagamento AGORA e, pelo status
 * (`comoMostrarOQr`): reabre o mesmo QR (`handleNextAction`), ou — vencido — confirma o MESMO pagamento de
 * novo com o Pix e o e-mail de quem paga (`confirmPixPayment`, que cria a forma de pagamento e abre a
 * janela do QR novo) — se o valor dele ainda for o preço de um plano (`precosDeAgora`, lido pela tela). O que
 * volta NÃO decide nada: quem diz que a assinatura valeu é o servidor, que a tela de concluído continua
 * perguntando.
 */
export async function mostrarQrDeNovo(chavePublicavel: string, segredo: string, email: string | undefined, precosDeAgora: () => Promise<number[]>): Promise<QrMostrado> {
  const stripe = await stripeDoSite(chavePublicavel);
  if (!stripe) return "falhou";
  const { paymentIntent, error } = await stripe.retrievePaymentIntent(segredo);
  if (error || !paymentIntent) return "falhou";
  const como = await comoMostrarOQr(paymentIntent.status, paymentIntent.amount, precosDeAgora);
  if (como === "pago") return "pago";
  if (como === "sem-jeito") return "falhou";
  if (como === "reabrir") return (await stripe.handleNextAction({ clientSecret: segredo })).error ? "falhou" : "aberto";
  const novo = await stripe.confirmPixPayment(segredo, { payment_method: email ? { billing_details: { email } } : {} });
  return novo.error ? "falhou" : "aberto";
}
