-- ASSINATURA DE VERDADE OU DO MODO DE TESTE DA STRIPE (Fase 4, etapa 4.1 — 09/10/2026): no GO-LIVE,
-- as de teste saem do banco de produção (Fase 7). Sem saber, falso.

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "livemode" BOOLEAN NOT NULL DEFAULT false;

