import { Router } from "express";
import { assinarSchema, previaSchema, type AssinaturaCriada, type PlanosDaAssinatura, type PreviaDaAssinatura, type SituacaoDaAssinatura } from "@jilson/core";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { buscarCodigo, buscarPrecos, calcularPrevia, chavePublicavel, cobrancaConfigurada, FORMAS_DE_PAGAMENTO } from "../lib/stripe.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { assinar } from "../lib/checkout.js";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2 — billing.md; CLAUDE.md → Membership Gating).
// Tudo aqui exige login, e a conta é SEMPRE a da sessão. O site diz só QUAL plano e o código
// promocional: preço, valor e conta nunca vêm do navegador. Quem grava o espelho da assinatura
// continua sendo só o aviso da Stripe (`stripe-webhook.ts`).

const router = Router();

// GET /api/billing/planos — os dois planos com o valor lido da Stripe (o mostrado é o cobrado) e
// a chave que o site usa para abrir o campo do cartão.
router.get("/billing/planos", requireAuth, async (_req, res) => {
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
router.post("/billing/previa", requireAuth, async (req, res) => {
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
  const resposta: SituacaoDaAssinatura = { temAcesso: await temAcessoAtivo(user.id) };
  res.json(resposta);
});

// POST /api/billing/assinatura — assinar. A regra inteira mora em `lib/checkout.ts`; aqui, só a
// conta da SESSÃO (o corpo não diz de quem é) e a resposta. O segredo do pagamento vai SÓ na
// resposta — nunca para o registro.
router.post("/billing/assinatura", requireAuth, async (req, res) => {
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
  if (desfecho.resultado === "codigo-invalido") {
    res.status(400).json({ error: "CodigoInvalido" });
    return;
  }
  const resposta: AssinaturaCriada = desfecho.resultado === "ativa" ? { estado: "ativa" } : { estado: "pagar", segredo: desfecho.segredo, tipo: desfecho.tipo };
  res.json(resposta);
});

export default router;
