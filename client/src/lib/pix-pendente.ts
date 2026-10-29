// O PIX À ESPERA DESTA ABA (etapa 4.9, passo 2b). Quem paga com Pix recebe do servidor o SEGREDO do
// pagamento, com que o Stripe.js mostra o QR. Se a pessoa fechar o QR sem pagar, a tela de concluído
// o mostra de novo ("Mostrar o QR de novo") — com o mesmo segredo, que fica SÓ na memória desta página
// e no `sessionStorage` desta aba (a página de concluído do visitante é do servidor: a aba troca de
// página inteira), nunca no endereço. Sai daqui assim que o servidor diz que a assinatura valeu. A
// chave publicável vai junto: a tela de concluído não lê os planos (seria uma ida à Stripe à toa).
// A mesma forma de `tentativa-de-assinar.ts`.

/**
 * `email`: o de quem paga, que o servidor devolveu com o segredo (P113). É com ele que o "Mostrar o QR de
 * novo" gera um QR NOVO no mesmo pagamento quando o anterior venceu (P115, decisão do operador,
 * 29/10/2026): o quadro do Pix não pede e-mail, e a Stripe o recebe na confirmação.
 */
export type PixGuardado = { segredo: string; chavePublicavel: string; email?: string };

const CHAVE = "jilson.assinar.pix";
let naMemoria: PixGuardado | null = null;

/** Guarda o Pix que o servidor devolveu — ANTES de o QR abrir (a pessoa pode fechar a aba do QR e voltar). */
export function guardarPix(guardado: PixGuardado): void {
  naMemoria = guardado;
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(guardado));
  } catch {
    // Sem `sessionStorage` (janela privada, bloqueado): fica só a memória da página.
  }
}

/** O Pix desta aba: da memória ou, depois de a página trocar, do `sessionStorage`. */
export function lerPix(): PixGuardado | null {
  if (naMemoria) return naMemoria;
  try {
    const bruto = window.sessionStorage.getItem(CHAVE);
    const lido: unknown = bruto ? JSON.parse(bruto) : null;
    if (lido && typeof lido === "object" && "segredo" in lido && "chavePublicavel" in lido && typeof lido.segredo === "string" && typeof lido.chavePublicavel === "string") {
      const email = "email" in lido && typeof lido.email === "string" ? lido.email : null;
      naMemoria = email ? { segredo: lido.segredo, chavePublicavel: lido.chavePublicavel, email } : { segredo: lido.segredo, chavePublicavel: lido.chavePublicavel };
      return naMemoria;
    }
  } catch {
    // Guardado ilegível ou `sessionStorage` bloqueado: como se não houvesse.
  }
  return null;
}

/** Esquece o Pix — a assinatura valeu, e o QR não serve para mais nada. */
export function esquecerPix(): void {
  naMemoria = null;
  try {
    window.sessionStorage.removeItem(CHAVE);
  } catch {
    // Bloqueado: nada a apagar.
  }
}
