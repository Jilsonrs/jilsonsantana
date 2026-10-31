import type { CobrancaDaFicha } from "@jilson/core";

// AS DEVOLUÇÕES NA FICHA (etapa 4.7b, bloco 4, passo 4a — decisão do operador P139: inteiro ou uma parte, no máximo o que
// ainda não voltou). Funções puras, com teste. O servidor confere tudo de novo: aqui é só o que a tela mostra e manda.

/** Quanto ainda falta voltar desta cobrança — 0 quando não há o que devolver (a que falhou, a pendente, a contestada, a já devolvida). */
export function faltaVoltar(cobranca: Pick<CobrancaDaFicha, "situacao" | "centavos" | "devolvido">): number {
  if (cobranca.situacao !== "paga" && cobranca.situacao !== "devolvida-em-parte") return 0;
  return Math.max(0, cobranca.centavos - cobranca.devolvido);
}

/** O valor digitado em reais ("99,90", "99", "1.234,56", "R$ 10") em centavos — ou nada, se não for um valor maior que zero. */
export function centavosDoTexto(texto: string): number | null {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(limpo)) return null;
  const [inteiro = "", fracao = ""] = limpo.replace(/\./g, "").split(",");
  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

/** Os centavos no formato do campo ("99,90"). */
export function textoDosCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}
