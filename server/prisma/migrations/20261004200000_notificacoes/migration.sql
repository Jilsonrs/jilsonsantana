-- As MENSAGENS do curso e o SINO de notificações (Bloco E, etapa 4 — decisões do
-- operador, 04/10/2026). SQL gerado pelo próprio Prisma (migrate diff), mais o
-- CHECK e a RLS escritos à mão. Só ACRESCENTA: duas colunas opcionais no curso,
-- um enum e uma tabela. Nada do que já existe muda.
-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('BOAS_VINDAS', 'PARABENS');

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "congratsMessage" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "courseId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_courseId_idx" ON "notification"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_userId_courseId_kind_key" ON "notification"("userId", "courseId", "kind");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CheckConstraint (à mão — o Prisma não gera CHECK): as mensagens do curso têm
-- curso. Hoje são os dois únicos tipos; anúncio (outro bloco) pode não ter.
ALTER TABLE "notification" ADD CONSTRAINT "notification_mensagem_tem_curso" CHECK (
  "kind" NOT IN ('BOAS_VINDAS', 'PARABENS') OR "courseId" IS NOT NULL
);

-- RLS (convenção do CLAUDE.md): toda tabela nova em public, na mesma migration.
ALTER TABLE public."notification" ENABLE ROW LEVEL SECURITY;
