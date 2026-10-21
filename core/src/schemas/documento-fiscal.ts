import { z } from "zod";

// O CPF OU CNPJ DE QUEM ASSINA (Fase 4, etapa 4.7, passo 4 — billing.md → *A tela pública de
// assinar*: obrigatório, decisão do operador de 12/10/2026). A conferência é NOSSA, pelo dígito
// verificador — a Stripe guarda o número no cliente e confere só o formato, nunca na Receita. Mora
// no `core` porque a tela de assinar (passo 6) confere o mesmo, antes de enviar.
//
// O CNPJ PODE TER LETRAS: a Receita emite o CNPJ alfanumérico desde julho de 2026 (os já emitidos
// continuam só com números). São 12 posições de letras ou números e 2 dígitos no fim, e o dígito se
// calcula como sempre, com o valor de cada posição = o código ASCII − 48 (os números valem o que são;
// "A" vale 17, "Z" vale 42).

export type TipoDeDocumento = "cpf" | "cnpj";

/** O documento já conferido: só os caracteres (letras em maiúsculas), sem pontuação. */
export type DocumentoFiscal = { tipo: TipoDeDocumento; numero: string };

const PESOS_DO_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DO_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** O dígito de módulo 11, com os pesos dados, sobre o valor de cada posição. */
function digito(valores: number[], pesos: number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + peso * (valores[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** O valor de uma posição: o código ASCII − 48 (vale para os números e para as letras do CNPJ novo). */
const valor = (caractere: string) => caractere.charCodeAt(0) - 48;

function cpfValido(numero: string): boolean {
  const v = [...numero].map(valor);
  const pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  return digito(v, pesos1) === v[9] && digito(v, pesos2) === v[10];
}

function cnpjValido(numero: string): boolean {
  const v = [...numero].map(valor);
  return digito(v, PESOS_DO_CNPJ_1) === v[12] && digito(v, PESOS_DO_CNPJ_2) === v[13];
}

/**
 * O CPF ou CNPJ digitado, conferido — ou nada. Aceita com ou sem pontuação (pontos, traço, barra,
 * espaços) e letras minúsculas no CNPJ. Recusa o número de um caractere só repetido (000…, 111…),
 * que passa na conta mas a Receita não emite. Função pura.
 */
export function lerDocumentoFiscal(texto: string): DocumentoFiscal | null {
  const numero = texto.replace(/[\s.\-/]/g, "").toUpperCase();
  if (/^(.)\1*$/.test(numero)) return null;
  if (/^\d{11}$/.test(numero)) return cpfValido(numero) ? { tipo: "cpf", numero } : null;
  if (/^[0-9A-Z]{12}\d{2}$/.test(numero)) return cnpjValido(numero) ? { tipo: "cnpj", numero } : null;
  return null;
}

/** O número com a pontuação de costume: 123.456.789-09 · 12.ABC.345/01DE-35. É o formato que a Stripe guarda. */
export function formatarDocumentoFiscal(documento: DocumentoFiscal): string {
  const n = documento.numero;
  if (documento.tipo === "cpf") return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

/** O campo do CPF ou CNPJ num pedido: o texto digitado vira o documento conferido, ou o pedido é recusado. */
export const documentoFiscalSchema = z
  .string()
  .max(32)
  .transform((texto, ctx) => {
    const documento = lerDocumentoFiscal(texto);
    if (!documento) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "DocumentoInvalido" });
      return z.NEVER;
    }
    return documento;
  });
