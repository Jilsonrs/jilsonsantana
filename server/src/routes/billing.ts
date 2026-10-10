import { Router } from "express";
import { previaSchema, type PlanosDaAssinatura, type PreviaDaAssinatura } from "@jilson/core";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { buscarCodigo, buscarPrecos, calcularPrevia, chavePublicavel, cobrancaConfigurada } from "../lib/stripe.js";

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

export default router;
