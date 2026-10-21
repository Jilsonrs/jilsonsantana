-- A CONTA DE ADMIN COM O E-MAIL CONFIRMADO (Fase 4, etapa 4.7, passo 5 — revisão de segurança,
-- 21/10/2026). Entrar pelo código numa conta com o e-mail NÃO confirmado apaga a senha dela e todas
-- as sessões (Better Auth 1.7, sem opção para desligar). A conta de admin nasceu do seed sem
-- confirmar o e-mail, e o e-mail é do próprio operador: confirmá-lo aqui impede que o primeiro uso do
-- código apague a senha de admin. Só dados: nenhuma tabela muda. As contas que o seed cria (ou
-- reconcilia) daqui em diante, ele mesmo confirma (`src/seed.ts`).
UPDATE "user" SET "emailVerified" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE "role" = 'admin' AND "emailVerified" = false;
