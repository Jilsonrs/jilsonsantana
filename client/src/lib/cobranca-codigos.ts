import type { CodigoDaLista, SituacaoDoCodigo } from "@jilson/core";
import { codigoDoErro } from "@/lib/course-form";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";

// OS CÓDIGOS PROMOCIONAIS NO ADMIN (etapa 4.7b, passo 6d — decisão do operador, 31/10/2026, P142). Admin fica em
// português, com o texto aqui (decisão do operador, 23/09/2026).

/**
 * O número do pedido de criar: 32 letras de 0-9 e a-f, sorteadas. Com `crypto.getRandomValues`, que todo navegador do piso
 * tem (o `randomUUID` não: Safari 15.4).
 */
export function novoPedido(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const SITUACAO_DO_CODIGO: Record<SituacaoDoCodigo, string> = { ativo: "Ativo", pausado: "Pausado", esgotado: "Esgotado", vencido: "Vencido" };

/** O desconto, numa frase: "100% em todas as cobranças". */
export function textoDoDesconto(codigo: CodigoDaLista): string {
  if (codigo.percentual === null) return "Desconto em valor";
  const duracao = codigo.duracao === "uma-vez" ? "só na primeira cobrança" : codigo.duracao === "para-sempre" ? "em todas as cobranças" : codigo.duracao === "por-meses" ? `por ${codigo.meses ?? "?"} meses` : null;
  return duracao ? `${codigo.percentual}% ${duracao}` : `${codigo.percentual}%`;
}

/** Quantos usaram: "3 de 20 usos", ou "3 usos" no código sem limite. */
export function textoDosUsos(codigo: CodigoDaLista): string {
  if (codigo.maximo !== null) return `${codigo.usados} de ${codigo.maximo} ${codigo.maximo === 1 ? "uso" : "usos"}`;
  return codigo.usados === 1 ? "1 uso" : `${codigo.usados} usos`;
}

/** A frase de quando criar, pausar ou reativar não deu certo. */
export function mensagemDoCodigoQueFalhou(erro: unknown): string {
  switch (codigoDoErro(erro)) {
    case "CodigoJaExiste":
      return "Já existe um código ativo com esse texto. Escolha outro, ou pause o que existe.";
    case "DataInvalida":
      return "Essa data não existe ou já passou.";
    case "NaoReativa":
      return "Este código não volta: está esgotado ou vencido. Crie outro.";
    case "Ocupada":
      return "Outro código está sendo criado agora. Tente de novo em instantes.";
    case "NadaAFazer":
      return "Nada a fazer: o código já está assim.";
    case "NaoEncontrada":
      return "A Stripe não conhece este código.";
    case "ValidationError":
      return "Confira os campos e tente de novo.";
    default:
      return mensagemDaAcaoQueFalhou(erro);
  }
}
