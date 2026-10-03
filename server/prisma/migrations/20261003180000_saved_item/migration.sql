-- O que a pessoa salva para assistir depois, curso ou aula (decisão do operador,
-- 03/10/2026 — "Salvos", em Meus estudos). SQL gerado pelo próprio Prisma
-- (migrate diff), mais o CHECK e a RLS escritos à mão. Só ACRESCENTA uma tabela:
-- nada do que já existe muda.
-- CreateTable
CREATE TABLE "saved_item" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER,
    "lessonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_item_courseId_idx" ON "saved_item"("courseId");

-- CreateIndex
CREATE INDEX "saved_item_lessonId_idx" ON "saved_item"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_item_userId_courseId_key" ON "saved_item"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_item_userId_lessonId_key" ON "saved_item"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CheckConstraint (à mão — o Prisma não gera CHECK): exatamente UM dos dois, como
-- o `plan_item_type_xor`. Sem isto, uma linha sem nada (ou com os dois) passaria.
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_um_so" CHECK (
    ("courseId" IS NOT NULL AND "lessonId" IS NULL)
    OR
    ("lessonId" IS NOT NULL AND "courseId" IS NULL)
);

-- RLS (CLAUDE.md → Database): nenhuma política; o Prisma conecta como dono.
ALTER TABLE public."saved_item" ENABLE ROW LEVEL SECURITY;
