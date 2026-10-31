import { describe, it, expect } from "vitest";
import { centavosDoTexto, faltaVoltar, textoDosCentavos } from "./cobranca-devolucao";

// O VALOR DA DEVOLUÇÃO NA FICHA (etapa 4.7b, passo 4a — P139). Funções puras: o que falta voltar de cada cobrança, e o
// valor digitado em reais lido em centavos — o que não for um valor maior que zero não vale.

describe("o que falta voltar", () => {
  it("da paga e da devolvida em parte: o que falta; das outras, nada", () => {
    expect(faltaVoltar({ situacao: "paga", centavos: 9990, devolvido: 0 })).toBe(9990);
    expect(faltaVoltar({ situacao: "devolvida-em-parte", centavos: 9990, devolvido: 2000 })).toBe(7990);
    for (const situacao of ["falhou", "pendente", "devolvida", "contestada"] as const) expect(faltaVoltar({ situacao, centavos: 9990, devolvido: 0 })).toBe(0);
  });
});

describe("o valor digitado", () => {
  it("em reais, com vírgula, com milhar e com R$", () => {
    expect(["99,90", "99", "10,5", "0,50", "1.234,56", "R$ 10,00", " 99,90 "].map(centavosDoTexto)).toEqual([9990, 9900, 1050, 50, 123456, 1000, 9990]);
  });

  it("o que não é valor, ou é zero: nada", () => {
    expect(["", "abc", "0", "0,00", "99.90", "9,999", "-10", "1.23,45", "10,5,0"].map(centavosDoTexto)).toEqual([null, null, null, null, null, null, null, null, null]);
  });

  it("e de volta, no formato do campo", () => {
    expect([9990, 50, 123456].map(textoDosCentavos)).toEqual(["99,90", "0,50", "1234,56"]);
  });
});
