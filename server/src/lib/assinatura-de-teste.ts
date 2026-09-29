// A ASSINATURA DE TESTE do `member@` (etapa 4 do Bloco U — decisão do operador,
// 27/09/2026): existe SÓ fora de produção, para testar a aula como aluno no
// computador do operador e na suíte. Em produção, o `member@` só ganha acesso por
// uma assinatura REAL na Stripe com cupom de 100% (plano, Fase 4) — nunca por
// exceção no gate.

/**
 * Os bancos onde ela pode nascer: o banco LOCAL (a suíte de teste) e o branch
 * `dev` do Neon. Mesma forma da trava do banco de teste (`test/test-env.ts`):
 * o HOSTNAME parseado, nunca um trecho de texto da URL. Os três hosts locais são
 * os mesmos de lá; se um mudar sem o outro, a assinatura deixa de nascer e os
 * testes que dependem dela reprovam — a falha vai para o lado seguro.
 */
const HOSTS_LOCAIS = ["localhost", "127.0.0.1", "::1"];
/** O endpoint do branch `dev` do Neon (CLAUDE.md → Database & Migrations). */
const ENDPOINT_DO_BRANCH_DEV = "ep-lingering-morning-aehqd81z";

export function podeTerAssinaturaDeTeste(url: string | undefined): boolean {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (HOSTS_LOCAIS.includes(host)) return true;
  // `ep-…` sozinho ou com `-pooler`, seguido de um ponto: nunca um prefixo solto.
  return new RegExp(`^${ENDPOINT_DO_BRANCH_DEV}(-pooler)?\\.`).test(host);
}

/** A chave "Stripe" da assinatura de teste: não existe na Stripe, e é única. */
export const ASSINATURA_DE_TESTE = "sub_teste_member_fora_de_producao";
