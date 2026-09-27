-- O envio de apresentação em andamento (Bloco U, etapa 2 — limpeza pedida pelo
-- operador em 27/09/2026). Coluna em tabela que já existe: a RLS da tabela
-- continua valendo, e não há tabela nova.
ALTER TABLE "course" ADD COLUMN "introVideoPendingId" TEXT;
