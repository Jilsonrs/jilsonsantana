import { describe, it, expect } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";

describe("GET /api/diagnostico-ip", () => {
  it("responde 200 e devolve null quando os cabeçalhos não são enviados", async () => {
    const res = await request(servidor).get("/api/diagnostico-ip");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      "x-forwarded-for": null,
      "x-real-ip": null,
      forwarded: null,
    });
  });

  it("devolve os cabeçalhos de endereço recebidos", async () => {
    const res = await request(servidor)
      .get("/api/diagnostico-ip")
      .set("x-forwarded-for", "203.0.113.195")
      .set("x-real-ip", "198.51.100.1")
      .set("forwarded", "for=203.0.113.195;proto=https");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      "x-forwarded-for": "203.0.113.195",
      "x-real-ip": "198.51.100.1",
      forwarded: "for=203.0.113.195;proto=https",
    });
  });

  it("não vaza cookies nem outros cabeçalhos sensíveis", async () => {
    const res = await request(servidor)
      .get("/api/diagnostico-ip")
      .set("Cookie", "session=segredo123")
      .set("Authorization", "Bearer token-secreto");

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(["x-forwarded-for", "x-real-ip", "forwarded"]);
    expect(res.body).not.toHaveProperty("cookie");
    expect(res.body).not.toHaveProperty("authorization");
  });
});
