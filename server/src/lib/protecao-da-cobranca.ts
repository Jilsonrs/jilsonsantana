import type { Request, RequestHandler } from "express";
import { trustedOrigins } from "./auth.js";
import { enderecoDoSite } from "./endereco-do-site.js";

/** As origens do próprio site: o endereço dele (`BETTER_AUTH_URL`) e as que o login aceita (`trustedOrigins`). */
function origensDoSite(): Set<string> {
  const origens = new Set(trustedOrigins);
  const site = enderecoDoSite("/");
  if (site) origens.add(new URL(site).origin);
  return origens;
}

/**
 * O pedido veio de OUTRO SITE? (E8 da revisão ampla da cobrança, 29/10/2026) O navegador diz de onde ele veio
 * (`Sec-Fetch-Site`), e só a MESMA ORIGEM passa — mais o `none` (a própria pessoa abriu o endereço) e o cabeçalho
 * ausente (navegador antigo, ou quem não é navegador e não leva o cookie de ninguém). O `same-site` também é recusado:
 * é o pedido de um SUBDOMÍNIO de jilsonsantana.com, e uma página num subdomínio apontando para um serviço de terceiro
 * faria o navegador de quem a visita reembolsar ou cancelar. Usada aqui e no pedido de código (`conta-codigo.ts`).
 * SEM o `Sec-Fetch-Site` (o Safari antes do 16.4 não o manda, e o piso é o iOS 15 — revisão do grupo 2 da 4.9b), decide
 * o `Origin`: vindo, só passa o do próprio site — o `null` (página em moldura, arquivo) também é recusado. Sem os dois
 * (quem não é navegador), passa: não leva o cookie de ninguém.
 */
export function pedidoDeOutroSite(req: Request): boolean {
  const origem = req.get("sec-fetch-site");
  if (origem !== undefined) return origem !== "same-origin" && origem !== "none";
  const de = req.get("origin");
  return de !== undefined && !origensDoSite().has(de);
}

/**
 * A PROTEÇÃO DE TODA ROTA DE `/billing` — a de quem está logado e a sem login (etapa 4.7, passo 4):
 * - nada fica em cache: tudo ali é de uma pessoa, e uma das respostas leva o segredo do pagamento
 *   (a mesma linha de toda rota por conta do repo; achado da revisão de segurança, 10/10/2026);
 * - PEDIDO QUE MUDA ALGUMA COISA E VEM DE OUTRO SITE é recusado (achado da revisão de segurança,
 *   11/10/2026). O cookie da sessão já não viaja nesses pedidos (`sameSite`), e esta é a segunda
 *   trava: cancelar pode encerrar na hora e o reembolso não volta atrás. O navegador diz de onde o
 *   pedido veio (`Sec-Fetch-Site`); o site da escola é sempre a mesma origem.
 */
export const protecaoDaCobranca: RequestHandler = (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (req.method !== "GET" && pedidoDeOutroSite(req)) {
    console.warn(`[api] ${req.method} ${req.baseUrl}${req.path} recusado: o pedido veio de outro site`);
    res.status(403).json({ error: "OutroSite" });
    return;
  }
  next();
};
