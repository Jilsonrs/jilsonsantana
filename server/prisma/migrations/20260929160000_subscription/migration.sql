-- A ASSINATURA (etapa 4 do Bloco U, plano aprovado pelo operador em 29/09/2026):
-- o espelho local da Subscription da Stripe, que o gate de acesso lê. Adiantada
-- da Fase 4, ainda sem Stripe. Sem coluna de idioma (idioma é filtro, não portão).
CREATE TABLE "subscription" (
    "id" SERIAL NOT NULL,
    "ownerUserId" TEXT,
    "organizationId" INTEGER,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId");

CREATE INDEX "subscription_ownerUserId_idx" ON "subscription"("ownerUserId");

ALTER TABLE "subscription" ADD CONSTRAINT "subscription_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convenção do CLAUDE.md: toda tabela nova em `public` nasce com RLS, na mesma migration.
ALTER TABLE public."subscription" ENABLE ROW LEVEL SECURITY;
