// A TENTATIVA DE QUEM ASSINA SEM CONTA (etapa 4.7, passo 6e — revisão de segurança do passo 5,
// 21/10/2026). Ela ABRE A CONTA depois do pagamento (cria a primeira senha e a sessão), então vale
// como uma senha: fica SÓ na memória desta página e no `sessionStorage` desta aba — NUNCA no
// endereço, nem no `return_url` da Stripe (o endereço fica no histórico, no registro da hospedagem e
// em todo link copiado). Sai daqui assim que a senha é criada. O e-mail vai junto: a tela de depois
// do pagamento o repete (é ali que a pessoa percebe um erro de digitação).

export type TentativaGuardada = { tentativa: string; email: string };

const CHAVE = "jilson.assinar.tentativa";
let naMemoria: TentativaGuardada | null = null;

/** Guarda a tentativa que o servidor devolveu — antes de confirmar o cartão (o banco pode sair da página). */
export function guardarTentativa(guardada: TentativaGuardada): void {
  naMemoria = guardada;
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(guardada));
  } catch {
    // Sem `sessionStorage` (janela privada, bloqueado): fica só a memória da página.
  }
}

/** A tentativa desta aba: da memória ou, depois de a página recarregar, do `sessionStorage`. */
export function lerTentativa(): TentativaGuardada | null {
  if (naMemoria) return naMemoria;
  try {
    const bruto = window.sessionStorage.getItem(CHAVE);
    const lido: unknown = bruto ? JSON.parse(bruto) : null;
    if (lido && typeof lido === "object" && "tentativa" in lido && "email" in lido && typeof lido.tentativa === "string" && typeof lido.email === "string") {
      naMemoria = { tentativa: lido.tentativa, email: lido.email };
      return naMemoria;
    }
  } catch {
    // Guardado ilegível ou `sessionStorage` bloqueado: como se não houvesse.
  }
  return null;
}

/** Esquece a tentativa — depois de a senha ser criada, ela não serve para mais nada. */
export function esquecerTentativa(): void {
  naMemoria = null;
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // Bloqueado: nada a apagar.
  }
}
