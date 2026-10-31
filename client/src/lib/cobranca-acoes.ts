import { codigoDoErro } from "@/lib/course-form";

// AS AÇÕES DO PAINEL DA COBRANÇA (Fase 4, etapa 4.7b, bloco 3). Admin fica em português, com o texto aqui (decisão do
// operador, 23/09/2026); o operador confere usando (31/10/2026).

/** A frase de quando a ação não pôde ser feita, pelo motivo que o servidor deu. */
export function mensagemDaAcaoQueFalhou(erro: unknown): string {
  switch (codigoDoErro(erro)) {
    case "Ocupada":
      return "A assinatura está sendo atualizada agora. Tente de novo em instantes.";
    case "PrePaga":
      return "O Pix pré-pago não renova: não há o que cancelar nem desfazer.";
    case "NadaAFazer":
      return "Nada a fazer: a Stripe diz que ela já está assim.";
    case "StripeNaoConhece":
      return "A Stripe não conhece esta assinatura.";
    case "NaoEncontrada":
      return "Não achamos isso no site.";
    case "NaoConfigurado":
      return "A Stripe não está configurada neste ambiente.";
    default:
      return "Não foi possível. Tente de novo.";
  }
}
