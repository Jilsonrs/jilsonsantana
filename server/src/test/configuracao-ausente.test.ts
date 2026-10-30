import { describe, it, expect, vi, afterAll, beforeAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";

// A COBRANÇA SEM CONFIGURAÇÃO, PELAS ROTAS DE VERDADE (revisão do grupo 2 da 4.9b, 30/10/2026): sem as chaves da Stripe, a
// rota sem login responde 503 e alerta UMA vez — os pedidos seguintes, de um robô, ficam no registro; e o endereço de
// avisos sem o segredo, o mesmo.
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
beforeAll(() => {
  for (const nome of AMBIENTE) delete process.env[nome];
});
afterAll(() => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("a cobrança sem configuração", () => {
  it("os planos sem login e o endereço de avisos: 503, e UM alerta de cada — o resto no registro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (let i = 0; i < 3; i++) {
      expect((await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", `198.18.1.${i + 1}`)).status).toBe(503);
      expect((await request(servidor).post("/api/stripe/webhook").set("content-type", "application/json").send("{}")).status).toBe(503);
    }
    const alertas = erro.mock.calls.map(([texto]) => String(texto));
    expect(alertas.filter((texto) => texto.includes("planos (sem login) recusados"))).toHaveLength(1);
    expect(alertas.filter((texto) => texto.includes("STRIPE_WEBHOOK_SECRET não configurado"))).toHaveLength(1);
    expect(registro.mock.calls.filter(([texto]) => String(texto).includes("planos (sem login) recusados"))).toHaveLength(2);
    vi.restoreAllMocks();
  });
});
