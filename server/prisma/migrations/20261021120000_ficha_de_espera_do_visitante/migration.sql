-- A FICHA DE ESPERA DO VISITANTE (Fase 4, etapa 4.7, passo 4 — 21/10/2026): quem assina sem conta
-- deixa o e-mail ligado a UM cliente da Stripe; a conta nasce quando o pagamento passa.

-- CreateTable
CREATE TABLE "guest_checkout" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "tentativa" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_checkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_checkout_email_key" ON "guest_checkout"("email");

-- CreateIndex
CREATE UNIQUE INDEX "guest_checkout_stripeCustomerId_key" ON "guest_checkout"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_checkout_tentativa_key" ON "guest_checkout"("tentativa");

-- CreateIndex
CREATE UNIQUE INDEX "guest_checkout_userId_key" ON "guest_checkout"("userId");

-- AddForeignKey
ALTER TABLE "guest_checkout" ADD CONSTRAINT "guest_checkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em public, na mesma migration.
ALTER TABLE "public"."guest_checkout" ENABLE ROW LEVEL SECURITY;
