import type { ReactNode } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe, StripeElementLocale, StripeElementsOptionsMode, StripeError } from "@stripe/stripe-js";

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

const carregadas = new Map<string, Promise<Stripe | null>>();
/** Uma Stripe por chave publicável (carregar de novo a cada desenho recriaria o campo). */
function stripeDoSite(chavePublicavel: string): Promise<Stripe | null> {
  let stripe = carregadas.get(chavePublicavel);
  if (!stripe) {
    // Sem a ajuda de teste da Stripe (o botão "stripe" no canto da tela): ela aparece sozinha
    // com as chaves de teste, e a produção fica com chaves de teste até o lançamento (decisão do
    // operador, 10/10/2026: "não precisamos desse botão").
    stripe = loadStripe(chavePublicavel, { developerTools: { assistant: { enabled: false } } });
    carregadas.set(chavePublicavel, stripe);
  }
  return stripe;
}

/** O idioma do campo do cartão: a escola é só em português (12/10/2026). */
const IDIOMA_DO_CAMPO: StripeElementLocale = "pt-BR";
/** A cor da marca (`docs/design.md`); o campo mora numa moldura da Stripe e não herda o CSS do site. */
const APARENCIA: StripeElementsOptionsMode["appearance"] = { theme: "stripe", variables: { colorPrimary: "#238FE8", borderRadius: "8px" } };

export type PedidoDeCartao = {
  chavePublicavel: string;
  /** Quanto se paga HOJE, em centavos. Zero: nada hoje, o cartão só fica guardado para depois. */
  centavos: number;
  moeda: string;
  /** A lista do servidor — a mesma com que ele cria a assinatura. */
  formasDePagamento: string[];
};

/** Dá o campo do cartão e o `useCartao()` a quem estiver dentro. */
export function CartaoProvider({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) {
  // `allowedPaymentMethodTypes`: o campo só mostra as formas da lista do servidor.
  // `[FATO — medido no navegador, 10/10/2026]` o Stripe.js no ar RECUSA a opção antiga
  // (`paymentMethodTypes`: "is no longer supported in this version of Stripe.js") e o campo
  // simplesmente não aparece, sem erro na tela. E os tipos não acusaram porque as opções eram
  // montadas com `...espalhar`, que o TypeScript não confere — por isso aqui é tudo escrito
  // por extenso, com o tipo: nome de opção errado volta a quebrar a compilação.
  const opcoes: StripeElementsOptionsMode =
    pedido.centavos > 0
      ? { mode: "subscription", amount: pedido.centavos, currency: pedido.moeda, allowedPaymentMethodTypes: pedido.formasDePagamento, locale: IDIOMA_DO_CAMPO, appearance: APARENCIA }
      : { mode: "setup", currency: pedido.moeda, allowedPaymentMethodTypes: pedido.formasDePagamento, locale: IDIOMA_DO_CAMPO, appearance: APARENCIA };
  // A `key`: trocar entre "cobra hoje" e "só guarda o cartão" monta um campo novo.
  return (
    <Elements key={opcoes.mode} stripe={stripeDoSite(pedido.chavePublicavel)} options={opcoes}>
      {children}
    </Elements>
  );
}

/** O campo de pagamento da Stripe. */
export function CampoDoCartao() {
  return <PaymentElement />;
}

/** Deu certo, ou não — com a frase da Stripe quando ela é para o aluno ler (cartão recusado, dado faltando). */
export type Desfecho = { ok: true } | { ok: false; mensagem: string | null };

export type Cartao = {
  /** Confere o que o aluno preencheu, antes de criar qualquer coisa no servidor. */
  validar: () => Promise<Desfecho>;
  /** Confirma com o segredo que o servidor devolveu: `pagamento` cobra hoje; `cartao` só guarda o cartão. */
  confirmar: (segredo: string, tipo: "pagamento" | "cartao", voltarPara: string) => Promise<Desfecho>;
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
    async confirmar(segredo, tipo, voltarPara) {
      if (!stripe || !elements) return { ok: false, mensagem: null };
      // `if_required`: o cartão confirma sem sair da tela (a conferência do banco abre por cima);
      // só forma de pagamento que precise sair volta pelo endereço abaixo.
      const pedido = { elements, clientSecret: segredo, confirmParams: { return_url: new URL(voltarPara, window.location.origin).toString() }, redirect: "if_required" as const };
      const { error } = tipo === "pagamento" ? await stripe.confirmPayment(pedido) : await stripe.confirmSetup(pedido);
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
