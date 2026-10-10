import { CampoDoCartao, useCartao, type Cartao } from "@/lib/stripe-do-site";
import { BotaoDeAssinar } from "./BotaoDeAssinar";

/**
 * O campo do cartão (da Stripe) com o botão de assinar. Mora DENTRO do `CartaoProvider`: é
 * daqui que sai o cartão que o envio confere e confirma.
 */
export function PagamentoComCartao({ enviando, aoEnviar, reativar }: { enviando: boolean; aoEnviar: (cartao: Cartao) => void; reativar?: boolean }) {
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
      <BotaoDeAssinar enviando={enviando} reativar={reativar} />
    </form>
  );
}
