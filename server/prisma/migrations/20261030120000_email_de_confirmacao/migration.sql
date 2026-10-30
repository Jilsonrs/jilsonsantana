-- O E-MAIL DE CONFIRMAÇÃO de quem assina logado (Fase 4, etapa 4.9b, E18 — decisão do operador P127; texto aprovado em
-- 30/10/2026): "sua assinatura está confirmada", uma vez por assinatura, pela mesma marca dos e-mails da cobrança. Só um
-- valor novo no tipo dos e-mails da assinatura; nenhuma tabela nova (o RLS da `subscription_email` já está na migration
-- que a criou).

-- AlterEnum
ALTER TYPE "SubscriptionEmailKind" ADD VALUE 'CONFIRMADA';
