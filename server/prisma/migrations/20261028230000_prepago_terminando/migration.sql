-- O E-MAIL DO PRÉ-PAGO (Fase 4, etapa 4.9, passo 4 — decisão do operador, 28/10/2026): "seu acesso está
-- acabando", 3 dias antes do fim da assinatura paga com Pix. Só um valor novo no tipo dos e-mails da
-- assinatura; nenhuma tabela nova (o RLS da `subscription_email` já está na migration que a criou).

-- AlterEnum
ALTER TYPE "SubscriptionEmailKind" ADD VALUE 'PREPAGO_TERMINANDO';
