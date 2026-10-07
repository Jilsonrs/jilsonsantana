-- ONDE A PESSOA PAROU (Bloco AULA, etapa 1 — plano aprovado pelo operador em
-- 06/10/2026): o segundo do vídeo e a última vez que a pessoa esteve em cada aula,
-- NA CONTA (o Safari apaga o que o site guarda no aparelho depois de 7 dias).
-- SQL gerado pelo próprio Prisma (migrate diff). Só ACRESCENTA duas colunas
-- opcionais a uma tabela que já tem RLS: nenhuma linha muda, nada é apagado.

-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "positionSeconds" INTEGER;
