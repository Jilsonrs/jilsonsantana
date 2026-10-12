-- A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 — etapa 4.6c, passo 3).
--
-- O servidor deixou de gravar o idioma. Até a coluna sair do banco (passo 4 da
-- etapa), ela precisa de um valor padrão para os INSERTs continuarem valendo.
-- Só muda o padrão: nenhuma linha é tocada, nenhuma tabela é criada.
ALTER TABLE "site_text" ALTER COLUMN "language" SET DEFAULT 'PT';
ALTER TABLE "testimonial" ALTER COLUMN "language" SET DEFAULT 'PT';
ALTER TABLE "faq_item" ALTER COLUMN "language" SET DEFAULT 'PT';
ALTER TABLE "course" ALTER COLUMN "language" SET DEFAULT 'PT';
ALTER TABLE "caption" ALTER COLUMN "language" SET DEFAULT 'PT';
ALTER TABLE "learning_plan" ALTER COLUMN "language" SET DEFAULT 'PT';
