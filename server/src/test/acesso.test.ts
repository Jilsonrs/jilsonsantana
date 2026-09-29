import { describe, it, expect, afterAll } from "vitest";
import { Role } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { assinaturaDaAcesso, temAcessoAtivo } from "../lib/acesso.js";
import { ASSINATURA_DE_TESTE, podeTerAssinaturaDeTeste } from "../lib/assinatura-de-teste.js";

// A TRAVA DE ACESSO (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026; a regra é a do CLAUDE.md → Membership Gating, decisão de Ago 2026).
// O que estes testes protegem: status vivo OU período pago libera; o primeiro
// pagamento que nunca aconteceu NUNCA libera; a assinatura de outra pessoa não
// vale; ser admin não é assinatura; a assinatura de teste só nasce fora de
// produção.

const AGORA = new Date("2026-09-29T12:00:00Z");
const FUTURO = new Date("2026-10-29T12:00:00Z");
const PASSADO = new Date("2026-08-29T12:00:00Z");

describe("a regra do gate", () => {
  const casos: [string, string, Date | null, boolean][] = [
    ["active", "active", PASSADO, true],
    ["trialing", "trialing", null, true],
    ["past_due mantém o acesso (janela de novas tentativas)", "past_due", PASSADO, true],
    ["canceled com o período ainda pago", "canceled", FUTURO, true],
    ["canceled com o período vencido", "canceled", PASSADO, false],
    ["paused com o período pago", "paused", FUTURO, true],
    ["unpaid vencido", "unpaid", PASSADO, false],
    ["status que a Stripe ainda nem inventou, com período pago", "status_novo", FUTURO, true],
    ["status desconhecido sem período", "status_novo", null, false],
    ["incomplete, mesmo com período no futuro", "incomplete", FUTURO, false],
    ["incomplete_expired, mesmo com período no futuro", "incomplete_expired", FUTURO, false],
  ];
  for (const [nome, status, fim, esperado] of casos) {
    it(`${nome}: ${esperado ? "libera" : "bloqueia"}`, () => {
      expect(assinaturaDaAcesso({ status, currentPeriodEnd: fim }, AGORA)).toBe(esperado);
    });
  }
});

describe("temAcessoAtivo, lendo o banco", () => {
  const S = `acesso-${Date.now()}`;
  let n = 0;

  async function pessoa(role: string = Role.MEMBER) {
    n += 1;
    return prisma.user.create({ data: { id: `${S}-${n}`, email: `${S}-${n}@teste.local`, role } });
  }
  async function assinatura(ownerUserId: string, status: string, currentPeriodEnd: Date | null) {
    n += 1;
    return prisma.subscription.create({
      data: { ownerUserId, status, currentPeriodEnd, stripeSubscriptionId: `${S}-sub-${n}` },
    });
  }
  const daquiA = (dias: number) => new Date(Date.now() + dias * 86_400_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { startsWith: S } } });
  });

  it("sem assinatura: não", async () => {
    const p = await pessoa();
    expect(await temAcessoAtivo(p.id)).toBe(false);
  });

  it("com assinatura ativa: sim", async () => {
    const p = await pessoa();
    await assinatura(p.id, "active", daquiA(30));
    expect(await temAcessoAtivo(p.id)).toBe(true);
  });

  it("uma cancelada e vencida não esconde outra ativa", async () => {
    const p = await pessoa();
    await assinatura(p.id, "canceled", daquiA(-30));
    await assinatura(p.id, "active", daquiA(30));
    expect(await temAcessoAtivo(p.id)).toBe(true);
  });

  it("a assinatura de OUTRA pessoa não vale", async () => {
    const dona = await pessoa();
    const outra = await pessoa();
    await assinatura(dona.id, "active", daquiA(30));
    expect(await temAcessoAtivo(outra.id)).toBe(false);
  });

  // O admin assiste por rota de ADMIN; aqui ele é uma pessoa sem assinatura
  // (decisão do operador, 29/09/2026: a trava do aluno tem um caminho só).
  it("ser admin não é assinatura", async () => {
    const admin = await pessoa(Role.ADMIN);
    expect(await temAcessoAtivo(admin.id)).toBe(false);
  });

  // Achado da revisão de segurança (29/09): no Prisma, `undefined` num filtro é
  // "sem filtro". Chamada sem pessoa tem que FECHAR, mesmo com assinatura ativa
  // de outra pessoa no banco.
  it("chamada sem pessoa: não (fecha na dúvida)", async () => {
    const dona = await pessoa();
    await assinatura(dona.id, "active", daquiA(30));
    // Cast: simula um chamador futuro que perdeu o id (o tipo impede hoje).
    expect(await temAcessoAtivo(undefined as unknown as string)).toBe(false);
    expect(await temAcessoAtivo("")).toBe(false);
  });

  it("incomplete com período no futuro: não", async () => {
    const p = await pessoa();
    await assinatura(p.id, "incomplete", daquiA(30));
    expect(await temAcessoAtivo(p.id)).toBe(false);
  });

  it("o seed deu ao member@ a assinatura de teste (banco local)", async () => {
    const member = await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL } });
    const deTeste = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE } });
    expect(deTeste?.ownerUserId).toBe(member.id);
    expect(await temAcessoAtivo(member.id)).toBe(true);
  });
});

describe("onde a assinatura de teste pode nascer", () => {
  it.each([
    "postgresql://u:p@localhost:5432/jilsonsantana_test",
    "postgresql://u:p@127.0.0.1:5432/x",
    "postgresql://u:p@[::1]:5432/x",
    "postgresql://u:p@ep-lingering-morning-aehqd81z-pooler.c-2.us-east-2.aws.neon.tech/neondb",
    "postgresql://u:p@ep-lingering-morning-aehqd81z.c-2.us-east-2.aws.neon.tech/neondb",
  ])("sim: %s", (url) => {
    expect(podeTerAssinaturaDeTeste(url)).toBe(true);
  });

  it.each([
    // o endpoint de PRODUÇÃO
    "postgresql://u:p@ep-still-breeze-aebrui0f-pooler.c-2.us-east-2.aws.neon.tech/neondb",
    // "localhost" só no texto, não no host
    "postgresql://u:p@evil.com:5432/localhost",
    // o id do branch dev como prefixo de outro host
    "postgresql://u:p@ep-lingering-morning-aehqd81z-evil.com/x",
    "não é url",
    undefined,
  ])("não: %s", (url) => {
    expect(podeTerAssinaturaDeTeste(url)).toBe(false);
  });
});
