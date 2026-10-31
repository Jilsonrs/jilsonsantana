-- O REGISTRO DA COBRANÇA (etapa 4.7b, passo 1f — 31/10/2026): tudo o que aconteceu na cobrança, de quem fez. E o
-- motivo de cancelamento no espelho, para o painel contar. Só acrescenta: nenhuma linha que já existe muda.

-- CreateEnum
CREATE TYPE "QuemFez" AS ENUM ('STRIPE', 'OPERADOR', 'ALUNO', 'RODADA', 'JILSONAI');

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "cancelReason" TEXT;

-- CreateTable
CREATE TABLE "billing_log" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "who" "QuemFez" NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "stripeEventId" TEXT,
    "userId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "amount" INTEGER,
    "detail" TEXT,

    CONSTRAINT "billing_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_log_stripeEventId_key" ON "billing_log"("stripeEventId");

-- CreateIndex
CREATE INDEX "billing_log_userId_createdAt_idx" ON "billing_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_log_stripeSubscriptionId_createdAt_idx" ON "billing_log"("stripeSubscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_log_createdAt_idx" ON "billing_log"("createdAt");

-- AddForeignKey
ALTER TABLE "billing_log" ADD CONSTRAINT "billing_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em `public`, na mesma migration.
ALTER TABLE public.billing_log ENABLE ROW LEVEL SECURITY;
