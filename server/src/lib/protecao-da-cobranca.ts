import type { RequestHandler } from "express";

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
  if (req.method !== "GET" && req.get("sec-fetch-site") === "cross-site") {
    console.warn(`[api] ${req.method} ${req.baseUrl}${req.path} recusado: o pedido veio de outro site`);
    res.status(403).json({ error: "OutroSite" });
    return;
  }
  next();
};
