-- OS EVENTOS DO VÍDEO (Fase 5, Bloco MEDIR, etapa 1 — 09/10/2026): tocou, pausou, terminou.
-- Só guarda; a análise é leitura à parte. Some com a pessoa ou com a aula, nunca com o churn.

-- CreateEnum
CREATE TYPE "LessonEventType" AS ENUM ('PLAY', 'PAUSE', 'ENDED');

-- CreateTable
CREATE TABLE "lesson_event" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "type" "LessonEventType" NOT NULL,
    "positionSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_event_lessonId_createdAt_idx" ON "lesson_event"("lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "lesson_event_userId_lessonId_createdAt_idx" ON "lesson_event"("userId", "lessonId", "createdAt");

-- AddForeignKey
ALTER TABLE "lesson_event" ADD CONSTRAINT "lesson_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_event" ADD CONSTRAINT "lesson_event_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS (CLAUDE.md → Database & Migrations): toda tabela nova em public, na mesma migration.
ALTER TABLE "public"."lesson_event" ENABLE ROW LEVEL SECURITY;
