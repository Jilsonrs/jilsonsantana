-- O CLIENTE DA STRIPE DE CADA CONTA (Fase 4, etapa 4.2 — 10/10/2026): uma conta é sempre UM cliente.

-- CreateTable
CREATE TABLE "stripe_customer" (
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_customer_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customer_stripeCustomerId_key" ON "stripe_customer"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "stripe_customer" ADD CONSTRAINT "stripe_customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em public, na mesma migration.
ALTER TABLE "public"."stripe_customer" ENABLE ROW LEVEL SECURITY;
