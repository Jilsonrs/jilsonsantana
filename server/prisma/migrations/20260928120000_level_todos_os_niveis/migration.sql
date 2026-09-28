-- "Todos os níveis" no nível do curso (Bloco E, etapa 1, parte 1d — decisão do
-- operador, 27–28/09/2026). Só ACRESCENTA um valor ao enum: nenhuma linha muda.
-- O enum "Level" nasceu numa migration versionada, então não precisa ser
-- condicional (a regra do CLAUDE.md vale para o que foi criado fora delas).
ALTER TYPE "Level" ADD VALUE 'TODOS_OS_NIVEIS';
