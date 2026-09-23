-- Sobrescrita de texto do site + o enum de idioma da escola.
--
-- ESCRITA À MÃO, não gerada por `prisma migrate dev`. Motivo, para o próximo
-- que for criar uma migration aqui: o `migrate dev` valida o histórico
-- replicando-o num SHADOW DATABASE, e a migration
-- `20260824214838_rls_prisma_migrations_table` faz
-- `ALTER TABLE public._prisma_migrations` — tabela que o shadow NÃO tem. O
-- comando falha com P1014 antes de gerar qualquer SQL. `migrate deploy` (o que
-- a produção usa) e `migrate reset` (o que a suíte de teste usa) não usam
-- shadow e aplicam esta migration normalmente.

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('PT', 'EN');

-- CreateTable
CREATE TABLE "site_text" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_text_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_text_key_language_key" ON "site_text"("key", "language");

-- RLS (convenção não-negociável do CLAUDE.md: toda tabela nova em `public`,
-- na MESMA migration que a cria).
ALTER TABLE "public"."site_text" ENABLE ROW LEVEL SECURITY;
