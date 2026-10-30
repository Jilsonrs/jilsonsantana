import type { ErrorRequestHandler } from "express";

// O TRATADOR DE ERRO DA API (Fase 4, etapa 4.4 — achado da revisão de segurança da etapa 4.2).
// Montado em `app.ts` no FIM de `/api`. O padrão do Express, em produção, responde só "Internal
// Server Error" — mas COPIA do erro o `status`/`statusCode` e os `headers`. Um erro da Stripe
// que escape cru tem os dois: o status dela (402, 429…) e os cabeçalhos da resposta dela iriam
// para o navegador como se fossem nossos; fora de produção, vai junto o rastro do erro.
// Aqui, o erro que escapar de qualquer rota de `/api` vira 500 `ErroInterno`, em qualquer
// ambiente, sem NADA do erro na resposta.
// A ÚNICA exceção é o corpo do pedido que o próprio Express recusou ao ler (JSON malformado,
// grande demais): continua 4xx, porque não é falha nossa. Mas a recusa NÃO fica muda (achado da
// revisão de segurança da etapa 4.4): a Stripe reentrega o aviso em qualquer resposta que não
// seja 2xx, e um aviso que não coubesse seria recusado por 3 dias sem ninguém ver. Vai o
// endereço, o status e o motivo — nunca o corpo.
// O mesmo vale para o ENDEREÇO malformado (`/api/lessons/%E0%A4%A`, coisa de robô): o Express
// não consegue ler o parâmetro e entrega um `URIError`. É 400, com aviso — antes virava 500 e
// uma linha de ERRO, que com o alerta ligado (`lib/monitor.ts`) acordaria o operador à toa.
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

/** O corpo recusado: o motivo (o `type`, de uma lista fechada — nunca a mensagem, que cita o corpo) e o status. */
function corpoRecusado(erro: unknown): { motivo: string; status: number } | null {
  if (typeof erro !== "object" || erro === null || !("type" in erro) || typeof erro.type !== "string") return null;
  return Object.hasOwn(CORPO_RECUSADO, erro.type) ? { motivo: erro.type, status: CORPO_RECUSADO[erro.type] } : null;
}

export const tratarErroDaApi: ErrorRequestHandler = (erro, req, res, next) => {
  // A resposta já começou a sair (um download no meio): não há o que responder — o Express fecha.
  if (res.headersSent) {
    next(erro);
    return;
  }
  const endereco = `${req.method} ${req.originalUrl.split("?")[0]}`;
  const recusado = corpoRecusado(erro);
  if (recusado !== null) {
    console.warn(`[api] ${endereco}: corpo recusado (${recusado.status}, ${recusado.motivo})`);
    res.status(recusado.status).json({ error: "CorpoInvalido" });
    return;
  }
  if (erro instanceof URIError) {
    // Só o método e o motivo: o endereço, aqui, é justamente o que veio malformado.
    console.warn(`[api] ${req.method}: endereço malformado recusado (400)`);
    res.status(400).json({ error: "EnderecoInvalido" });
    return;
  }
  const rastro = erro instanceof Error ? (erro.stack ?? erro.message) : `erro que não é Error (${typeof erro})`;
  // A falha ao processar um aviso da Stripe é alerta de COBRANÇA (revisão do grupo 2 da 4.9b): com a etiqueta `[stripe]`,
  // ela tem a reserva da cota (`monitor.ts`) — com `[api]`, um apagão a calaria. Só um aviso que já passou na
  // verificação da assinatura chega a falhar aqui: um anônimo não a dispara.
  const etiqueta = req.originalUrl.split("?")[0] === "/api/stripe/webhook" ? "stripe" : "api";
  // De QUEM era o pedido (E13 da revisão ampla da cobrança, 30/10/2026): o id da conta da sessão — um id nosso, nunca o
  // e-mail —, para o alerta dizer quem ficou sem o que pediu (a busca pela assinatura e pelo pagamento é da 4.7b).
  const conta = req.user?.id;
  console.error(`[${etiqueta}] ${endereco} falhou${conta ? ` (conta ${conta})` : ""}: ${rastro}`);
  res.status(500).json({ error: "ErroInterno" });
};
