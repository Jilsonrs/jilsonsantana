-- O Bunny já disse que o vídeo da aula está pronto (decisão do operador,
-- 29/09/2026: no editor, a aula com o vídeo pronto volta recolhida; a que ainda
-- processa, ou está sem vídeo, volta aberta). Nenhuma tabela nova: a RLS de
-- "lesson" continua valendo. As aulas que já existem começam "não confirmadas",
-- e o editor pergunta ao Bunny por elas uma vez.
ALTER TABLE "lesson" ADD COLUMN "bunnyVideoReady" BOOLEAN NOT NULL DEFAULT false;
