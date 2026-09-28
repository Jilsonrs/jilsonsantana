-- O vídeo de cada aula (Bloco E etapa 2, parte 2d = Bloco U etapa 3 — plano
-- aprovado pelo operador em 28/09/2026): o vídeo no Bunny, o envio em andamento
-- (para a limpeza) e a prévia grátis. Nenhuma tabela nova: a RLS de "lesson"
-- continua valendo. As aulas que já existem ficam sem vídeo e sem prévia grátis.
ALTER TABLE "lesson" ADD COLUMN "bunnyVideoId" TEXT,
ADD COLUMN "bunnyVideoPendingId" TEXT,
ADD COLUMN "isFreePreview" BOOLEAN NOT NULL DEFAULT false;
