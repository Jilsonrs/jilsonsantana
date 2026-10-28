-- OS E-MAILS DA COBRANÇA (Fase 4, etapa 4.7, passo 7 — 28/10/2026): a marca de que cada e-mail da
-- cobrança (a falha, o aviso antes de trancar, a assinatura cancelada) foi tomado para sair — uma vez.

-- CreateEnum
CREATE TYPE "SubscriptionEmailKind" AS ENUM ('COBRANCA_FALHOU', 'ANTES_DE_TRANCAR', 'CANCELADA');

-- CreateTable
CREATE TABLE "subscription_email" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "kind" "SubscriptionEmailKind" NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_email_subscriptionId_kind_reference_key" ON "subscription_email"("subscriptionId", "kind", "reference");

-- AddForeignKey
ALTER TABLE "subscription_email" ADD CONSTRAINT "subscription_email_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em public, na mesma migration.
ALTER TABLE "public"."subscription_email" ENABLE ROW LEVEL SECURITY;
