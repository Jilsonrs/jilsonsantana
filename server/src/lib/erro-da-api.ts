import type { ErrorRequestHandler } from "express";

// O TRATADOR DE ERRO DA API (Fase 4, etapa 4.4 — achado da revisão de segurança da etapa 4.2).
// Montado em `app.ts` no FIM de `/api`. O padrão do Express, em produção, responde só "Internal
// Server Error" — mas COPIA do erro o `status`/`statusCode` e os `headers`. Um erro da Stripe
// que escape cru tem os dois: o status dela (402, 429…) e os cabeçalhos da resposta dela iriam
// para o navegador como se fossem nossos; fora de produção, vai junto o rastro do erro.
// Aqui, o erro que escapar de qualquer rota de `/api` vira 500 `ErroInterno`, em qualquer
// ambiente, sem NADA do erro na resposta.
// A ÚNICA exceção é o corpo do pedido que o próprio Express recusou ao ler (JSON malformado,
// grande demais): continua 4xx. Não é falha nossa, e virar 500 faria a Stripe reentregar por 3
// dias um aviso que nunca vai caber.
// O REGISTRO continua levando o erro, como o padrão fazia — sem isso a falha ficaria muda. Vai
// o rastro (`stack`), nunca o objeto inteiro: o erro da Stripe carrega a resposta crua dela, e o
// de leitura do corpo carrega o corpo. O endereço vai sem o que vem depois do "?".

/** O que `express.json()` e `express.raw()` recusam ao ler o corpo: o `type` do erro → o status. */
const CORPO_RECUSADO: Readonly<Record<string, number>> = {
  "entity.parse.failed": 400,
  "entity.too.large": 413,
  "encoding.unsupported": 415,
  "charset.unsupported": 415,
  "request.aborted": 400,
  "request.size.invalid": 400,
};

function statusDoCorpoRecusado(erro: unknown): number | null {
  if (typeof erro !== "object" || erro === null || !("type" in erro) || typeof erro.type !== "string") return null;
  return Object.hasOwn(CORPO_RECUSADO, erro.type) ? CORPO_RECUSADO[erro.type] : null;
}

export const tratarErroDaApi: ErrorRequestHandler = (erro, req, res, next) => {
  // A resposta já começou a sair (um download no meio): não há o que responder — o Express fecha.
  if (res.headersSent) {
    next(erro);
    return;
  }
  const corpoRecusado = statusDoCorpoRecusado(erro);
  if (corpoRecusado !== null) {
    res.status(corpoRecusado).json({ error: "CorpoInvalido" });
    return;
  }
  const rastro = erro instanceof Error ? (erro.stack ?? erro.message) : `erro que não é Error (${typeof erro})`;
  console.error(`[api] ${req.method} ${req.originalUrl.split("?")[0]} falhou: ${rastro}`);
  res.status(500).json({ error: "ErroInterno" });
};
