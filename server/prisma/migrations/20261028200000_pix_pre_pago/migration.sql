-- O PIX PRÉ-PAGO (Fase 4, etapa 4.9 — 28/10/2026): a assinatura que nasce de um pagamento Pix solto
-- guarda o id dele; um Pix vira UMA assinatura. Só uma coluna numa tabela que já tem RLS.

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN "pixPaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_pixPaymentIntentId_key" ON "subscription"("pixPaymentIntentId");
