import { Router } from "express";
import type { PlanosDaAssinatura } from "@jilson/core";
import { requireAuth } from "../middleware/auth.js";
import { buscarPrecos, chavePublicavel, cobrancaConfigurada } from "../lib/stripe.js";

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

export default router;
