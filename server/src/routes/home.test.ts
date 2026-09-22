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

  it("as duas versões declaram o favicon", async () => {
    // O template do servidor não herda nada do index.html do React: o que não
    // estiver escrito aqui simplesmente não existe na página pública.
    for (const rota of ["/", "/en"]) {
      const res = await request(app).get(rota);
      expect(res.text, rota).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
    }
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

// Um trecho por seção, tirado do dicionário em português. Se algum deles voltar
// a ser literal no template, ele aparece na página /en — que é justamente o
// defeito que este teste existe para pegar. Inclui um rótulo de acessibilidade,
// que o olho não vê mas o leitor de tela lê.
const TRECHOS_PT = [
  "Navegação Principal",
  "A IA está redefinindo o mundo",
  "Atualize-se continuamente",
  "Um certificado por trilha",
  "conhece o curso que você está fazendo",
  "Vou te guiar para que você",
  "muito acima de qualquer expectativa",
  "Sem fidelidade e sem multa",
  "profissionais de negócios",
  "Todos os direitos reservados",
];

describe("Home — nenhum texto fica cravado no template", () => {
  it("a home em português mostra todos os trechos (o dicionário está ligado)", async () => {
    const res = await request(app).get("/");

    for (const trecho of TRECHOS_PT) {
      expect(res.text, `faltou em /: ${trecho}`).toContain(trecho);
    }
  });

  it("a home em inglês NÃO vaza nenhum deles", async () => {
    const res = await request(app).get("/en");

    for (const trecho of TRECHOS_PT) {
      expect(res.text, `vazou em /en: ${trecho}`).not.toContain(trecho);
    }
  });
});
