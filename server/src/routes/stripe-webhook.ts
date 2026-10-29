import express, { Router } from "express";
import { avisosConfigurados, pareceAvisoDaStripe, verificarAviso } from "../lib/stripe.js";
import { processarAviso } from "../lib/assinaturas.js";
import { depoisDoAviso } from "../lib/depois-do-aviso.js";

// O AVISO DA STRIPE (webhook — Fase 4, etapa 4.1; CLAUDE.md → Membership Gating). Montado em
// `app.ts` ACIMA do `express.json()`: a verificação precisa do corpo CRU, byte a byte — com o
// corpo já lido como JSON, ela falharia em silêncio. A ordem é a da regra: verifica → marca o
// aviso e atualiza o espelho (uma transação, uma assinatura de cada vez) → responde 200. Falha
// no meio → 5xx, e a Stripe entrega de novo.
// O REGISTRO leva ids e status — nunca o corpo do aviso nem segredo. E nenhuma recusa fica muda
// (achado P2 da revisão de segurança, 09/10/2026): o segredo ausente ou trocado no Secret Manager
// recusaria TODO aviso, e só o painel da Stripe mostraria.

const router = Router();

/**
 * O ALERTA DO AVISO QUE NÃO CONFERE (E5 da revisão ampla da cobrança, 29/10/2026): no máximo um a cada 15 minutos
 * POR CÓPIA do servidor, na memória dela. É por cópia de propósito (CLAUDE.md → Server: só fica por cópia o que
 * protege um recurso da própria cópia): ele protege a cota de alertas, que também é por cópia (`monitor.ts`) — um
 * robô forjando avisos a gastaria, e o alerta seguinte de pagante trancado ficaria só no registro.
 */
const INTERVALO_DO_ALERTA_DE_ASSINATURA = 15 * 60_000;
let alertouAssinaturaEm: number | null = null;

function alertarAssinaturaQueNaoConfere(agora: number): boolean {
  // O relógio que volta atrás não cala o alerta para sempre.
  if (alertouAssinaturaEm !== null && agora >= alertouAssinaturaEm && agora - alertouAssinaturaEm < INTERVALO_DO_ALERTA_DE_ASSINATURA) return false;
  alertouAssinaturaEm = agora;
  return true;
}

// POST /api/stripe/webhook
router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  // Sem o segredo, nenhum aviso é aceito — nunca "aceitar sem verificar".
  if (!avisosConfigurados()) {
    console.error("[stripe] aviso recusado: STRIPE_WEBHOOK_SECRET não configurado");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  let aviso;
  try {
    aviso = verificarAviso(req.body, req.header("stripe-signature"));
  } catch (erro) {
    // Só a mensagem: o erro de verificação da Stripe carrega o corpo inteiro do aviso.
    const motivo = erro instanceof Error ? erro.message : "?";
    // O cabeçalho é da Stripe e recente, e mesmo assim não confere: o segredo do endereço de avisos não é o deste
    // servidor (aí TODO aviso de verdade está sendo recusado), ou alguém forja com cuidado — alerta (E5). O resto
    // (sem cabeçalho, malformado, velho) é ruído de robô: só registro.
    const agora = Date.now();
    if (pareceAvisoDaStripe(req.header("stripe-signature"), agora) && alertarAssinaturaQueNaoConfere(agora)) {
      console.error(`[stripe] aviso recusado: o cabeçalho é da Stripe e recente, e a assinatura não confere — se o segredo do endereço de avisos (STRIPE_WEBHOOK_SECRET, no Secret Manager) não for o do painel da Stripe, TODO aviso de verdade está sendo recusado; conferir as entregas no painel (${motivo})`);
    } else {
      console.warn(`[stripe] aviso recusado (a assinatura não confere): ${motivo}`);
    }
    res.status(400).json({ error: "AssinaturaInvalida" });
    return;
  }
  const desfecho = await processarAviso(aviso);
  // Os alertas, o registro, as boas-vindas e os e-mails da cobrança: os MESMOS da conferência da rodada, que
  // processa o aviso que não chegou (`depois-do-aviso.ts`; E1 da revisão ampla da cobrança). Nunca derruba este 200.
  await depoisDoAviso(aviso, desfecho);
  res.json({ recebido: true });
});

export default router;
