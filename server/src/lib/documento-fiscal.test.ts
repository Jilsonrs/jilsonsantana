import { describe, it, expect } from "vitest";
import { assinarSemLoginSchema, formatarDocumentoFiscal, lerDocumentoFiscal, pixSemLoginSchema } from "@jilson/core";

// O CPF OU CNPJ DE QUEM ASSINA SEM CONTA (etapa 4.7, passo 4) — função pura do `core`, teste
// unitário (CLAUDE.md → Testing: só função pura, sem I/O). A Stripe confere só o formato; quem
// confere o dígito somos nós. O que protege: o número certo passa com qualquer pontuação, o
// errado não passa, e o CNPJ COM LETRAS que a Receita emite desde julho de 2026 é aceito.

describe("o CPF", () => {
  it("o número certo passa, com ou sem pontuação e espaços", () => {
    for (const texto of ["529.982.247-25", "52998224725", " 529 982 247 25 "]) {
      expect(lerDocumentoFiscal(texto), texto).toEqual({ tipo: "cpf", numero: "52998224725" });
    }
  });

  it("cada dígito verificador errado é recusado", () => {
    expect(lerDocumentoFiscal("529.982.247-35")).toBeNull();
    expect(lerDocumentoFiscal("529.982.247-24")).toBeNull();
  });

  it("um dígito trocado no meio é recusado", () => {
    expect(lerDocumentoFiscal("529.983.247-25")).toBeNull();
  });

  it("o número de um algarismo só (111.111.111-11 passa na conta) é recusado", () => {
    for (let a = 0; a <= 9; a++) expect(lerDocumentoFiscal(String(a).repeat(11)), String(a)).toBeNull();
  });

  it("letra no CPF, tamanho errado, vazio: recusados", () => {
    for (const texto of ["5299822472A", "5299822472", "529982247250", "", "   ", "abc"]) expect(lerDocumentoFiscal(texto), texto).toBeNull();
  });
});

describe("o CNPJ", () => {
  it("o de números passa, com ou sem pontuação", () => {
    for (const texto of ["11.222.333/0001-81", "11222333000181"]) expect(lerDocumentoFiscal(texto), texto).toEqual({ tipo: "cnpj", numero: "11222333000181" });
  });

  it("o COM LETRAS (desde julho de 2026) passa — inclusive digitado em minúsculas", () => {
    for (const texto of ["12.ABC.345/01DE-35", "12ABC34501DE35", "12.abc.345/01de-35"]) expect(lerDocumentoFiscal(texto), texto).toEqual({ tipo: "cnpj", numero: "12ABC34501DE35" });
  });

  it("dígito verificador errado — no de números e no com letras — é recusado", () => {
    for (const texto of ["11.222.333/0001-82", "11.222.333/0001-91", "12.ABC.345/01DE-36", "12.ABC.345/01DE-45"]) expect(lerDocumentoFiscal(texto), texto).toBeNull();
  });

  it("uma letra trocada no com letras muda a conta e é recusada", () => {
    expect(lerDocumentoFiscal("12.ABD.345/01DE-35")).toBeNull();
  });

  it("letra no lugar do dígito verificador, ou caractere fora de letra e número: recusados", () => {
    for (const texto of ["12.ABC.345/01DE-3A", "12.ABC.345/01D*-35", "00.000.000/0000-00"]) expect(lerDocumentoFiscal(texto), texto).toBeNull();
  });
});

describe("a pontuação de costume (o formato que vai à Stripe)", () => {
  it("CPF e CNPJ", () => {
    expect(formatarDocumentoFiscal({ tipo: "cpf", numero: "52998224725" })).toBe("529.982.247-25");
    expect(formatarDocumentoFiscal({ tipo: "cnpj", numero: "12ABC34501DE35" })).toBe("12.ABC.345/01DE-35");
  });
});

// O PEDIDO DE ASSINAR SEM CONTA: o CPF errado recusa o pedido; a origem (UTM) NUNCA recusa — um
// valor estranho não pode impedir ninguém de assinar.
describe("o pedido de assinar sem conta", () => {
  const certo = { nome: "Ana Souza", email: "ana@exemplo.com", documento: "529.982.247-25", plano: "mensal", novidades: false };

  it("o documento vira o documento conferido; o CPF errado recusa o pedido, sem repetir o número", () => {
    const ok = assinarSemLoginSchema.safeParse(certo);
    expect(ok.success && ok.data.documento).toEqual({ tipo: "cpf", numero: "52998224725" });
    const ruim = assinarSemLoginSchema.safeParse({ ...certo, documento: "529.982.247-24" });
    expect(ruim.success).toBe(false);
    expect(JSON.stringify(ruim.error?.issues)).toContain("DocumentoInvalido");
    expect(JSON.stringify(ruim.error?.issues)).not.toContain("529");
  });

  it("a origem estranha (número, vazia, enorme) não recusa: vira nada, ou é cortada em 100", () => {
    for (const origem of [123, "", "   ", null, { a: 1 }]) {
      const r = assinarSemLoginSchema.safeParse({ ...certo, origem, campanha: origem });
      expect(r.success, JSON.stringify(origem)).toBe(true);
      expect(r.success && [r.data.origem, r.data.campanha]).toEqual([undefined, undefined]);
    }
    const longa = assinarSemLoginSchema.safeParse({ ...certo, origem: "x".repeat(500) });
    expect(longa.success && longa.data.origem?.length).toBe(100);
  });

  it("o código da tentativa estranho também não recusa: vira nada (e nasce outra tentativa)", () => {
    const r = assinarSemLoginSchema.safeParse({ ...certo, tentativa: 42 });
    expect(r.success && r.data.tentativa).toBeUndefined();
  });

  it("sem o nome, sem a resposta da caixa de novidades, ou sem o documento: recusado — no cartão e no Pix", () => {
    for (const schema of [assinarSemLoginSchema, pixSemLoginSchema]) {
      expect(schema.safeParse(certo).success).toBe(true);
      expect(schema.safeParse({ ...certo, nome: undefined }).success).toBe(false);
      expect(schema.safeParse({ ...certo, novidades: undefined }).success).toBe(false);
      expect(schema.safeParse({ ...certo, documento: undefined }).success).toBe(false);
    }
  });
});
