-- PAGA POR FORA (etapa 4.7b, passo 4d — 31/10/2026, decisão do operador P120: "Liberar acesso pago por fora"): a assinatura
-- pré-paga que o operador liberou, sem Pix. Só acrescenta: nenhuma linha que já existe muda (o padrão é falso).

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "paidOutOfBand" BOOLEAN NOT NULL DEFAULT false;
