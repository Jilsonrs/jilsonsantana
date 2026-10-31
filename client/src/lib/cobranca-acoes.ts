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
    case "ValorMudou":
      return "O valor mudou desde que você abriu: confira de novo.";
    case "ValorAcimaDoQueFalta":
      return "O valor passa do que falta voltar desta cobrança.";
    case "DevolucaoFalhou":
      return "A devolução não saiu. Tente de novo. Se a assinatura foi encerrada antes (no \"Cancelar e devolver\", ou com \"E encerrar\"), ela já acabou e o caso está em Precisa de você.";
    case "PixNaoAceito":
      return "Não deu para aceitar este Pix: o plano não está à venda, ou a fatura não se pagou por fora. Devolva o Pix.";
    case "JaTemAcesso":
      return "A pessoa já tem acesso às aulas: nada foi liberado.";
    case "ContestacaoNaoGanha":
      return "A escola ainda não ganhou esta contestação (o banco não decidiu, ou decidiu contra): nada foi liberado.";
    case "ContestacaoNaoAberta":
      return "Só a contestação aberta se aceita: o inquérito se resolve devolvendo o dinheiro, e a já decidida não muda.";
    case "JaTemOutraAssinatura":
      return "A pessoa já tem acesso ou outra assinatura viva: aceitar criaria uma segunda pelo mesmo período. Devolva o Pix.";
    case "OutraAssinaturaViva":
      return "A pessoa tem uma assinatura que ainda não acabou (com a cobrança atrasada, por exemplo): liberar agora cobraria o mesmo período duas vezes. Cancele-a na ficha antes.";
    case "PixPagoEsperando":
      return "A pessoa tem um Pix pago que ainda não virou assinatura: resolva-o antes (Conferir na Stripe, ou o caso em Precisa de você).";
    case "PixJaVirouAssinatura":
      return "Este Pix já virou uma assinatura que vale: use \"Cancelar e devolver o dinheiro\" na ficha, que encerra e devolve.";
    case "SemValorDaDevolucao":
      return "Este caso não diz quanto falhou: devolva pelo \"Devolver\" da cobrança, na ficha da pessoa.";
    case "PixSemAssinatura":
      return "Este Pix ainda não virou assinatura: devolva pelo caso dele, em Precisa de você (\"Devolver o Pix\").";
    case "OutraContestacaoNaoGanha":
      return "Esta assinatura tem outra contestação que a escola não ganhou: nada foi liberado.";
    case "ContaDeAdmin":
      return "A conta de um admin não se corrige por aqui.";
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
