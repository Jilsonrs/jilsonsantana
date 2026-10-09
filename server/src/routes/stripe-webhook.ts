import express, { Router } from "express";
import { avisosConfigurados, verificarAviso } from "../lib/stripe.js";
import { processarAviso } from "../lib/assinaturas.js";
import { assinaturaDaAcesso } from "../lib/acesso.js";

// O AVISO DA STRIPE (webhook — Fase 4, etapa 4.1; CLAUDE.md → Membership Gating). Montado em
// `app.ts` ACIMA do `express.json()`: a verificação precisa do corpo CRU, byte a byte — com o
// corpo já lido como JSON, ela falharia em silêncio. A ordem é a da regra: verifica → marca o
// aviso e atualiza o espelho (uma transação, uma assinatura de cada vez) → responde 200. Falha
// no meio → 5xx, e a Stripe entrega de novo.
// O REGISTRO leva ids e status — nunca o corpo do aviso nem segredo. E nenhuma recusa fica muda
// (achado P2 da revisão de segurança, 09/10/2026): o segredo ausente ou trocado no Railway
// recusaria TODO aviso, e só o painel da Stripe mostraria.

const router = Router();

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
    console.warn(`[stripe] aviso recusado (a assinatura não confere): ${erro instanceof Error ? erro.message : "?"}`);
    res.status(400).json({ error: "AssinaturaInvalida" });
    return;
  }
  const desfecho = await processarAviso(aviso);
  if (desfecho.resultado === "sem-conta") {
    // Assinatura sem conta na escola: em voz alta. Se ela dá acesso, há alguém PAGANDO e trancado
    // fora (achado P1 da revisão) — o force-sync (etapa 4.4) conserta depois que a conta existir.
    const { id, clienteId, status, pagoAte } = desfecho.assinatura;
    const linha = `[stripe] aviso ${aviso.id} (${aviso.tipo}): assinatura ${id} do cliente ${clienteId} (${status}) SEM CONTA — ${desfecho.motivo}`;
    if (assinaturaDaAcesso({ status, currentPeriodEnd: pagoAte })) console.error(`${linha}; ela dá acesso: o assinante está trancado fora`);
    else console.warn(linha);
  } else {
    const qual = "assinatura" in desfecho ? ` — assinatura ${desfecho.assinatura.id} (${desfecho.assinatura.status})` : "";
    console.info(`[stripe] aviso ${aviso.id} (${aviso.tipo}): ${desfecho.resultado}${qual}`);
  }
  res.json({ recebido: true });
});

export default router;
