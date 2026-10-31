-- OS CASOS DA COBRANÇA — "PRECISA DE VOCÊ" (etapa 4.7b, bloco 2 — 31/10/2026): cada situação que precisa do operador
-- vira um caso, um por situação. Tabela nova, sem chave estrangeira (de propósito: ver o `schema.prisma`).

-- CreateEnum
CREATE TYPE "TipoDeCaso" AS ENUM ('PIX_EM_CONFERENCIA', 'PAGO_SEM_ASSINATURA', 'PAGOU_SEM_CONTA', 'DIVERGENCIA', 'ATIVA_SEM_PERIODO_PAGO', 'COBRANCA_EM_ABERTO', 'DEVOLUCAO_FALHOU', 'TROCA_DE_PLANO', 'CONTESTACAO', 'AVISO_DE_FRAUDE', 'EMAIL_NAO_SAIU', 'PEDIDO_DE_REEMBOLSO');

-- CreateTable
CREATE TABLE "billing_case" (
    "id" SERIAL NOT NULL,
    "kind" "TipoDeCaso" NOT NULL,
    "key" TEXT NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeObjectId" TEXT,
    "amount" INTEGER,
    "detail" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedBy" "QuemFez",
    "closedByUserId" TEXT,
    "note" TEXT,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "billing_case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_case_open_openedAt_idx" ON "billing_case"("open", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_case_kind_key_key" ON "billing_case"("kind", "key");

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em `public`, na mesma migration.
ALTER TABLE public.billing_case ENABLE ROW LEVEL SECURITY;
