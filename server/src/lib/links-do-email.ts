import { createHmac, timingSafeEqual } from "node:crypto";

// OS LINKS DOS E-MAILS A QUEM NÃO É ALUNO (etapa 4.7, passo 9 — decisões do operador, 29/10/2026): "Quero receber
// novidades" (no lembrete de quem não terminou de assinar, para quem não marcou a caixa) e "Descadastrar" (em todo
// e-mail a um lead). O CÓDIGO DO LINK é uma ASSINATURA do servidor sobre o id da ficha ou do lead — nada fica guardado:
//   - quem tiver uma cópia do banco não forja um link (a assinatura precisa do segredo, que não mora no banco);
//   - o mesmo e-mail, mandado de novo, sai com o MESMO link — a chave de repetição do Resend recusa o mesmo envio com
//     conteúdo diferente (CLAUDE.md → Membership Gating, regra (2) dos e-mails);
//   - o link de descadastrar vale enquanto o lead existir, como a lei pede.
// A chave é o segredo que o site já tem (`BETTER_AUTH_SECRET`), separada por propósito, como as contagens do limite de
// tentativas (`loja-de-tentativas.ts`). Trocar esse segredo derruba as sessões e também estes links: a página do link
// que não vale diz para escrever ao suporte.

export type TipoDeLink = "novidades" | "descadastrar";

/** Os ids das fichas e dos leads: UUID, em minúsculas (`randomUUID`). Qualquer outra coisa não é código deste servidor. */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function assinatura(tipo: TipoDeLink, id: string): Buffer {
  const segredo = process.env.BETTER_AUTH_SECRET;
  if (!segredo) throw new Error("[api] os links do e-mail precisam do BETTER_AUTH_SECRET");
  return createHmac("sha256", segredo).update(`links-do-email\u001f${tipo}\u001f${id}`).digest();
}

/** O código do link: o id e a assinatura do servidor. */
export function codigoDoLink(tipo: TipoDeLink, id: string): string {
  return `${id}.${assinatura(tipo, id).toString("base64url")}`;
}

/** O caminho da página do link no site (`/novidades/<código>` ou `/descadastrar/<código>`). */
export function caminhoDoLink(tipo: TipoDeLink, id: string): string {
  return `/${tipo}/${codigoDoLink(tipo, id)}`;
}

/**
 * O id que o código prova — ou nada: o código de outro tipo de link, de outro servidor (outro segredo), malformado, ou
 * com a assinatura trocada. A comparação não deixa o tempo da resposta dizer quanto da assinatura acertou.
 */
export function idDoLink(tipo: TipoDeLink, codigo: string): string | null {
  const ponto = codigo.lastIndexOf(".");
  if (ponto <= 0) return null;
  const id = codigo.slice(0, ponto);
  const parte = codigo.slice(ponto + 1);
  if (!ID.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(parte)) return null;
  const recebida = Buffer.from(parte, "base64url");
  const esperada = assinatura(tipo, id);
  return recebida.length === esperada.length && timingSafeEqual(recebida, esperada) ? id : null;
}
