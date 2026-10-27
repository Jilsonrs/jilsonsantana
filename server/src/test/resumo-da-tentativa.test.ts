import { describe, it, expect, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// A TENTATIVA GUARDADA SÓ PELO RESUMO (etapa 4.7, passo 6b — revisão de segurança do passo 5,
// 21/10/2026). A tentativa abre a conta; o que estes testes protegem:
//   - a MIGRATION troca a tentativa em claro de uma ficha antiga pelo SHA-256 dela — e rodar de
//     novo não resume o resumo;
//   - a tela de depois do pagamento continua achando a ficha pela tentativa (que o navegador tem);
//   - a tentativa em claro guardada (uma ficha de antes do 6b que a migration não tivesse trocado)
//     não abre nada: a busca é sempre pelo resumo.

const S = `${Date.now()}`;
const sha256 = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");
const MIGRATION = readFileSync(fileURLToPath(new URL("../../prisma/migrations/20261027130000_resumo_da_tentativa/migration.sql", import.meta.url)), "utf8");

afterAll(async () => {
  await prisma.guestCheckout.deleteMany({ where: { id: { startsWith: `ficha-resumo-${S}` } } });
});

const fichaComTentativa = (k: string, tentativa: string) =>
  prisma.guestCheckout.create({ data: { id: `ficha-resumo-${S}-${k}`, email: `resumo-${k}-${S}@teste.local`, stripeCustomerId: `cus_resumo_${S}_${k}`, livemode: false, tentativa } });

describe("a migration do resumo da tentativa", () => {
  it("troca a tentativa em claro pelo SHA-256 dela, e rodar de novo não muda o resumo", async () => {
    const tentativa = `Tentativa_em-claro_${S}`.slice(0, 32);
    const antiga = await fichaComTentativa("antiga", tentativa);
    await prisma.$executeRawUnsafe(MIGRATION);
    const depois = await prisma.guestCheckout.findUniqueOrThrow({ where: { id: antiga.id }, select: { tentativa: true } });
    expect(depois.tentativa).toBe(sha256(tentativa));

    await prisma.$executeRawUnsafe(MIGRATION);
    const deNovo = await prisma.guestCheckout.findUniqueOrThrow({ where: { id: antiga.id }, select: { tentativa: true } });
    expect(deNovo.tentativa).toBe(sha256(tentativa));
  });
});

describe("a busca é sempre pelo resumo", () => {
  const confirmar = (tentativa: string) => request(servidor).post("/api/billing/visitante/confirmacao").set("x-forwarded-for", "198.51.100.171").send({ tentativa });

  it("a ficha guardada com a tentativa EM CLARO não é achada pela tentativa", async () => {
    const tentativa = `em-claro-${S}-abcdefghijklmnopq`.slice(0, 32);
    const conta = await prisma.user.create({ data: { id: `conta-resumo-${S}`, email: `conta-resumo-${S}@teste.local` } });
    try {
      await prisma.subscription.create({ data: { ownerUserId: conta.id, status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), stripeSubscriptionId: `sub_resumo_${S}` } });
      const ficha = await fichaComTentativa("em-claro", tentativa);
      await prisma.guestCheckout.update({ where: { id: ficha.id }, data: { userId: conta.id } });
      expect((await confirmar(tentativa)).body).toEqual({ confirmada: false });

      // Com o resumo no lugar, a MESMA tentativa confirma.
      await prisma.guestCheckout.update({ where: { id: ficha.id }, data: { tentativa: sha256(tentativa) } });
      expect((await confirmar(tentativa)).body).toEqual({ confirmada: true });
    } finally {
      await prisma.user.delete({ where: { id: conta.id } });
    }
  });
});
