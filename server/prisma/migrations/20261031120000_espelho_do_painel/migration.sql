-- O PAINEL DA COBRANÇA (etapa 4.7b, passo 1a — 31/10/2026): o espelho guarda também o plano, a data
-- marcada para acabar e o código promocional, para a lista do admin. Só colunas novas e vazias: nenhuma
-- linha muda, e o gate não lê nenhuma delas. A tabela já tem RLS (desde a etapa 4.1).

-- CreateEnum
CREATE TYPE "PlanoDaAssinatura" AS ENUM ('mensal', 'anual');

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "plan" "PlanoDaAssinatura",
ADD COLUMN     "promotionCode" TEXT;
