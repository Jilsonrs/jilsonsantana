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
    case "AssinaturaViva":
      return "A assinatura ainda está viva: anular a cobrança dela a reativaria sem pagamento. Encerre a assinatura antes.";
    case "DocumentoInvalido":
      return "Este CPF ou CNPJ não é válido.";
    case "MesmoEmail":
      return "Este já é o e-mail da conta.";
    case "EmailDeOutraConta":
      return "Este e-mail já é de outra conta.";
    case "EmailNaoSaiu":
      return "O e-mail com o código não saiu. Tente de novo.";
    case "CodigoErrado":
      return "Código errado. Confira com a pessoa e tente de novo.";
    case "CodigoVencido":
      return "O código venceu ou foi tentado demais. Envie outro.";
    case "PagamentoNoEmailNovo":
      return "Este e-mail tem uma tentativa de assinatura com pagamento. Confira em Tentativas antes de trocar.";
    default:
      return "Não foi possível. Tente de novo.";
  }
}
