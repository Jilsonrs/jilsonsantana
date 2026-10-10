import type { ReactNode } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe, StripeElementLocale, StripeElementsOptionsMode, StripeError } from "@stripe/stripe-js";
import type { LanguageCode } from "@jilson/core";

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
    stripe = loadStripe(chavePublicavel);
    carregadas.set(chavePublicavel, stripe);
  }
  return stripe;
}

const IDIOMA_DO_CAMPO: Record<LanguageCode, StripeElementLocale> = { pt: "pt-BR", en: "en" };
/** A cor da marca (`docs/design.md`); o campo mora numa moldura da Stripe e não herda o CSS do site. */
const APARENCIA: StripeElementsOptionsMode["appearance"] = { theme: "stripe", variables: { colorPrimary: "#238FE8", borderRadius: "8px" } };

export type PedidoDeCartao = {
  chavePublicavel: string;
  /** Quanto se paga HOJE, em centavos. Zero: nada hoje, o cartão só fica guardado para depois. */
  centavos: number;
  moeda: string;
  /** A lista do servidor — a mesma com que ele cria a assinatura. */
  formasDePagamento: string[];
  idioma: LanguageCode;
};

/** Dá o campo do cartão e o `useCartao()` a quem estiver dentro. */
export function CartaoProvider({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) {
  const comum = { currency: pedido.moeda, paymentMethodTypes: pedido.formasDePagamento, locale: IDIOMA_DO_CAMPO[pedido.idioma], appearance: APARENCIA };
  const opcoes: StripeElementsOptionsMode = pedido.centavos > 0 ? { ...comum, mode: "subscription", amount: pedido.centavos } : { ...comum, mode: "setup" };
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
