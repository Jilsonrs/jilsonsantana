import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach, type MockInstance } from "vitest";
import http from "node:http";
import express from "express";
import request from "supertest";
import type { PrecoDoPlano } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: a busca dos preços é o dublê que deixa um erro ESCAPAR de uma
// rota de verdade (`GET /api/billing/planos`), com a cara que o teste escolher.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
}));

import servidor from "./servidor.js";
import { tratarErroDaApi } from "../lib/erro-da-api.js";

// O TRATADOR DE ERRO DA API (Fase 4, etapa 4.4 — achado da revisão de segurança da 4.2). O que
// estes testes protegem:
//   - o erro que escapa de uma rota de `/api` responde 500 `ErroInterno` — NUNCA o status nem
//     os cabeçalhos que o erro carrega (o da Stripe carrega os dela), nem a mensagem, nem o rastro;
//   - a falha não fica muda: o registro leva o endereço e o erro — sem o que vem depois do "?";
//   - o corpo que o Express recusou ao ler continua 4xx (não é falha nossa); a recusa fica no
//     registro (endereço, status e motivo), e o corpo recusado NÃO;
//   - com a resposta já começada, não tenta responder de novo.

const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
let member: string[] = [];
let registro: MockInstance<typeof console.error>;
let avisos: MockInstance<typeof console.warn>;
const linhas = () => registro.mock.calls.flat().join("\n");
const avisados = () => avisos.mock.calls.flat().join("\n");

/** Um erro com a cara do da Stripe quando escapa cru: status, cabeçalhos e mensagem dela. */
function erroComCaraDeStripe() {
  return Object.assign(new Error("No such price: 'price_SEGREDO_DA_MENSAGEM'"), {
    type: "StripeInvalidRequestError",
    status: 402,
    statusCode: 402,
    headers: { "x-veio-da-stripe": "sim", "stripe-account": "acct_nao_pode_vazar", "set-cookie": "vazou=1" },
  });
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(member.length).toBeGreaterThan(0);
});
beforeEach(() => {
  buscarPrecos.mockReset();
  registro = vi.spyOn(console, "error").mockImplementation(() => {});
  avisos = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  registro.mockRestore();
  avisos.mockRestore();
});
afterAll(() => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("o erro que escapa de uma rota de /api", () => {
  it("responde 500 ErroInterno — nunca o status, os cabeçalhos, a mensagem ou o rastro do erro", async () => {
    buscarPrecos.mockRejectedValue(erroComCaraDeStripe());
    const res = await request(servidor).get("/api/billing/planos").set("Cookie", member);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "ErroInterno" });
    expect(res.headers["x-veio-da-stripe"]).toBeUndefined();
    expect(res.headers["stripe-account"]).toBeUndefined();
    expect(JSON.stringify(res.headers)).not.toContain("vazou");
    expect(res.text).not.toContain("SEGREDO_DA_MENSAGEM");
    expect(res.text).not.toContain("erro-da-api");
  });

  it("não fica mudo: o registro leva o endereço e o erro — sem o que vem depois do \"?\"", async () => {
    buscarPrecos.mockRejectedValue(new Error("a Stripe caiu"));
    await request(servidor).get("/api/billing/planos?token=nao_vai_para_o_registro").set("Cookie", member);
    expect(linhas()).toContain("[api] GET /api/billing/planos falhou");
    expect(linhas()).toContain("a Stripe caiu");
    expect(linhas()).not.toContain("nao_vai_para_o_registro");
  });

  it("o registro leva o rastro, nunca o objeto do erro inteiro (o da Stripe carrega a resposta crua dela)", async () => {
    buscarPrecos.mockRejectedValue(erroComCaraDeStripe());
    await request(servidor).get("/api/billing/planos").set("Cookie", member);
    expect(linhas()).toContain("[api] GET /api/billing/planos falhou");
    expect(linhas()).not.toContain("acct_nao_pode_vazar");
  });

  it("o que foi lançado não é um Error: 500 do mesmo jeito, e o registro diz isso", async () => {
    buscarPrecos.mockRejectedValue({ status: 418, headers: { "x-veio-da-stripe": "sim" } });
    const res = await request(servidor).get("/api/billing/planos").set("Cookie", member);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "ErroInterno" });
    expect(res.headers["x-veio-da-stripe"]).toBeUndefined();
    expect(linhas()).toContain("erro que não é Error");
  });

  it("um erro que só IMITA o do corpo recusado no status não ganha 4xx: quem decide é o tipo, numa lista fechada", async () => {
    buscarPrecos.mockRejectedValue(Object.assign(new Error("x"), { status: 400, type: "toString" }));
    expect((await request(servidor).get("/api/billing/planos").set("Cookie", member)).status).toBe(500);
  });
});

describe("o corpo que o Express recusou ao ler", () => {
  it("JSON malformado: 400 CorpoInvalido — não é falha nossa —, e o corpo recusado não vai para o registro", async () => {
    // Sem aspas no valor, e CURTO: a mensagem do erro de leitura cita uns 10 caracteres do corpo
    // em volta do defeito (medido: `..."codigo": PROMO9}" is not valid JSON`). Nem ela vai.
    const res = await request(servidor).post("/api/billing/previa").set("Cookie", member).set("Content-Type", "application/json").send('{"plano": "mensal", "codigo": PROMO9}');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "CorpoInvalido" });
    expect(res.text).not.toContain("PROMO9");
    expect(linhas()).not.toContain("PROMO9");
    expect(avisados()).toContain("[api] POST /api/billing/previa: corpo recusado (400, entity.parse.failed)");
    expect(avisados()).not.toContain("PROMO9");
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("corpo grande demais: 413 CorpoInvalido", async () => {
    const res = await request(servidor).post("/api/billing/previa").set("Cookie", member).send({ plano: "mensal", codigo: "x".repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "CorpoInvalido" });
  });

  it("a recusa não fica muda: o registro diz o endereço, o status e o motivo — sem o corpo", async () => {
    // Achado da revisão de segurança da etapa 4.4: um aviso da Stripe grande demais levava 413
    // sem linha nenhuma no registro — ela reentregaria por 3 dias, e só o painel dela mostraria.
    const res = await request(servidor)
      .post("/api/stripe/webhook?token=nao_vai_para_o_registro")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ id: "evt_grande", conteudo: "CORPO_DO_AVISO".repeat(20_000) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "CorpoInvalido" });
    expect(avisados()).toContain("[api] POST /api/stripe/webhook: corpo recusado (413, entity.too.large)");
    expect(avisados()).not.toContain("CORPO_DO_AVISO");
    expect(avisados()).not.toContain("nao_vai_para_o_registro");
  });
});

describe("o endereço malformado", () => {
  it("coisa de robô: 400 EnderecoInvalido, com aviso — nunca 500 nem linha de ERRO, que viraria alerta à toa", async () => {
    // Medido antes da correção (10/10/2026): este pedido respondia 500 e gritava no registro.
    const res = await request(servidor).get("/api/lessons/%E0%A4%A").set("Cookie", member);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "EnderecoInvalido" });
    expect(linhas()).toBe("");
    expect(avisados()).toContain("[api] GET: endereço malformado recusado (400)");
    expect(avisados()).not.toContain("%E0");
  });
});

describe("com a resposta já começada", () => {
  it("não tenta responder de novo: o erro ORIGINAL segue adiante, e o Express fecha a conexão", async () => {
    // Um app mínimo, escutando só em 127.0.0.1 como o servidor dos testes (`servidor.ts`).
    const mini = express();
    mini.get("/api/no-meio", (_req, res) => {
      res.write("comecou");
      throw new Error("caiu no meio do envio");
    });
    mini.use("/api", tratarErroDaApi);
    // Quem vem DEPOIS do tratador vê o erro de verdade — não um segundo erro, o de tentar
    // responder com a resposta já na rua, que esconderia a causa.
    let seguiu: unknown = null;
    const depois: express.ErrorRequestHandler = (erro, _req, _res, next) => {
      seguiu = erro;
      next(erro);
    };
    mini.use(depois);
    const escuta = http.createServer(mini);
    await new Promise<void>((pronto) => escuta.listen(0, "127.0.0.1", () => pronto()));
    try {
      const resultado = await request(escuta).get("/api/no-meio").then(
        (res) => res.text,
        () => "conexão fechada",
      );
      expect(resultado).not.toContain("ErroInterno");
      expect(seguiu).toBeInstanceOf(Error);
      expect((seguiu as Error).message).toBe("caiu no meio do envio");
    } finally {
      await new Promise((fechou) => escuta.close(fechou));
    }
  });
});
