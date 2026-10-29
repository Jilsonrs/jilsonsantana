import { useCartao, type Cartao } from "@/lib/stripe-do-site";
import { BotaoDeAssinar } from "./BotaoDeAssinar";

/**
 * O botão de assinar quando há cartão. Mora DENTRO do `CartaoProvider`: é daqui que sai o cartão que
 * o envio confere e confirma. O campo do cartão (`CampoDoCartao`) fica no formulário, e o botão na
 * coluna de resumo (etapa 4.7, passo 6d) — os dois no mesmo `CartaoProvider`.
 */
export function BotaoComCartao({ enviando, aoEnviar, reativar, pix }: { enviando: boolean; aoEnviar: (cartao: Cartao) => void; reativar?: boolean; pix?: boolean }) {
  const cartao = useCartao();
  return <BotaoDeAssinar enviando={enviando} aoClicar={() => aoEnviar(cartao)} reativar={reativar} pix={pix} />;
}
