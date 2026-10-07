import { describe, it, expect } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";

// A JANELA DA ESCOLA ISOLADA DE QUEM A ABRE (achado P1 da revisão de segurança do Bloco
// AULA, etapa 6, 07/10/2026): `Cross-Origin-Opener-Policy` em toda resposta. Um site de
// terceiros que abre a escola numa janela perde a referência a ela; as janelas que a
// escola abrir continuam funcionando (`same-origin-allow-popups`).

describe("a janela da escola isolada", () => {
  it("na página (a home) e na API", async () => {
    const pagina = await request(servidor).get("/");
    expect(pagina.status).toBe(200);
    expect(pagina.headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");

    const api = await request(servidor).get("/api/health");
    expect(api.headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
  });
});
