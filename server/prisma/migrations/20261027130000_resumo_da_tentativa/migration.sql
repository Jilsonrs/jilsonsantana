-- A TENTATIVA DO VISITANTE GUARDADA SÓ PELO RESUMO (etapa 4.7, passo 6b — revisão de segurança do
-- passo 5, 21/10/2026): a tentativa abre a conta (cria a primeira senha e a sessão), então a ficha
-- guarda só o SHA-256 dela, em hexadecimal (`server/src/lib/tentativa-do-visitante.ts`); o
-- navegador continua com a tentativa, e toda busca é pelo resumo.
-- As linhas que já existem passam a guardar o resumo. Em produção não há nenhuma (a venda sem login
-- está desligada até o passo 8). A condição deixa de fora o que já é resumo (64 caracteres
-- hexadecimais — uma tentativa tem 32, em base64url). Sem DDL: o esquema não muda.
UPDATE "guest_checkout"
SET "tentativa" = encode(sha256(convert_to("tentativa", 'UTF8')), 'hex')
WHERE "tentativa" IS NOT NULL AND "tentativa" !~ '^[0-9a-f]{64}$';
