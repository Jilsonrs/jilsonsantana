import { describe, it, expect } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { cabecalhosDeSeguranca } from "../lib/cabecalhos-de-seguranca.js";

// OS CABEÇALHOS DE SEGURANÇA DE TODA RESPOSTA (`lib/cabecalhos-de-seguranca.ts`). O que protegem:
// - a janela da escola isolada de quem a abre (achado P1 da revisão de segurança do Bloco AULA, etapa 6, 07/10/2026):
//   `Cross-Origin-Opener-Policy` — um site de terceiros que abre a escola numa janela perde a referência a ela;
// - a escola não se deixa emoldurar (E10 da revisão ampla da cobrança, 29/10/2026): um site qualquer não põe a
//   `/assinar` numa moldura para a pessoa clicar sem ver;
// - só https em produção (E10): o navegador que já visitou a escola nunca mais tenta o endereço sem https.

describe("os cabeçalhos de segurança", () => {
  it("na página (a home) e na API: a janela isolada, e só a própria escola emoldura — sem o \"só https\" fora de produção", async () => {
    for (const caminho of ["/", "/api/health"]) {
      const res = await request(servidor).get(caminho);
      expect(res.status, caminho).toBe(200);
      expect(res.headers["cross-origin-opener-policy"], caminho).toBe("same-origin-allow-popups");
      expect(res.headers["content-security-policy"], caminho).toBe("frame-ancestors 'self'");
      expect(res.headers["x-frame-options"], caminho).toBe("SAMEORIGIN");
      expect(res.headers["strict-transport-security"], caminho).toBeUndefined();
    }
  });

  it("em produção, também o \"só https\": 1 ano, sem os subdomínios (o que mora neles não é deste servidor)", () => {
    expect(cabecalhosDeSeguranca(true)).toMatchObject({ "Strict-Transport-Security": "max-age=31536000", "Content-Security-Policy": "frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN" });
    expect(cabecalhosDeSeguranca(false)).not.toHaveProperty("Strict-Transport-Security");
  });
});
