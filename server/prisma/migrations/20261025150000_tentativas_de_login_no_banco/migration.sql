-- AS TENTATIVAS DE LOGIN CONTANDO NO BANCO (25/10/2026 — o servidor passa a ter até 3 cópias no
-- Cloud Run): a tabela do limite do próprio Better Auth (`rateLimit.storage: "database"`). Na
-- memória, cada cópia contaria sozinha, e quem tenta adivinhar uma senha teria 3 vezes as tentativas.

-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em `public`, na mesma migration.
ALTER TABLE public."rateLimit" ENABLE ROW LEVEL SECURITY;
