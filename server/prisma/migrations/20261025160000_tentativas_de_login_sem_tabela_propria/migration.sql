-- AS TENTATIVAS DE LOGIN SAEM DA TABELA PRÓPRIA DO BETTER AUTH (25/10/2026, revisão de segurança):
-- o `storage: "database"` pronto fazia de 2 a 6 consultas, com transação, a cada pedido a
-- `/api/auth/*`, no mesmo caixa de ligações da sessão. A contagem do login passou para a tabela do
-- limite de tentativas (`limite_de_tentativa`, uma instrução por pedido — `lib/loja-de-tentativas.ts`).
-- A tabela `rateLimit` nasceu na migration anterior, do mesmo dia, e nunca chegou à produção com uso.

DROP TABLE IF EXISTS "rateLimit";
