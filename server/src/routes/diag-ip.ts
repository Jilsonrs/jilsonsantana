import { Router } from "express";

// ⚠️ ROTA TEMPORÁRIA DE DIAGNÓSTICO — APAGAR NO BLOCO SEGUINTE.
//
// Existe para responder UMA pergunta: qual cabeçalho traz o IP real do
// visitante em produção, para o rate-limit do login parar de usar um balde
// único compartilhado (implementation-plan → BLOQUEIO DO GO-LIVE).
//
// Por que não dá para decidir só lendo: a documentação da Railway diz que a
// borda define `X-Real-IP` com o IP do cliente; o suporte dela disse ao
// operador, em 2026, que com a CDN ligada esse mesmo cabeçalho traz o IP da
// Fastly. Configurar pela documentação, se o suporte estiver certo, deixaria
// todo mundo no mesmo balde e ainda APAGARIA o aviso do log.
//
// Segurança: devolve SÓ os cabeçalhos de IP da PRÓPRIA requisição — quem chama
// já conhece o próprio IP. Nunca devolve cookie, authorization nem qualquer
// outro cabeçalho, e responde JSON (nunca HTML), então não reflete marcação.
// Não registra nada no log. Rota de diagnóstico que sobrevive ao diagnóstico é
// superfície que ninguém revisa depois — por isso o aviso lá em cima.

const router = Router();

const CABECALHOS_DE_IP = [
  "x-real-ip",
  "x-forwarded-for",
  "fastly-client-ip",
  "true-client-ip",
  "cf-connecting-ip",
  "x-envoy-external-address",
  "x-railway-edge",
] as const;

router.get("/__ip", (req, res) => {
  const cabecalhos = Object.fromEntries(
    CABECALHOS_DE_IP.map((nome) => [nome, req.headers[nome] ?? null]),
  );
  res.set("Cache-Control", "no-store").json({
    cabecalhos,
    conexao: req.socket.remoteAddress ?? null,
  });
});

export default router;
