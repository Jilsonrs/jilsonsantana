-- QUEM NÃO TERMINOU DE ASSINAR, E A TABELA DE LEADS (Fase 4, etapa 4.7, passo 9 — decisões do operador,
-- 29/10/2026; plano aprovado em 30/10/2026). A ficha de espera passa a guardar o que a ÚLTIMA tentativa
-- deixou (o nome, a caixa de novidades, a origem) e quando ela foi feita — é daqui que saem o lembrete
-- (2 horas depois), o lead e a limpeza (7 dias depois). E nasce a tabela dos leads: nome e e-mail, nunca
-- o CPF.

-- CreateEnum
CREATE TYPE "OrigemDoLead" AS ENUM ('CAIXA_AO_ASSINAR', 'LEMBRETE');

-- AlterTable
ALTER TABLE "guest_checkout" ADD COLUMN     "acquisitionCampaign" TEXT,
ADD COLUMN     "acquisitionSource" TEXT,
ADD COLUMN     "lembreteEnviadoEm" TIMESTAMP(3),
ADD COLUMN     "lembreteTomadoEm" TIMESTAMP(3),
ADD COLUMN     "naoApagadaEm" TIMESTAMP(3),
ADD COLUMN     "nome" TEXT,
ADD COLUMN     "novidades" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimaTentativaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AS FICHAS QUE JÁ EXISTEM: a última tentativa é a última mudança da ficha (cada tentativa nova a muda), e
-- o lembrete fica dado como resolvido — ninguém recebe lembrete de uma tentativa de antes desta
-- publicação. A limpeza dos 7 dias as alcança normalmente.
UPDATE "guest_checkout" SET "ultimaTentativaEm" = "updatedAt", "lembreteTomadoEm" = CURRENT_TIMESTAMP, "lembreteEnviadoEm" = CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "origem" "OrigemDoLead" NOT NULL,
    "consentimentoEm" TIMESTAMP(3) NOT NULL,
    "confirmadoEm" TIMESTAMP(3),
    "descadastradoEm" TIMESTAMP(3),
    "acquisitionSource" TEXT,
    "acquisitionCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_email_key" ON "lead"("email");

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em public, na mesma migration.
ALTER TABLE "public"."lead" ENABLE ROW LEVEL SECURITY;
