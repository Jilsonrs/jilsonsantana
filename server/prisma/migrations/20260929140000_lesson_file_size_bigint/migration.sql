-- Arquivo para baixar SEM limite de tamanho (decisão do operador, 29/09/2026: em
-- geral um .zip por curso). O tamanho em bytes passa de inteiro (até ~2 GB) para
-- inteiro grande: um .zip maior seria enviado ao Bunny e depois falharia ao gravar
-- o registro. Nenhuma tabela nova: a RLS de "lesson_file" continua valendo.
ALTER TABLE "lesson_file" ALTER COLUMN "sizeBytes" SET DATA TYPE BIGINT;
