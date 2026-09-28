-- O tipo da aula e o texto da aula de texto (Bloco E, etapa 2, parte 2b — plano
-- aprovado pelo operador em 28/09/2026). As aulas que já existem viram VIDEO pelo
-- padrão da coluna. Nenhuma tabela nova: a RLS de "lesson" continua valendo.
CREATE TYPE "LessonKind" AS ENUM ('VIDEO', 'TEXT');

ALTER TABLE "lesson" ADD COLUMN "kind" "LessonKind" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN "content" TEXT;
