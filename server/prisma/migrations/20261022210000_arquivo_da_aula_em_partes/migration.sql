-- O ARQUIVO DA AULA EM PARTES (Bloco G, etapa G2): quantas partes de até 30 MB o
-- arquivo tem no Bunny Storage (`partes`), quantas já chegaram (`partesEnviadas`) e
-- se todas já chegaram (`completo`). O arquivo já guardado inteiro fica com 1 parte
-- pronta (`DEFAULT 1` e `DEFAULT true`). A tabela já tem RLS (migration de 28/09/2026).

-- AlterTable
ALTER TABLE "lesson_file" ADD COLUMN     "completo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "partes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "partesEnviadas" INTEGER NOT NULL DEFAULT 1;
