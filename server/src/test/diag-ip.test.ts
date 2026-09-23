import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

// Rota TEMPORÁRIA (routes/diag-ip.ts). Este teste existe para uma coisa só: ela
// nunca pode devolver nada além dos cabeçalhos de IP. É diagnóstico público em
// produção — um descuido aqui ecoaria o cookie de sessão de quem acessa.
describe("diagnóstico de IP (temporário)", () => {
  it("devolve os cabeçalhos de IP da própria requisição", async () => {
    const res = await request(app)
      .get("/api/__ip")
      .set("X-Real-IP", "203.0.113.7")
      .set("X-Forwarded-For", "203.0.113.7, 198.51.100.2");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.cabecalhos["x-real-ip"]).toBe("203.0.113.7");
    expect(res.body.cabecalhos["x-forwarded-for"]).toBe("203.0.113.7, 198.51.100.2");
  });

  it("NUNCA ecoa cookie nem authorization", async () => {
    const res = await request(app)
      .get("/api/__ip")
      .set("Cookie", "better-auth.session_token=SEGREDO-DE-SESSAO")
      .set("Authorization", "Bearer SEGREDO-DE-TOKEN");

    expect(res.text).not.toContain("SEGREDO-DE-SESSAO");
    expect(res.text).not.toContain("SEGREDO-DE-TOKEN");
    expect(Object.keys(res.body)).toEqual(["cabecalhos", "conexao"]);
  });
});
