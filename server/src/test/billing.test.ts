import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { CodigoPromocional, PrecoDoPlano } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. O resto de `lib/stripe.ts` (a
// chave publicável, o que está configurado) roda de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarCodigo = vi.fn<(codigo: string) => Promise<CodigoPromocional | null>>();
const calcularPrevia = vi.fn<(precoId: string, codigoId: string) => Promise<{ centavosHoje: number; moeda: string } | null>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarCodigo: (codigo: string) => buscarCodigo(codigo),
  calcularPrevia: (precoId: string, codigoId: string) => calcularPrevia(precoId, codigoId),
}));

import servidor from "./servidor.js";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2). O que estes testes protegem — é a fronteira
// de dinheiro:
//   - nada daqui responde sem login, e sem login a Stripe nem é chamada;
//   - os planos saem com o valor que a Stripe diz, e o código do preço não vai ao navegador;
//   - sem a chave certa no lugar certo a tela não abre — e a SECRETA colada na variável da
//     publicável nunca sai na resposta;
//   - a Stripe fora do ar chega à tela como falha, sem plano e sem chave.
//   - o código promocional: o valor de hoje é o que a STRIPE calcula, para o preço do plano
//     pedido — o corpo não tem como apontar outro preço; código que não existe e código que
//     não vale para a compra dão a MESMA recusa; o código da Stripe não vai ao navegador.

const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const CEM_PARA_SEMPRE: CodigoPromocional = { id: "promo_cem", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } };
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const planos = (cookies: string[] = []) => request(servidor).get("/api/billing/planos").set("Cookie", cookies);
const previa = (corpo: object, cookies: string[] = []) => request(servidor).post("/api/billing/previa").set("Cookie", cookies).send(corpo);

beforeAll(async () => {
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  expect(member.length).toBeGreaterThan(0);
});

beforeEach(() => {
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarCodigo.mockReset().mockResolvedValue(CEM_PARA_SEMPRE);
  calcularPrevia.mockReset().mockResolvedValue({ centavosHoje: 0, moeda: "brl" });
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
});

afterAll(() => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("GET /api/billing/planos", () => {
  it("sem login: 401, e a Stripe nem é chamada", async () => {
    const res = await planos();
    expect(res.status).toBe(401);
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("com login: os dois planos com o valor da Stripe e a chave publicável", async () => {
    const res = await planos(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      chavePublicavel: "pk_test_da_suite_local",
      planos: [
        { plano: "mensal", centavos: 9990, moeda: "brl" },
        { plano: "anual", centavos: 99500, moeda: "brl" },
      ],
    });
  });

  it("o código do preço e a chave secreta não vão ao navegador", async () => {
    const res = await planos(member);
    expect(res.text).not.toContain("price_");
    expect(res.text).not.toContain("sk_test");
  });

  it("a chave SECRETA colada na variável da publicável: 503, e ela não sai na resposta", async () => {
    process.env.STRIPE_PUBLISHABLE_KEY = "sk_test_colada_no_lugar_errado";
    const res = await planos(member);
    expect(res.status).toBe(503);
    expect(res.text).not.toContain("sk_test");
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("sem a chave publicável ou sem a secreta: 503", async () => {
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    expect((await planos(member)).status).toBe(503);
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
    delete process.env.STRIPE_SECRET_KEY;
    expect((await planos(member)).status).toBe(503);
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  // A mensagem de erro da Stripe é limpa na fronteira (`erroSemMensagem`, com teste em
  // `lib/stripe.test.ts`); aqui, o que a tela precisa: a falha chega como falha, sem plano nenhum.
  it("a Stripe fora do ar: 500, e nenhum plano sai", async () => {
    buscarPrecos.mockRejectedValue(new Error("[stripe] a busca dos preços falhou: StripeConnectionError"));
    const res = await planos(member);
    expect(res.status).toBe(500);
    expect(res.body).not.toHaveProperty("planos");
    expect(res.text).not.toContain("pk_test");
  });
});

describe("POST /api/billing/previa", () => {
  it("sem login: 401, e a Stripe nem é chamada", async () => {
    const res = await previa({ plano: "mensal", codigo: "TESTE100" });
    expect(res.status).toBe(401);
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(calcularPrevia).not.toHaveBeenCalled();
  });

  it("código que vale: o valor de hoje que a Stripe calculou e o desconto", async () => {
    const res = await previa({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ centavosHoje: 0, moeda: "brl", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } });
    expect(calcularPrevia).toHaveBeenCalledWith("price_mensal", "promo_cem");
  });

  it("o preço é o do plano pedido — e o corpo não tem como apontar outro preço nem outro valor", async () => {
    calcularPrevia.mockResolvedValue({ centavosHoje: 49750, moeda: "brl" });
    const res = await previa({ plano: "anual", codigo: "METADE", precoId: "price_de_um_centavo", centavos: 1, centavosHoje: 1 }, member);
    expect(res.status).toBe(200);
    expect(res.body.centavosHoje).toBe(49750);
    expect(calcularPrevia).toHaveBeenCalledTimes(1);
    expect(calcularPrevia).toHaveBeenCalledWith("price_anual", "promo_cem");
  });

  it("o código chega à Stripe aparado nas pontas (colado de e-mail, vem com espaço)", async () => {
    await previa({ plano: "mensal", codigo: "  TESTE100 \n" }, member);
    expect(buscarCodigo).toHaveBeenCalledWith("TESTE100");
  });

  it("código que não existe, venceu ou esgotou: 400 CodigoInvalido, sem calcular nada", async () => {
    buscarCodigo.mockResolvedValue(null);
    const res = await previa({ plano: "mensal", codigo: "NAOEXISTE" }, member);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "CodigoInvalido" });
    expect(calcularPrevia).not.toHaveBeenCalled();
  });

  it("código que existe mas não vale para esta compra: a MESMA recusa", async () => {
    calcularPrevia.mockResolvedValue(null);
    const res = await previa({ plano: "mensal", codigo: "SOEMDOLAR" }, member);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "CodigoInvalido" });
  });

  it("o código da Stripe e o do preço não vão ao navegador", async () => {
    const res = await previa({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(res.text).not.toContain("promo_");
    expect(res.text).not.toContain("price_");
  });

  it("plano inventado, código vazio ou só de espaços, ou comprido demais: 400, sem ir à Stripe", async () => {
    for (const corpo of [{ plano: "vitalicio", codigo: "TESTE100" }, { plano: "mensal" }, { plano: "mensal", codigo: "   " }, { plano: "mensal", codigo: "A".repeat(65) }, { codigo: "TESTE100" }]) {
      const res = await previa(corpo, member);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ValidationError");
    }
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("sem a chave secreta: 503, sem ir à Stripe", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await previa({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(res.status).toBe(503);
    expect(buscarCodigo).not.toHaveBeenCalled();
  });
});
