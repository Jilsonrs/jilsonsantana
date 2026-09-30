-- A duração do vídeo de cada aula, em segundos, como o Bunny informa (o campo
-- `length` do vídeo). Serve à duração do curso no topo do editor (decisão do
-- operador, 29/09/2026: soma todo vídeo enviado, como a Udemy). Vazia até o
-- Bunny terminar de processar; a troca de vídeo volta a esvaziar.
-- A duração do CURSO não vira coluna: é sempre a soma das aulas.
-- Nenhuma tabela nova: a RLS de "lesson" continua valendo. As aulas que já têm
-- vídeo são preenchidas na primeira vez que o editor do curso é aberto.
ALTER TABLE "lesson" ADD COLUMN "videoDurationSeconds" INTEGER;
