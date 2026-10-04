-- O título do curso copiado no envio da notificação, como o texto (achado P1 da
-- revisão de segurança, 04/10/2026): o sino não pode ler o título atual de um
-- curso que saiu do ar. Só ACRESCENTA uma coluna opcional.
-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "courseTitle" TEXT;

