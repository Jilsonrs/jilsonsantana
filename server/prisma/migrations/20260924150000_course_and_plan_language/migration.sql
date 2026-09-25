-- Idioma do conteúdo (Bloco I, "app do aluno em inglês", etapa 3).
--
-- Obrigatório nos dois: as linhas que já existem viram PT (a escola nasceu em
-- português) e o DEFAULT sai logo em seguida, para o banco RECUSAR curso ou
-- trilha criados sem idioma. Módulo e aula herdam do curso, sem coluna.
--
-- Sem tabela nova ⇒ sem RLS nova (as duas tabelas já têm RLS desde 2026-06).

ALTER TABLE "course" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'PT';
ALTER TABLE "course" ALTER COLUMN "language" DROP DEFAULT;

ALTER TABLE "learning_plan" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'PT';
ALTER TABLE "learning_plan" ALTER COLUMN "language" DROP DEFAULT;
