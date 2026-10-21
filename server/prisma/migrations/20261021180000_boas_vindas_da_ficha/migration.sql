-- O E-MAIL DE BOAS-VINDAS DA FICHA DE ESPERA (Fase 4, etapa 4.7, passo 5 — 21/10/2026): quando ele foi
-- tomado para sair, para sair UMA vez. A tabela já tem RLS (migration da ficha, passo 4).

-- AlterTable
ALTER TABLE "guest_checkout" ADD COLUMN     "boasVindasEnviadaEm" TIMESTAMP(3);
