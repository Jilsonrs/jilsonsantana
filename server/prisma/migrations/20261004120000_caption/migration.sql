-- A legenda de cada aula e da apresentação do curso (passo Legendas do editor —
-- decisões do operador, 04/10/2026). SQL gerado pelo próprio Prisma (migrate
-- diff), mais o CHECK e a RLS escritos à mão. Só ACRESCENTA uma tabela.
-- CreateTable
CREATE TABLE "caption" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER,
    "courseId" INTEGER,
    "language" "Language" NOT NULL,
    "content" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "needsResend" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "caption_lessonId_key" ON "caption"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "caption_courseId_key" ON "caption"("courseId");

-- AddForeignKey
ALTER TABLE "caption" ADD CONSTRAINT "caption_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caption" ADD CONSTRAINT "caption_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CheckConstraint (à mão — o Prisma não gera CHECK): exatamente UM dono, a aula
-- ou a apresentação do curso, como o `saved_item_um_so`.
ALTER TABLE "caption" ADD CONSTRAINT "caption_um_dono" CHECK (
    ("lessonId" IS NOT NULL AND "courseId" IS NULL)
    OR
    ("courseId" IS NOT NULL AND "lessonId" IS NULL)
);

-- RLS (CLAUDE.md → Database): nenhuma política; o Prisma conecta como dono.
ALTER TABLE public."caption" ENABLE ROW LEVEL SECURITY;
