import { createHash, randomBytes } from "node:crypto";

// A TENTATIVA DO VISITANTE (etapa 4.7, passos 4 e 5): o código que só o navegador de quem assinou
// sem conta recebe. Ele ABRE A CONTA — cria a primeira senha e a sessão, por até 24 h depois do
// pagamento —, então vale como uma senha: o navegador guarda a tentativa; o banco (`GuestCheckout`)
// e os dados da assinatura na Stripe guardam SÓ O RESUMO dela (passo 6b — revisão de segurança do
// passo 5, 21/10/2026). Quem lê o painel da Stripe, um aviso dela ou uma cópia do banco não tem
// como abrir a conta de ninguém. Toda busca é pelo resumo.

/** O código público de uma tentativa: 32 caracteres que ninguém adivinha (24 bytes aleatórios). */
export function novaTentativa(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * O resumo que se guarda: SHA-256, em hexadecimal (64 caracteres). Sem sal, de propósito: a
 * tentativa já é aleatória (24 bytes), e o resumo precisa ser o mesmo a cada busca. Função pura.
 */
export function resumoDaTentativa(tentativa: string): string {
  return createHash("sha256").update(tentativa, "utf8").digest("hex");
}
