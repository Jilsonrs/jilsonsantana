-- OS AVISOS DA STRIPE JÁ PROCESSADOS (Fase 4, etapa 4.1 — 09/10/2026): o aviso repetido não faz nada.

-- CreateTable
CREATE TABLE "stripe_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_event_pkey" PRIMARY KEY ("id")
);


-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em public, na mesma migration.
ALTER TABLE "public"."stripe_event" ENABLE ROW LEVEL SECURITY;
