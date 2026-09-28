-- Os arquivos para baixar de cada aula (Bloco E, etapa 2, parte 2e — plano
-- aprovado pelo operador em 28/09/2026). SQL gerado pelo próprio Prisma
-- (migrate diff), mais a RLS que o CLAUDE.md exige em toda tabela nova do public.
-- CreateTable
CREATE TABLE "lesson_file" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_file_storagePath_key" ON "lesson_file"("storagePath");

-- CreateIndex
CREATE INDEX "lesson_file_lessonId_idx" ON "lesson_file"("lessonId");

-- AddForeignKey
ALTER TABLE "lesson_file" ADD CONSTRAINT "lesson_file_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS (CLAUDE.md → Database): nenhuma política; o Prisma conecta como dono.
ALTER TABLE public."lesson_file" ENABLE ROW LEVEL SECURITY;
