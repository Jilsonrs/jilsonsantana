-- A SENHA LOGO DEPOIS DE PAGAR, UMA VEZ (Fase 4, etapa 4.7, passo 5 — revisão de segurança,
-- 21/10/2026): quando a tentativa criou a senha. A tabela já tem RLS (migration da ficha, passo 4).

-- AlterTable
ALTER TABLE "guest_checkout" ADD COLUMN     "senhaCriadaEm" TIMESTAMP(3);
