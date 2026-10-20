import { Router } from "express";
import { assinarSchema, cancelarSchema, mudarDePlanoSchema, previaSchema, type AssinaturaCriada, type CartaoTrocado, type PlanosDaAssinatura, type PreviaDaAssinatura, type PlanoMudado, type ReembolsoFeito, type RenovacaoParada, type SituacaoDaAssinatura, type TrocaDeCartaoPreparada, type TrocaDesfeita, type TrocaDisponivel } from "@jilson/core";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { buscarCodigo, buscarPrecos, calcularPrevia, chavePublicavel, cobrancaConfigurada, FORMAS_DE_PAGAMENTO } from "../lib/stripe.js";
import { atrasadaSemAcesso, convidaAReativar, temAcessoAtivo } from "../lib/acesso.js";
import { assinar } from "../lib/checkout.js";
import { desistirDaTroca, lerTrocaDePlano, mudarMeuPlano } from "../lib/meu-plano.js";
import { aplicarCartaoNovo, lerMinhaAssinatura, manterMinhaAssinatura, pararMinhaRenovacao, prepararTrocaDeCartao, reembolsarMinhaAssinatura, registrarAssinaturaDesconhecida } from "../lib/minha-assinatura.js";
import { limiteDeTentativas } from "../lib/limite-de-tentativas.js";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2 — billing.md; CLAUDE.md → Membership Gating).
// Tudo aqui exige login, e a conta é SEMPRE a da sessão. O site diz só QUAL plano e o código
// promocional: preço, valor e conta nunca vêm do navegador. Quem grava o espelho da assinatura
// continua sendo só o aviso da Stripe (`stripe-webhook.ts`).
// MINHA ASSINATURA (etapa 4.6): o que a tela de Faturamento e Assinatura lê e faz também mora
// aqui — e o site continua sem dizer de quem nem QUAL assinatura.
// O LIMITE DE TENTATIVAS (etapa 4.7, passo 1): toda rota que vai à Stripe passa por um, logo
// depois do `requireAuth` — rota nova daqui que vá à Stripe também (`lib/limite-de-tentativas.ts`).

const router = Router();

// Tudo aqui é por conta — e uma das respostas leva o segredo do pagamento: nada fica em cache
// (a mesma linha de toda rota por conta do repo; achado da revisão de segurança, 10/10/2026).
router.use("/billing", (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  // PEDIDO QUE MUDA ALGUMA COISA E VEM DE OUTRO SITE é recusado (achado da revisão de segurança,
  // 11/10/2026). O cookie da sessão já não viaja nesses pedidos (`sameSite`), e esta é a segunda
  // trava: cancelar pode encerrar na hora e o reembolso não volta atrás. O navegador diz de onde
  // o pedido veio (`Sec-Fetch-Site`); o site da escola é sempre a mesma origem.
  if (req.method !== "GET" && req.get("sec-fetch-site") === "cross-site") {
    console.warn(`[api] ${req.method} ${req.baseUrl}${req.path} recusado: o pedido veio de outro site`);
    res.status(403).json({ error: "OutroSite" });
    return;
  }
  next();
});

// GET /api/billing/planos — os dois planos com o valor lido da Stripe (o mostrado é o cobrado) e
// a chave que o site usa para abrir o campo do cartão.
router.get("/billing/planos", requireAuth, ...limiteDeTentativas.leitura, async (_req, res) => {
  const chave = chavePublicavel();
  if (!chave || !cobrancaConfigurada()) {
    // Em voz alta, e sem o valor: a variável pode estar com a chave errada dentro.
    console.error("[stripe] planos recusados: STRIPE_SECRET_KEY ou STRIPE_PUBLISHABLE_KEY ausente ou trocada");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const precos = await buscarPrecos();
  const resposta: PlanosDaAssinatura = {
    chavePublicavel: chave,
    planos: precos.map(({ plano, centavos, moeda }) => ({ plano, centavos, moeda })),
    formasDePagamento: [...FORMAS_DE_PAGAMENTO],
  };
  res.json(resposta);
});

// POST /api/billing/previa — quanto fica HOJE com o código promocional, pela conta da Stripe.
// Código que não existe, venceu, esgotou ou não vale para esta compra: a mesma resposta, sem
// dizer qual dos casos. O código digitado não vai para o registro.
router.post("/billing/previa", requireAuth, ...limiteDeTentativas.acao, async (req, res) => {
  const corpo = validate(previaSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] prévia recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const [precos, codigo] = await Promise.all([buscarPrecos(), buscarCodigo(corpo.codigo)]);
  // O preço é o do PLANO pedido, achado aqui: o corpo não tem como apontar outro.
  const preco = precos.find((p) => p.plano === corpo.plano);
  if (!preco) throw new Error(`[stripe] plano ${corpo.plano} sem preço`);
  const previa = codigo ? await calcularPrevia(preco.precoId, codigo.id) : null;
  if (!codigo || !previa) {
    res.status(400).json({ error: "CodigoInvalido" });
    return;
  }
  const resposta: PreviaDaAssinatura = { centavosHoje: previa.centavosHoje, moeda: previa.moeda, desconto: codigo.desconto };
  res.json(resposta);
});

// GET /api/billing/assinatura — esta conta tem acesso agora? É o que a tela de depois do
// pagamento pergunta até a resposta ser sim. A resposta é a do GATE (`temAcessoAtivo()`), que lê
// o espelho gravado pelo aviso da Stripe — nunca "o pagamento passou no navegador".
router.get("/billing/assinatura", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const temAcesso = await temAcessoAtivo(user.id);
  // `reativar`: só o texto do convite ("Reativar assinatura" × "Assinar") — não decide nada.
  // `atrasada`: a cobrança falhou há mais de 3 dias — o caminho é trocar o cartão, não assinar de novo.
  const resposta: SituacaoDaAssinatura = { temAcesso, reativar: await convidaAReativar(user.id, temAcesso), atrasada: await atrasadaSemAcesso(user.id, temAcesso) };
  res.json(resposta);
});

// POST /api/billing/assinatura — assinar. A regra inteira mora em `lib/checkout.ts`; aqui, só a
// conta da SESSÃO (o corpo não diz de quem é) e a resposta. O segredo do pagamento vai SÓ na
// resposta — nunca para o registro.
router.post("/billing/assinatura", requireAuth, ...limiteDeTentativas.cobranca, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const corpo = validate(assinarSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] assinatura recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const desfecho = await assinar({ id: user.id, email: user.email, nome: user.name ?? null }, corpo);
  if (desfecho.resultado === "ja-assinante") {
    res.status(409).json({ error: "JaAssinante" });
    return;
  }
  if (desfecho.resultado === "atrasada") {
    res.status(409).json({ error: "CobrancaAtrasada" });
    return;
  }
  if (desfecho.resultado === "codigo-invalido") {
    res.status(400).json({ error: "CodigoInvalido" });
    return;
  }
  const resposta: AssinaturaCriada = desfecho.resultado === "ativa" ? { estado: "ativa" } : { estado: "pagar", segredo: desfecho.segredo, tipo: desfecho.tipo };
  res.json(resposta);
});

// GET /api/billing/minha-assinatura — a assinatura da conta da SESSÃO, para a tela de Faturamento
// e Assinatura (etapa 4.6): o plano, a próxima cobrança e o cartão, como a Stripe diz agora. O
// pedido não diz de quem nem qual: a regra mora em `lib/minha-assinatura.ts`.
router.get("/billing/minha-assinatura", requireAuth, ...limiteDeTentativas.leitura, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] minha assinatura recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const leitura = await lerMinhaAssinatura(user.id);
  if (leitura.resultado === "desconhecida") {
    registrarAssinaturaDesconhecida(user.id, "minha assinatura");
    res.status(404).json({ error: "AssinaturaDesconhecida" });
    return;
  }
  res.json(leitura.assinatura);
});

// TROCAR O CARTÃO (etapa 4.6), em dois tempos — o campo da Stripe fica no meio, e o dado do
// cartão nunca passa por aqui. Nenhum dos dois pedidos tem corpo: a conta é a da sessão, a
// assinatura é a dela, e o cartão novo o servidor lê na Stripe.

// POST /api/billing/cartao — abre o pedido de guardar cartão. O segredo vai SÓ na resposta.
router.post("/billing/cartao", requireAuth, ...limiteDeTentativas.cobranca, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] troca de cartão recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const preparo = await prepararTrocaDeCartao(user.id);
  if (preparo.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "trocar cartão");
  if (preparo.resultado !== "ok") {
    res.status(preparo.resultado === "desconhecida" ? 404 : 409).json({ error: preparo.resultado === "desconhecida" ? "AssinaturaDesconhecida" : "SemAssinatura" });
    return;
  }
  const resposta: TrocaDeCartaoPreparada = { segredo: preparo.segredo };
  res.json(resposta);
});

// POST /api/billing/cartao/aplicar — põe na assinatura o cartão que o site acabou de confirmar.
router.post("/billing/cartao/aplicar", requireAuth, ...limiteDeTentativas.cobranca, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] troca de cartão recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const troca = await aplicarCartaoNovo(user.id);
  if (troca.resultado === "desconhecida") {
    registrarAssinaturaDesconhecida(user.id, "trocar cartão");
    res.status(404).json({ error: "AssinaturaDesconhecida" });
    return;
  }
  if (troca.resultado === "sem-assinatura") {
    res.status(409).json({ error: "SemAssinatura" });
    return;
  }
  if (troca.resultado === "sem-cartao-novo") {
    res.status(409).json({ error: "CartaoNaoConfirmado" });
    return;
  }
  // `confirmar`: o banco pediu uma confirmação para a cobrança em aberto — o site a completa.
  const resposta: CartaoTrocado = { cartao: troca.cartao, pagou: troca.pagou, confirmar: troca.confirmar };
  res.json(resposta);
});

// PARAR A RENOVAÇÃO E VOLTAR ATRÁS (etapa 4.6, sessão b). "Cancelar" aqui é parar a renovação: o
// acesso continua até o fim do período pago — menos com a cobrança ATRASADA, em que a assinatura
// termina na hora (não há período pago a manter). O corpo de cancelar leva SÓ o motivo, opcional; o de
// manter, nada. Nenhum dos dois diz qual assinatura: é a da conta da sessão.

/**
 * O que não foi feito, na resposta. Em todos NADA mudou — menos em `DevolucaoFalhou`: ali a
 * assinatura foi encerrada e o dinheiro não voltou (alguém já foi avisado pelo registro).
 */
const RECUSAS = {
  desconhecida: [404, "AssinaturaDesconhecida"],
  "sem-assinatura": [409, "SemAssinatura"],
  ocupada: [409, "Ocupada"],
  "fora-do-prazo": [409, "ForaDoPrazo"],
  "nada-a-devolver": [409, "NadaADevolver"],
  "devolucao-falhou": [502, "DevolucaoFalhou"],
  indisponivel: [409, "TrocaIndisponivel"],
  "previa-vencida": [409, "PreviaVencida"],
  recusado: [402, "CartaoRecusado"],
} as const;

// POST /api/billing/minha-assinatura/cancelar — para a renovação, com o motivo (se a pessoa disse).
router.post("/billing/minha-assinatura/cancelar", requireAuth, ...limiteDeTentativas.acao, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Sem corpo é o mesmo que sem motivo: o botão de cancelar funciona sem nada.
  const corpo = validate(cancelarSchema, req.body ?? {}, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] cancelamento recusado: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const parada = await pararMinhaRenovacao(user.id, { motivo: corpo.motivo, comentario: corpo.comentario });
  if (parada.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "parar a renovação");
  if (parada.resultado !== "ok") {
    const [status, error] = RECUSAS[parada.resultado];
    res.status(status).json({ error });
    return;
  }
  // `terminou`: a cobrança estava atrasada, e a assinatura acabou agora (sem data de acesso).
  const resposta: RenovacaoParada = parada.terminou ? { acessoAte: null, terminou: true } : { acessoAte: parada.acessoAte };
  res.json(resposta);
});

// POST /api/billing/minha-assinatura/manter — volta atrás: a assinatura torna a renovar.
router.post("/billing/minha-assinatura/manter", requireAuth, ...limiteDeTentativas.acao, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] manter a assinatura recusado: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const mantida = await manterMinhaAssinatura(user.id);
  if (mantida.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "manter a assinatura");
  if (mantida.resultado !== "ok") {
    const [status, error] = RECUSAS[mantida.resultado];
    res.status(status).json({ error });
    return;
  }
  res.status(204).end();
});

// POST /api/billing/minha-assinatura/reembolso — cancela NA HORA e devolve tudo o que foi pago
// nesta assinatura (etapa 4.6, sessão b). Só dentro do prazo, conferido no servidor. O corpo leva
// SÓ o motivo, opcional: quanto devolver e de qual assinatura, quem sabe é o servidor.
router.post("/billing/minha-assinatura/reembolso", requireAuth, ...limiteDeTentativas.acao, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const corpo = validate(cancelarSchema, req.body ?? {}, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] reembolso recusado: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const reembolso = await reembolsarMinhaAssinatura(user.id, { motivo: corpo.motivo, comentario: corpo.comentario });
  if (reembolso.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "reembolso");
  if (reembolso.resultado !== "ok") {
    const [status, error] = RECUSAS[reembolso.resultado];
    res.status(status).json({ error });
    return;
  }
  const resposta: ReembolsoFeito = { centavos: reembolso.centavos, moeda: reembolso.moeda };
  res.json(resposta);
});

// MUDAR DE PLANO (etapa 4.6, sessão b). Mensal → anual vale na hora, com o valor mostrado antes;
// anual → mensal vale no fim do período já pago, e dá para desistir. O site diz PARA QUAL plano
// e devolve o valor que mostrou; preço e assinatura são do servidor, e o valor só é cobrado
// depois de conferido lá (`lib/meu-plano.ts`).

// GET /api/billing/minha-assinatura/plano — a troca que esta conta pode fazer agora, já com a
// conta da Stripe (quanto se paga hoje, ou quando a troca vale). Não muda nada.
router.get("/billing/minha-assinatura/plano", requireAuth, ...limiteDeTentativas.leitura, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] troca de plano recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const oferta = await lerTrocaDePlano(user.id);
  if (oferta.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "mudar de plano");
  if (oferta.resultado !== "ok") {
    const [status, error] = RECUSAS[oferta.resultado];
    res.status(status).json({ error });
    return;
  }
  const resposta: TrocaDisponivel = { troca: oferta.troca };
  res.json(resposta);
});

// POST /api/billing/minha-assinatura/plano — muda o plano. O segredo da confirmação do banco,
// quando há, vai SÓ na resposta.
router.post("/billing/minha-assinatura/plano", requireAuth, ...limiteDeTentativas.cobranca, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const corpo = validate(mudarDePlanoSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] troca de plano recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const mudanca = await mudarMeuPlano(user.id, { plano: corpo.plano, valorMostrado: corpo.valorMostrado });
  if (mudanca.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "mudar de plano");
  if (mudanca.resultado !== "ok") {
    const [status, error] = RECUSAS[mudanca.resultado];
    res.status(status).json({ error });
    return;
  }
  const resposta: PlanoMudado = mudanca.estado === "confirmar" ? { estado: "confirmar", segredo: mudanca.segredo } : mudanca.estado === "marcado" ? { estado: "marcado", em: mudanca.em } : { estado: "trocado" };
  res.json(resposta);
});

// POST /api/billing/minha-assinatura/plano/desistir — desfaz a troca marcada, ou a que ficou
// esperando a confirmação do banco. Sem corpo.
router.post("/billing/minha-assinatura/plano/desistir", requireAuth, ...limiteDeTentativas.acao, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] desistência da troca recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const desistencia = await desistirDaTroca(user.id);
  if (desistencia.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "desistir da troca de plano");
  if (desistencia.resultado !== "ok") {
    const [status, error] = RECUSAS[desistencia.resultado];
    res.status(status).json({ error });
    return;
  }
  const resposta: TrocaDesfeita = { trocado: desistencia.trocado, plano: desistencia.plano ?? null };
  res.json(resposta);
});

export default router;
