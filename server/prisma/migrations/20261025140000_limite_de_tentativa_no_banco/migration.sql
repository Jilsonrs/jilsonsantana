-- O LIMITE DE TENTATIVAS CONTANDO NO BANCO (25/10/2026 — o servidor passa a ter até 3 cópias no
-- Cloud Run): na memória, cada cópia contava sozinha, e quem testasse cartão teria 3 vezes as
-- tentativas. Uma linha por chave (o limitador + quem pediu): a contagem da janela e quando ela zera,
-- COM FUSO (`timestamptz`), para comparar com `now()` igual em qualquer banco.

-- CreateTable
CREATE TABLE "limite_de_tentativa" (
    "chave" TEXT NOT NULL,
    "contagem" INTEGER NOT NULL,
    "zera_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "limite_de_tentativa_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "limite_de_tentativa_zera_em_idx" ON "limite_de_tentativa"("zera_em");

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em `public`, na mesma migration.
ALTER TABLE public.limite_de_tentativa ENABLE ROW LEVEL SECURITY;
