import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

// Testa o app REAL (nada de dublê de Prisma): o que importa aqui é que a rota
// esteja registrada, que o HTML venha inteiro na primeira resposta e que as
// duas versões de idioma se apontem uma para a outra.
describe("Home pública (SSR)", () => {
  it("GET / responde HTML em português, completo na primeira resposta", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain('<html lang="pt-BR"');
    expect(res.text).toContain("Torne-se um");
    // o conteúdo está no HTML cru, não num bundle de JS
    expect(res.text).toContain("Agentic AI na Prática");
    expect(res.text).not.toContain('<div id="root"></div>');
  });

  it("GET /en responde HTML em inglês", async () => {
    const res = await request(app).get("/en");

    expect(res.status).toBe(200);
    expect(res.text).toContain('<html lang="en"');
  });

  it("as duas versões declaram canonical e hreflang recíprocos", async () => {
    const pt = await request(app).get("/");
    const en = await request(app).get("/en");

    expect(pt.text).toMatch(/<link rel="canonical" href="[^"]+">/);
    expect(pt.text).toContain('hreflang="en"');
    expect(en.text).toContain('hreflang="pt-BR"');
  });

  it("sem curso em inglês, a home /en não quebra e não mostra card de curso", async () => {
    const res = await request(app).get("/en");

    expect(res.status).toBe(200);
    expect(res.text).not.toContain("Agentic AI na Prática");
  });
});
