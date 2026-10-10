import type { ErrorRequestHandler } from "express";

// O ERRO QUE ESCAPA FORA DE `/api` (Fase 7, o alerta de erro — 10/10/2026): a home, as páginas
// públicas, o sitemap. O de `/api` tem tratador próprio (`erro-da-api.ts`); este só ANOTA, com
// etiqueta, e passa adiante — a resposta continua sendo a do Express, como era.
// Por que existe: o Express registra o erro sem etiqueta, e linha sem etiqueta não vira alerta
// (`lib/monitor.ts`). Sem isto, a home quebrada só seria descoberta por quem a visitasse.
// O que NÃO é defeito nosso não é anotado: o erro que já vem com status 4xx (um endereço
// malformado mandado por um robô, por exemplo) segue adiante mudo.
// Montado em `app.ts` por ÚLTIMO, depois de tudo.

export const anotarErroDoSite: ErrorRequestHandler = (erro, req, _res, next) => {
  const status: unknown = typeof erro === "object" && erro !== null && "status" in erro ? erro.status : undefined;
  if (typeof status !== "number" || status >= 500) {
    const rastro = erro instanceof Error ? (erro.stack ?? erro.message) : `erro que não é Error (${typeof erro})`;
    console.error(`[site] ${req.method} ${req.originalUrl.split("?")[0]} falhou: ${rastro}`);
  }
  next(erro);
};
