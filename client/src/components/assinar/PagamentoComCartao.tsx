import { CampoDoCartao, useCartao, type Cartao } from "@/lib/stripe-do-site";
import { BotaoDeAssinar } from "./BotaoDeAssinar";

/**
 * O campo do cartão (da Stripe) com o botão de assinar. Mora DENTRO do `CartaoProvider`: é
 * daqui que sai o cartão que o envio confere e confirma.
 */
export function PagamentoComCartao({ enviando, aoEnviar }: { enviando: boolean; aoEnviar: (cartao: Cartao) => void }) {
  const cartao = useCartao();
  return (
    <form
      className="space-y-6"
      onSubmit={(evento) => {
        evento.preventDefault();
        aoEnviar(cartao);
      }}
    >
      <CampoDoCartao />
      <BotaoDeAssinar enviando={enviando} />
    </form>
  );
}
