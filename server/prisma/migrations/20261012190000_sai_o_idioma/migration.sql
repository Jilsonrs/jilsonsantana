-- A ESCOLA É SÓ EM PORTUGUÊS (decisão do operador, 12/10/2026 — etapa 4.6c, passo 4).
--
-- O banco perde o segundo idioma: as linhas em inglês das três tabelas de texto,
-- a coluna "language" das seis tabelas e o tipo "Language".
--
-- NÃO É REVERSÍVEL. As linhas apagadas e a coluna só voltam por backup — e hoje
-- o único é a janela curta de restauração do Neon (CLAUDE.md → Costs). Depois
-- dela, voltar o site para a versão anterior pela Railway também deixa de
-- funcionar: a versão anterior lê a coluna.
--
-- SE A TRAVA ABAIXO DISPARAR NA PUBLICAÇÃO: a publicação para (é o que se quer),
-- mas esta migration fica marcada como FALHA no banco, e nenhuma publicação
-- seguinte passa até alguém rodar `prisma migrate resolve --rolled-back
-- 20261012190000_sai_o_idioma` naquele banco, depois de apagar o que sobrou em
-- inglês. Por isso conta-se ANTES de publicar (as três consultas da trava).

-- 1. A TRAVA. Curso, trilha e legenda em inglês NÃO se apagam por SQL: é o admin
--    que apaga o vídeo no Bunny junto. Se sobrar algum, a migration PARA aqui (e
--    a publicação com ela), em vez de deixar vídeo órfão ou de transformar em
--    português, em silêncio, um curso que não é.
--    ATENÇÃO, LEGENDA: desde o passo 3 o admin só apaga no Bunny a faixa em
--    português. Uma legenda em inglês apagada pelo admin sai do banco, mas a
--    faixa "en" fica no vídeo: apague-a também no painel do Bunny.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "course" WHERE "language" = 'EN')
     OR EXISTS (SELECT 1 FROM "learning_plan" WHERE "language" = 'EN')
     OR EXISTS (SELECT 1 FROM "caption" WHERE "language" = 'EN') THEN
    RAISE EXCEPTION 'Ainda ha curso, trilha ou legenda em ingles. Apague pelo admin antes de publicar (etapa 4.6c, passo 4).';
  END IF;
END $$;

-- 2. As sobras em inglês das tabelas de texto (perguntas, depoimentos e textos
--    editados). O site já não as mostrava desde o passo 3.
DELETE FROM "site_text" WHERE "language" = 'EN';
DELETE FROM "faq_item" WHERE "language" = 'EN';
DELETE FROM "testimonial" WHERE "language" = 'EN';

-- 3. Os índices que levavam o idioma.
DROP INDEX "site_text_key_language_key";
DROP INDEX "testimonial_language_status_displayOrder_idx";
DROP INDEX "faq_item_language_status_displayOrder_idx";

-- 4. A coluna, nas seis tabelas.
ALTER TABLE "site_text" DROP COLUMN "language";
ALTER TABLE "testimonial" DROP COLUMN "language";
ALTER TABLE "faq_item" DROP COLUMN "language";
ALTER TABLE "course" DROP COLUMN "language";
ALTER TABLE "caption" DROP COLUMN "language";
ALTER TABLE "learning_plan" DROP COLUMN "language";

-- 5. Os índices sem o idioma. Em "site_text", a chave passa a ser única sozinha:
--    um texto editado por chave.
CREATE UNIQUE INDEX "site_text_key_key" ON "site_text"("key");
CREATE INDEX "testimonial_status_displayOrder_idx" ON "testimonial"("status", "displayOrder");
CREATE INDEX "faq_item_status_displayOrder_idx" ON "faq_item"("status", "displayOrder");

-- 6. O tipo.
DROP TYPE "Language";
