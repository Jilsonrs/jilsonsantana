import { Router } from "express";
import { comVaga } from "../lib/assinaturas-em-andamento.js";
import { assinarSchema, campoNaoAbriuSchema, cancelarSchema, mudarDePlanoSchema, pixDaAtrasadaSchema, pixSchema, previaSchema, type AssinaturaCriada, type CartaoTrocado, type PlanosDaAssinatura, type PreviaDaAssinatura, type PlanoMudado, type ReembolsoFeito, type RenovacaoParada, type SituacaoDaAssinatura, type TrocaDeCartaoPreparada, type TrocaDesfeita, type TrocaDisponivel } from "@jilson/core";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { cobrancaConfigurada } from "../lib/stripe.js";
import { lerPlanos, lerPrevia } from "../lib/vitrine-da-assinatura.js";
import { protecaoDaCobranca } from "../lib/protecao-da-cobranca.js";
import { atrasadaSemAcesso, convidaAReativar, temAcessoAtivo } from "../lib/acesso.js";
import { assinar } from "../lib/checkout.js";
import { conferirPelaTela } from "../lib/conferencia-pela-tela.js";
import { prisma } from "../lib/prisma.js";
import { pagarComPix } from "../lib/pix-pre-pago.js";
import { pagarAAtrasadaComPix } from "../lib/pix-da-atrasada.js";
import { pixConfigurado } from "../lib/stripe-pix.js";
import { minhasCobrancas } from "../lib/minhas-cobrancas.js";
import { reciboDaConta } from "../lib/recibo.js";
import { desistirDaTroca, lerTrocaDePlano, mudarMeuPlano } from "../lib/meu-plano.js";
import { aplicarCartaoNovo, lerMinhaAssinatura, manterMinhaAssinatura, pararMinhaRenovacao, prepararTrocaDeCartao, reembolsarMinhaAssinatura, registrarAssinaturaDesconhecida } from "../lib/minha-assinatura.js";
import { enderecoDoPedido, limiteDeTentativas, limiteSemLogin } from "../lib/limite-de-tentativas.js";
import { marcaDoEndereco } from "../lib/loja-de-tentativas.js";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2 — billing.md; CLAUDE.md → Membership Gating).
// Tudo aqui exige login, e a conta é SEMPRE a da sessão. O site diz só QUAL plano e o código
// promocional: preço, valor e conta nunca vêm do navegador. Quem grava o espelho da assinatura
// continua sendo só o aviso da Stripe (`stripe-webhook.ts`).
// MINHA ASSINATURA (etapa 4.6): o que a tela de Faturamento e Assinatura lê e faz também mora
// aqui — e o site continua sem dizer de quem nem QUAL assinatura.
// O LIMITE DE TENTATIVAS (etapa 4.7, passo 1): toda rota que vai à Stripe passa por um, logo
// depois do `requireAuth` — rota nova daqui que vá à Stripe também (`lib/limite-de-tentativas.ts`).

const router = Router();

// Nada em cache, e o pedido que muda alguma coisa vindo de outro site é recusado — a mesma
// proteção das rotas sem login (`lib/protecao-da-cobranca.ts`).
router.use("/billing", protecaoDaCobranca);

// GET /api/billing/planos — os dois planos com o valor lido da Stripe (o mostrado é o cobrado) e
// a chave que o site usa para abrir o campo do cartão.
/**
 * O ALERTA DO CAMPO QUE NÃO ABRIU (E3 da revisão ampla da cobrança; C2 e R2 das revisões do grupo 1, 29/10/2026): o
 * relato chega SEM login, então um robô o manda à vontade. O alerta sai quando, numa janela de 6 horas, os relatos vêm
 * de pelo menos 3 endereços diferentes — é isso que diz "defeito nosso" (muita gente); um endereço só é um aluno (o
 * bloqueador, o navegador, e a tela já lhe diz o que fazer) ou um robô, e fica no registro. No máximo UM alerta a cada
 * 6 horas POR CÓPIA. O endereço conta pela chave do limite de tentativas (R3: o IPv6 pelo bloco /56 — um robô num
 * bloco é um endereço só), e vai só a marca dele, nunca o IP. Por cópia, na memória dela, de propósito (CLAUDE.md →
 * Server): protege a cota de alertas, que também é por cópia (`monitor.ts`).
 */
const INTERVALO_DO_ALERTA_DO_CAMPO = 6 * 60 * 60_000;
/** Quantos endereços diferentes, na mesma janela, fazem o alerta sair. */
const ENDERECOS_PARA_ALERTAR = 3;
/** Até quantos endereços distintos a cópia conta numa janela: o resto conta como relato, não como endereço novo. */
const MAXIMO_DE_ENDERECOS_CONTADOS = 1_000;
let janelaDoCampoDesde: number | null = null;
let alertouCampoEm: number | null = null;
let relatosNaJanela = 0;
const enderecosNaJanela = new Set<string>();

/** Passaram as 6 h desde `desde`? O relógio que volta atrás não segura nada para sempre. */
function passaramSeisHoras(desde: number | null, agora: number): boolean {
  return desde === null || agora < desde || agora - desde >= INTERVALO_DO_ALERTA_DO_CAMPO;
}

/** Conta o relato; devolve o resumo da janela para alertar (com este), ou nada. */
function contarRelatoDoCampo(marca: string, agora: number): { relatos: number; enderecos: number } | null {
  if (passaramSeisHoras(janelaDoCampoDesde, agora)) {
    janelaDoCampoDesde = agora;
    relatosNaJanela = 0;
    enderecosNaJanela.clear();
  }
  relatosNaJanela += 1;
  if (enderecosNaJanela.size < MAXIMO_DE_ENDERECOS_CONTADOS) enderecosNaJanela.add(marca);
  if (enderecosNaJanela.size < ENDERECOS_PARA_ALERTAR || !passaramSeisHoras(alertouCampoEm, agora)) return null;
  const resumo = { relatos: relatosNaJanela, enderecos: enderecosNaJanela.size };
  alertouCampoEm = agora;
  janelaDoCampoDesde = agora;
  relatosNaJanela = 0;
  enderecosNaJanela.clear();
  return resumo;
}

// POST /api/billing/campo-nao-abriu — a tela diz que o campo de pagamento da Stripe não abriu (E3): é o único jeito
// de o operador saber, porque o pedido de assinar nem chega aqui. Sem login (o visitante também paga), com o teto
// por endereço; o corpo diz só QUAL tela e QUAL falha (listas fechadas). Nada vai à Stripe.
router.post("/billing/campo-nao-abriu", ...limiteSemLogin.campoNaoAbriu, (req, res) => {
  const relato = validate(campoNaoAbriuSchema, req.body, res);
  if (relato === null) return;
  const chave = enderecoDoPedido(req);
  const marca = chave ? marcaDoEndereco(chave) : "sem-endereco";
  const resumo = contarRelatoDoCampo(marca, Date.now());
  if (resumo) {
    console.error(`[stripe] site: o campo de pagamento não abriu para ${resumo.enderecos} endereços diferentes em menos de 6 h (${resumo.relatos} relato(s)), o mais recente na tela ${relato.tela} (${relato.motivo}) — de vários endereços é defeito nosso (a chave publicável, as opções do campo, o Stripe.js): abrir a tela e conferir; o próximo alerta, só depois de 6 h`);
  } else {
    console.warn(`[stripe] site: o campo de pagamento não abriu na tela ${relato.tela} (${relato.motivo}), endereço ${marca}`);
  }
  res.status(204).end();
});

router.get("/billing/planos", requireAuth, ...limiteDeTentativas.leitura, async (_req, res) => {
  const resposta: PlanosDaAssinatura | null = cobrancaConfigurada() ? await lerPlanos() : null;
  if (!resposta) {
    // Em voz alta, e sem o valor: a variável pode estar com a chave errada dentro.
    console.error("[stripe] planos recusados: STRIPE_SECRET_KEY ou STRIPE_PUBLISHABLE_KEY ausente ou trocada");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
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
  const resposta: PreviaDaAssinatura | null = await lerPrevia(corpo);
  if (!resposta) {
    res.status(400).json({ error: "CodigoInvalido" });
    return;
  }
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

// POST /api/billing/conferir — a tela de depois do pagamento pede que o servidor confira na Stripe (E2 da revisão
// ampla da cobrança): o aviso pode ter se perdido. Só o cliente da conta da SESSÃO; quem já tem acesso nem vai à
// Stripe. Nunca espera trava (`conferirOCliente`). 204: a pergunta de sempre ("já tenho acesso?") vê o resultado —
// inclusive com a Stripe fora do ar, que vira registro e no máximo um alerta a cada 15 min (C4, `conferirPelaTela`).
router.post("/billing/conferir", requireAuth, ...limiteDeTentativas.conferir, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  if (!(await temAcessoAtivo(user.id))) {
    const cliente = await prisma.stripeCustomer.findUnique({ where: { userId: user.id }, select: { stripeCustomerId: true } });
    if (cliente) {
      // Com uma vaga das assinaturas: a conferência pode processar um Pix pago (até 180 s com uma ligação do banco).
      // Cheio, 204 sem conferir — a tela pergunta de novo no minuto seguinte (revisão do grupo 3 da 4.9b).
      const vaga = await comVaga(() => conferirPelaTela(cliente.stripeCustomerId, `a conta ${user.id}`));
      const feitas = vaga.cheio ? null : vaga.resultado;
      if (feitas) console.info(`[stripe] conferência pedida pela tela: a conta ${user.id}, ${feitas.length} assinatura(s) sincronizada(s), acesso ${(await temAcessoAtivo(user.id)) ? "sim" : "não"}`);
    }
  }
  res.status(204).end();
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
  // O MESMO teto das assinaturas sem login (`lib/assinaturas-em-andamento.ts`): cada uma segura uma
  // ligação com o banco enquanto a Stripe responde, e sempre ficam 2 livres para as aulas.
  const vaga = await comVaga(() => assinar({ id: user.id, email: user.email, nome: user.name ?? null }, corpo));
  if (vaga.cheio) {
    res.set("Retry-After", "2");
    res.status(409).json({ error: "MuitosAoMesmoTempo" });
    return;
  }
  const desfecho = vaga.resultado;
  if (desfecho.resultado === "ja-assinante") {
    res.status(409).json({ error: "JaAssinante" });
    return;
  }
  // Outro pedido desta conta está assinando agora (outra aba): nada foi feito; o novo clique segue
  // com a mesma assinatura (etapa 4.7, passo 2 — a trava que não espera).
  if (desfecho.resultado === "ocupada") {
    res.status(409).json({ error: "Ocupada" });
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
  // A Stripe recusou o CPF ou CNPJ que o `core` aceitou (a mesma resposta do visitante).
  if (desfecho.resultado === "documento-recusado") {
    res.status(400).json({ error: "DocumentoInvalido" });
    return;
  }
  // Um Pix desta conta foi pago e não virou assinatura sozinho: em conferência, nada de cobrar de novo (segunda revisão do passo 6 da 4.9).
  if (desfecho.resultado === "em-conferencia") {
    res.status(409).json({ error: "PixEmConferencia" });
    return;
  }
  const resposta: AssinaturaCriada = desfecho.resultado === "ativa" ? { estado: "ativa" } : { estado: "pagar", segredo: desfecho.segredo, tipo: desfecho.tipo };
  res.json(resposta);
});

// POST /api/billing/pix — pagar com PIX, pré-pago (etapa 4.9, passo 2). A regra mora em
// `lib/pix-pre-pago.ts`; aqui, só a conta da SESSÃO e a resposta. O segredo do pagamento vai SÓ na
// resposta — nunca para o registro. O mesmo limite e o mesmo teto do assinar com cartão.
router.post("/billing/pix", requireAuth, ...limiteDeTentativas.cobranca, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const corpo = validate(pixSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada() || !pixConfigurado()) {
    console.error("[stripe] pix recusado: STRIPE_SECRET_KEY ou STRIPE_PIX_CONFIGURATION ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const vaga = await comVaga(() => pagarComPix({ id: user.id, email: user.email, nome: user.name ?? null }, corpo));
  if (vaga.cheio) {
    res.set("Retry-After", "2");
    res.status(409).json({ error: "MuitosAoMesmoTempo" });
    return;
  }
  const desfecho = vaga.resultado;
  if (desfecho.resultado === "ja-assinante") {
    res.status(409).json({ error: "JaAssinante" });
    return;
  }
  if (desfecho.resultado === "ocupada") {
    res.status(409).json({ error: "Ocupada" });
    return;
  }
  // A cobrança do cartão falhou há mais de 3 dias: o caminho é trocar o cartão daquela assinatura, não um Pix por cima dela.
  if (desfecho.resultado === "atrasada") {
    res.status(409).json({ error: "CobrancaAtrasada" });
    return;
  }
  if (desfecho.resultado === "documento-recusado") {
    res.status(400).json({ error: "DocumentoInvalido" });
    return;
  }
  if (desfecho.resultado === "em-conferencia") {
    res.status(409).json({ error: "PixEmConferencia" });
    return;
  }
  const resposta: AssinaturaCriada = { estado: "pagar", segredo: desfecho.segredo, tipo: "pix", email: desfecho.email };
  res.json(resposta);
});

// POST /api/billing/minha-assinatura/pix — pagar com Pix a cobrança ATRASADA (4.9b, E14 — decisão do operador, P118):
// ENCERRA a assinatura atrasada da conta da SESSÃO e gera o Pix do mesmo plano. O corpo leva só o CPF ou CNPJ — qual
// assinatura e qual plano saem do servidor. A regra mora em `lib/pix-da-atrasada.ts`. O mesmo limite, o mesmo teto e as
// mesmas respostas do `POST /billing/pix`; sem atrasada (pagou no meio, ou nunca houve), 409 `NaoAtrasada`.
router.post("/billing/minha-assinatura/pix", requireAuth, ...limiteDeTentativas.cobranca, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const corpo = validate(pixDaAtrasadaSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada() || !pixConfigurado()) {
    console.error("[stripe] pix da atrasada recusado: STRIPE_SECRET_KEY ou STRIPE_PIX_CONFIGURATION ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  const vaga = await comVaga(() => pagarAAtrasadaComPix({ id: user.id, email: user.email, nome: user.name ?? null }, corpo.documento));
  if (vaga.cheio) {
    res.set("Retry-After", "2");
    res.status(409).json({ error: "MuitosAoMesmoTempo" });
    return;
  }
  const desfecho = vaga.resultado;
  // Toda resposta que não é o QR, com o seu código — o tipo obriga a cobrir cada uma.
  const recusa: Record<Exclude<typeof desfecho.resultado, "pagar">, [number, string]> = {
    "nao-atrasada": [409, "NaoAtrasada"],
    "ja-assinante": [409, "JaAssinante"],
    ocupada: [409, "Ocupada"],
    atrasada: [409, "CobrancaAtrasada"],
    "documento-recusado": [400, "DocumentoInvalido"],
    "em-conferencia": [409, "PixEmConferencia"],
  };
  if (desfecho.resultado !== "pagar") {
    const [status, error] = recusa[desfecho.resultado];
    res.status(status).json({ error });
    return;
  }
  const resposta: AssinaturaCriada = { estado: "pagar", segredo: desfecho.segredo, tipo: "pix", email: desfecho.email };
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

// GET /api/billing/minhas-cobrancas — as cobranças que passaram e o recibo de cada uma (etapa 4.7b, passo 6a — P144). A
// conta é a da sessão; os clientes dela, o servidor acha.
router.get("/billing/minhas-cobrancas", requireAuth, ...limiteDeTentativas.leitura, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] minhas cobranças recusadas: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  res.set("Cache-Control", "private, no-store");
  res.json(await minhasCobrancas(user.id));
});

// GET /api/billing/minhas-cobrancas/:chave — o RECIBO DA ESCOLA de uma cobrança (etapa 4.7b, passo 6a — decisões do
// operador, 31/10/2026). A cobrança se acha pela chave, só entre as da conta da sessão; os detalhes (o plano, o período, o
// preço, o desconto) vêm da Stripe na hora. Chave de outra conta, ou que não existe: 404, sem dizer qual dos dois.
router.get("/billing/minhas-cobrancas/:chave", requireAuth, ...limiteDeTentativas.leitura, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const chave = String(req.params.chave);
  if (!/^[0-9a-f]{16}$/.test(chave)) {
    res.status(400).json({ error: "ValidationError" });
    return;
  }
  if (!cobrancaConfigurada()) {
    console.error("[stripe] recibo recusado: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  res.set("Cache-Control", "private, no-store");
  const recibo = await reciboDaConta(user.id, chave);
  if (!recibo) {
    res.status(404).json({ error: "NaoEncontrado" });
    return;
  }
  res.json(recibo);
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
    const [status, error] = RECUSAS[preparo.resultado];
    res.status(status).json({ error });
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
  if (troca.resultado === "desconhecida") registrarAssinaturaDesconhecida(user.id, "trocar cartão");
  if (troca.resultado !== "ok") {
    const [status, error] = RECUSAS[troca.resultado];
    res.status(status).json({ error });
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
  // A pré-paga (etapa 4.9): nasceu de um Pix — não tem cartão, renovação nem troca de plano a mexer.
  "pre-paga": [409, "PrePago"],
  "sem-cartao-novo": [409, "CartaoNaoConfirmado"],
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
