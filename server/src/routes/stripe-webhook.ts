import { alertarConfiguracaoAusente } from "../lib/alerta-de-configuracao.js";
import express, { Router } from "express";
import { avisoExisteNaStripe, avisosConfigurados, idDoAvisoNoCorpo, pareceAvisoDaStripe, verificarAviso } from "../lib/stripe.js";
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
 * O AVISO QUE NÃO CONFERE (E5 da revisão ampla da cobrança, e C1 da revisão do grupo 1, 29/10/2026) só vira ALERTA
 * quando a Stripe confirma que ele é dela (`avisoExisteNaStripe`): aí o segredo do endereço de avisos está trocado e
 * TODO aviso de verdade está sendo recusado. O forjado — que um robô manda à vontade, com um cabeçalho de formato
 * certo — continua só registro (CLAUDE.md → Server: o que um robô causa sozinho nunca é `error`).
 * Dois limites, os dois POR CÓPIA, na memória dela, de propósito (CLAUDE.md: só fica por cópia o que protege um
 * recurso da própria cópia): no máximo UMA pergunta à Stripe por minuto (o robô não faz o site gastar a cota da API
 * da Stripe) e no máximo UM alerta a cada 15 minutos (a cota de alertas também é por cópia — `monitor.ts`).
 */
const INTERVALO_DA_CONFERENCIA_DO_AVISO = 60_000;
const INTERVALO_DO_ALERTA_DE_ASSINATURA = 15 * 60_000;
let conferiuAvisoEm: number | null = null;
let alertouAssinaturaEm: number | null = null;

/** Passou o intervalo desde a última vez? Marca agora, se sim. O relógio que volta atrás não cala o limite para sempre. */
function passouDesde(ultima: number | null, agora: number, intervalo: number): boolean {
  return ultima === null || agora < ultima || agora - ultima >= intervalo;
}

function conferirAvisoNaStripeAgora(agora: number): boolean {
  if (!passouDesde(conferiuAvisoEm, agora, INTERVALO_DA_CONFERENCIA_DO_AVISO)) return false;
  conferiuAvisoEm = agora;
  return true;
}

function alertarAssinaturaQueNaoConfere(agora: number): boolean {
  if (!passouDesde(alertouAssinaturaEm, agora, INTERVALO_DO_ALERTA_DE_ASSINATURA)) return false;
  alertouAssinaturaEm = agora;
  return true;
}

// POST /api/stripe/webhook
router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  // Sem o segredo, nenhum aviso é aceito — nunca "aceitar sem verificar".
  if (!avisosConfigurados()) {
    alertarConfiguracaoAusente("[stripe] aviso recusado: STRIPE_WEBHOOK_SECRET não configurado");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  let aviso;
  try {
    aviso = verificarAviso(req.body, req.header("stripe-signature"));
  } catch (erro) {
    // Só a mensagem: o erro de verificação da Stripe carrega o corpo inteiro do aviso.
    const motivo = erro instanceof Error ? erro.message : "?";
    // O cabeçalho é da Stripe e recente, o corpo traz um `id` de aviso, e a Stripe confirma que o aviso é dela: o
    // segredo do endereço de avisos não é o deste servidor — alerta (E5, C1). O resto (sem cabeçalho, malformado,
    // velho, forjado, ou a Stripe sem responder) é registro; a rodada (E1) acha o segredo trocado de qualquer jeito.
    const agora = Date.now();
    const id = pareceAvisoDaStripe(req.header("stripe-signature"), agora) ? idDoAvisoNoCorpo(req.body) : null;
    const daStripe = id !== null && conferirAvisoNaStripeAgora(agora) && (await avisoExisteNaStripe(id));
    if (daStripe && alertarAssinaturaQueNaoConfere(agora)) {
      console.error(`[stripe] aviso recusado: a Stripe confirma que o aviso é dela, e a assinatura não confere — o segredo do endereço de avisos (STRIPE_WEBHOOK_SECRET, no Secret Manager) não é o do painel da Stripe: TODO aviso de verdade está sendo recusado (${motivo})`);
      console.warn(`[stripe] aviso recusado: o aviso conferido na Stripe foi o ${id}`);
    } else {
      console.warn(`[stripe] aviso recusado (a assinatura não confere${daStripe ? `; o aviso ${id} é da Stripe` : ""}): ${motivo}`);
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
