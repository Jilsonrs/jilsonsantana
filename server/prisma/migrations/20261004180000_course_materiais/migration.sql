-- Os materiais exclusivos do curso (Biblioteca de prompts, Apostila), marcados no
-- passo Publicar, para o quadro "Este curso inclui" (decisão do operador,
-- 04/10/2026). SQL gerado pelo próprio Prisma (migrate diff). Só ACRESCENTA uma
-- coluna (vazia por padrão) e o enum: nada do que já existe muda.
-- CreateEnum
CREATE TYPE "Material" AS ENUM ('BIBLIOTECA_DE_PROMPTS', 'APOSTILA');

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "materiais" "Material"[] DEFAULT ARRAY[]::"Material"[];

