-- A CORREÇÃO DO E-MAIL pedida pelo admin (etapa 4.7b, passo 3c — 31/10/2026, decisão do operador P121): o pedido à
-- espera do código que foi ao e-mail novo. Só acrescenta: nenhuma linha que já existe muda.

-- CreateTable
CREATE TABLE "email_correction" (
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_correction_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "email_correction" ADD CONSTRAINT "email_correction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em `public`, na mesma migration.
ALTER TABLE public.email_correction ENABLE ROW LEVEL SECURITY;
