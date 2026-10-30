import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/prisma.js";

// A MIGRATION DO PASSO 9 (etapa 4.7 — quem não terminou de assinar, e a tabela de leads). O que estes testes
// protegem:
//   - AS FICHAS QUE JÁ EXISTEM: a última tentativa passa a ser a última mudança da ficha, e o lembrete fica
//     dado como resolvido — ninguém recebe "você não terminou a assinatura" de uma tentativa de antes da
//     publicação (a limpeza dos 7 dias as alcança normalmente);
//   - a tabela nova `lead` nasce com RLS (CLAUDE.md → Database & Migrations).
// A migration inteira roda do zero no `globalSetup` (o reset aplica todas); aqui roda de novo só o acerto
// das fichas antigas, contra fichas montadas como estavam antes dela.

const S = `${Date.now()}`;
const MIGRATION = readFileSync(fileURLToPath(new URL("../../prisma/migrations/20261030200000_quem_nao_terminou/migration.sql", import.meta.url)), "utf8");
const ACERTO = MIGRATION.split("\n").filter((linha) => linha.startsWith('UPDATE "guest_checkout"'));

afterAll(async () => {
  await prisma.guestCheckout.deleteMany({ where: { id: { startsWith: `ficha-migration-${S}` } } });
});

describe("a migration do passo 9 — as fichas que já existem", () => {
  it("a última tentativa vira a última mudança da ficha, e o lembrete fica resolvido (tomado e confirmado)", async () => {
    expect(ACERTO).toHaveLength(1);
    const antes = new Date("2026-10-20T15:30:00.000Z");
    const ficha = await prisma.guestCheckout.create({ data: { id: `ficha-migration-${S}-antiga`, email: `migration-antiga-${S}@teste.local`, stripeCustomerId: `cus_migration_${S}`, livemode: false } });
    // Como estava antes da migration: a última mudança no passado, e nenhuma marca de lembrete.
    await prisma.$executeRaw`UPDATE "guest_checkout" SET "updatedAt" = ${antes}, "ultimaTentativaEm" = CURRENT_TIMESTAMP, "lembreteTomadoEm" = NULL, "lembreteEnviadoEm" = NULL WHERE "id" = ${ficha.id}`;

    await prisma.$executeRawUnsafe(ACERTO[0] ?? "");

    const depois = await prisma.guestCheckout.findUniqueOrThrow({ where: { id: ficha.id } });
    expect(depois.ultimaTentativaEm.toISOString()).toBe(antes.toISOString());
    expect(depois.lembreteTomadoEm).not.toBeNull();
    expect(depois.lembreteEnviadoEm).not.toBeNull();
    // O acerto não mexe na última mudança (ela é a referência).
    expect(depois.updatedAt.toISOString()).toBe(antes.toISOString());
  });
});

describe("a tabela dos leads", () => {
  it("nasce com RLS", async () => {
    const [tabela] = await prisma.$queryRaw<{ relrowsecurity: boolean }[]>`SELECT relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = 'lead' AND relkind = 'r'`;
    expect(tabela?.relrowsecurity).toBe(true);
  });

  it("um lead por e-mail", async () => {
    const email = `lead-unico-${S}@teste.local`;
    try {
      await prisma.lead.create({ data: { id: `lead-${S}-1`, email, origem: "CAIXA_AO_ASSINAR", consentimentoEm: new Date() } });
      await expect(prisma.lead.create({ data: { id: `lead-${S}-2`, email, origem: "LEMBRETE", consentimentoEm: new Date() } })).rejects.toThrow();
    } finally {
      await prisma.lead.deleteMany({ where: { email } });
    }
  });
});
