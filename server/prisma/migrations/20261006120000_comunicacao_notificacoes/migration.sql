-- COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1 — decisões do operador, 06/10/2026): o aviso
-- que o operador escreve, para todo mundo com conta ou para os alunos de um curso,
-- e o registro de quem já começou cada curso. SQL gerado pelo próprio Prisma
-- (migrate diff), mais o CHECK, o preenchimento e a RLS escritos à mão. Só
-- ACRESCENTA: um valor de enum, um enum, uma coluna opcional e duas tabelas.
-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('TODOS', 'CURSO');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'AVISO';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "announcementId" INTEGER;

-- CreateTable
CREATE TABLE "announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'TODOS',
    "courseId" INTEGER,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_start" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_start_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_courseId_idx" ON "announcement"("courseId");

-- CreateIndex
CREATE INDEX "course_start_courseId_idx" ON "course_start"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_start_userId_courseId_key" ON "course_start"("userId", "courseId");

-- CreateIndex
CREATE INDEX "notification_announcementId_idx" ON "notification"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_userId_announcementId_key" ON "notification"("userId", "announcementId");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_start" ADD CONSTRAINT "course_start_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_start" ADD CONSTRAINT "course_start_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CheckConstraint (à mão — o Prisma não gera CHECK): notificação de AVISO aponta
-- para o aviso de onde veio, e só ela. Compara como TEXTO: o valor 'AVISO' acabou
-- de entrar no enum e não pode ser usado como enum na mesma transação.
ALTER TABLE "notification" ADD CONSTRAINT "notification_aviso_tem_anuncio" CHECK (
  ("kind"::text = 'AVISO') = ("announcementId" IS NOT NULL)
);

-- Quem já começou cada curso ANTES desta migration (à mão): quem recebeu a
-- boas-vindas (abriu uma aula com acesso) ou concluiu alguma aula dele. A data é a
-- mais antiga das duas.
INSERT INTO "course_start" ("userId", "courseId", "startedAt")
SELECT "userId", "courseId", MIN("quando")
FROM (
  SELECT n."userId", n."courseId", n."createdAt" AS "quando"
    FROM "notification" n
   WHERE n."kind" = 'BOAS_VINDAS' AND n."courseId" IS NOT NULL
  UNION ALL
  SELECT lp."userId", m."courseId", lp."createdAt"
    FROM "lesson_progress" lp
    JOIN "lesson" l ON l."id" = lp."lessonId"
    JOIN "module" m ON m."id" = l."moduleId"
) origem
GROUP BY "userId", "courseId"
ON CONFLICT ("userId", "courseId") DO NOTHING;

-- RLS (convenção do CLAUDE.md): toda tabela nova em public, na mesma migration.
ALTER TABLE public."announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."course_start" ENABLE ROW LEVEL SECURITY;
