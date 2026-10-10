import { describe, it, expect, vi, afterAll } from "vitest";

// O LIMITE DE TENTATIVAS DE LOGIN, LIGADO DE VERDADE (caso 15 da matriz de testes da Fase 4 —
// plano, etapa 4.4). O limite só existe em PRODUÇÃO (`rateLimit.enabled` em `lib/auth.ts`), e
// ligá-lo na suíte inteira faria os testes de login baterem nele. Por isso ESTE arquivo — e só
// ele — carrega o `auth` como em produção, antes de qualquer outro import, e fala com ele
// direto, sem o app: cada arquivo de teste roda no seu próprio processo, então nada daqui chega
// aos outros (a prova é a suíte inteira seguir verde com este arquivo no meio).
// O que protege, por COMPORTAMENTO — o `auth-ip.test.ts` só confere a configuração:
//   - o limite liga e barra: 3 tentativas em 10 s, a 4ª é 429 — e barrado é barrado, nem a
//     senha certa entra;
//   - CADA PESSOA TEM O SEU: o IP vem do `x-real-ip`, que a Railway sobrescreve; sem isso a
//     escola inteira dividiria um limite só, e três erros de um travariam o login de todos
//     (CLAUDE.md → Quality Gates);
//   - o que o visitante consegue escrever (`x-forwarded-for`) não muda de quem é a tentativa.
// `[MEDIDO em 10/10/2026, better-auth do repo]` do mesmo IP: 401, 401, 401, 429, 429.
const ANTES = vi.hoisted(() => {
  const antes = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  return antes;
});

const { auth } = await import("../lib/auth.js");

afterAll(() => {
  process.env.NODE_ENV = ANTES;
});

const ORIGEM = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").origin;
const ALUNO = { email: process.env.SEED_MEMBER_EMAIL ?? "", senha: process.env.SEED_MEMBER_PASSWORD ?? "" };

/** Uma tentativa de login vinda deste IP (o `x-real-ip`, como a Railway entrega). */
async function tentar(ip: string, senha = "senha-errada", extras: Record<string, string> = {}): Promise<number> {
  const headers = { "content-type": "application/json", origin: ORIGEM, "x-real-ip": ip, ...extras };
  const pedido = new Request(`${ORIGEM}/api/auth/sign-in/email`, { method: "POST", headers, body: JSON.stringify({ email: ALUNO.email, password: senha }) });
  return (await auth.handler(pedido)).status;
}

describe("o limite de tentativas de login, ligado", () => {
  it("está ligado quando o servidor roda em produção", () => {
    expect(auth.options.rateLimit?.enabled).toBe(true);
  });

  it("3 tentativas em 10 s; a 4ª é barrada (429) — e barrado é barrado: nem a senha CERTA entra", async () => {
    const ip = "203.0.113.10";
    expect([await tentar(ip), await tentar(ip), await tentar(ip)]).toEqual([401, 401, 401]);
    expect(await tentar(ip)).toBe(429);
    expect(await tentar(ip, ALUNO.senha)).toBe(429);
  });

  it("cada pessoa tem o SEU limite: com um IP barrado, de outro IP a senha certa entra", async () => {
    const barrado = "203.0.113.20";
    for (let i = 0; i < 4; i++) await tentar(barrado);
    expect(await tentar(barrado)).toBe(429);
    expect(await tentar("203.0.113.21", ALUNO.senha)).toBe(200);
  });

  it("o que o visitante escreve não muda de quem é a tentativa: trocar o x-forwarded-for a cada pedido não escapa do limite", async () => {
    const ip = "203.0.113.30";
    const status: number[] = [];
    for (let i = 0; i < 4; i++) status.push(await tentar(ip, "senha-errada", { "x-forwarded-for": `198.51.100.${i + 1}`, "cf-connecting-ip": `198.51.100.${i + 50}` }));
    expect(status).toEqual([401, 401, 401, 429]);
  });
});
