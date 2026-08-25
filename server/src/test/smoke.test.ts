import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { Role } from "@jilson/core";

// Testes de FUMAÇA do encanamento — provam que a infraestrutura de teste de
// servidor existe e funciona. NÃO são a cobertura de negócio: a matriz completa
// 401/403/200, os casos de webhook e o "público não vaza DRAFT" são checkboxes
// da Fase 4, colados ao handler que protegem.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Faltou ${name} no .env.test`);
  return value;
}

describe("encanamento da suíte de servidor", () => {
  it("sobe o app e responde numa rota pública", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("recusa /api/me sem sessão", async () => {
    const res = await request(app).get("/api/me");

    // Falha se `requireAuth` sair de me.ts — é o alvo de mutação desta suíte.
    expect(res.status).toBe(401);
  });

  it("autentica o admin semeado e devolve a sessão em /api/me", async () => {
    // Este é o teste que prova a ORDEM do globalSetup: `migrate reset` apaga os
    // usuários, então o admin só existe aqui se o seed rodou DEPOIS do reset.
    // Se a ordem inverter, isto falha — que é exatamente o ponto.
    const signIn = await request(app)
      .post("/api/auth/sign-in/email")
      .send({
        email: requireEnv("SEED_ADMIN_EMAIL"),
        password: requireEnv("SEED_ADMIN_PASSWORD"),
      });

    expect(signIn.status).toBe(200);

    // supertest tipa `headers` de forma frouxa; set-cookie é sempre string[] aqui.
    const cookies = signIn.headers["set-cookie"] as unknown as string[] | undefined;
    expect(cookies, "sign-in deveria emitir cookie de sessão").toBeDefined();

    // Linha criada não prova sessão utilizável — só uma request autenticada prova.
    const me = await request(app).get("/api/me").set("Cookie", cookies ?? []);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(requireEnv("SEED_ADMIN_EMAIL"));
    expect(me.body.user.role).toBe(Role.ADMIN);
  });
});
