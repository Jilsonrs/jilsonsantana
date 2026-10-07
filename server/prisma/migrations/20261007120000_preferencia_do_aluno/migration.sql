-- AS PREFERÊNCIAS DO ALUNO (Bloco AULA, etapa 6 — decisão do operador, 07/10/2026):
-- a legenda lembrada, como no LinkedIn. Uma linha por pessoa, criada na primeira
-- mudança. SQL gerado pelo próprio Prisma (migrate diff), mais a RLS que o CLAUDE.md
-- exige em toda tabela nova do public. Só ACRESCENTA uma tabela: nada do que já
-- existe muda.

-- CreateTable
CREATE TABLE "student_preference" (
    "userId" TEXT NOT NULL,
    "captionsOn" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_preference_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "student_preference" ADD CONSTRAINT "student_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (CLAUDE.md → Database & Migrations): sem policies — o Prisma conecta como o
-- dono da tabela e é o único que a acessa.
ALTER TABLE "public"."student_preference" ENABLE ROW LEVEL SECURITY;
