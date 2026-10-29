import express, { Router } from "express";
import { avisosConfigurados, verificarAviso } from "../lib/stripe.js";
import { processarAviso } from "../lib/assinaturas.js";
import { assinaturaDaAcesso } from "../lib/acesso.js";
import { mandarBoasVindasDaAssinatura } from "../lib/boas-vindas.js";
import { avisarSobreAAssinatura } from "../lib/avisos-da-assinatura.js";

// O AVISO DA STRIPE (webhook — Fase 4, etapa 4.1; CLAUDE.md → Membership Gating). Montado em
// `app.ts` ACIMA do `express.json()`: a verificação precisa do corpo CRU, byte a byte — com o
// corpo já lido como JSON, ela falharia em silêncio. A ordem é a da regra: verifica → marca o
// aviso e atualiza o espelho (uma transação, uma assinatura de cada vez) → responde 200. Falha
// no meio → 5xx, e a Stripe entrega de novo.
// O REGISTRO leva ids e status — nunca o corpo do aviso nem segredo. E nenhuma recusa fica muda
// (achado P2 da revisão de segurança, 09/10/2026): o segredo ausente ou trocado no Secret Manager
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
  // Precisa de gente: a devolução que falhou é dinheiro que NÃO voltou. Uma vez por aviso — o
  // repetido (a reentrega) não alerta de novo; e se o processamento falhar, a Stripe entrega de
  // novo e o alerta sai então.
  if (aviso.devolucaoFalhou && desfecho.resultado !== "repetido") console.error(`[stripe] aviso ${aviso.id} (${aviso.tipo}): uma devolução do pagamento ${aviso.pagamento ?? "?"} FALHOU — o dinheiro não voltou ao aluno; conferir e devolver pelo painel da Stripe`);
  // O PIX PAGO que terminou SEM ACESSO (achado 5 do passo 6 da etapa 4.9, 29/10/2026): o dinheiro
  // entrou e a assinatura não abre (incompleta, sem assinatura, ou sem conta) — pagante trancado, que
  // hoje só o aluno descobriria. Uma vez por aviso, como a devolução que falhou.
  if (aviso.pagamentoPrePago && desfecho.resultado !== "repetido") {
    const semAcesso = !("assinatura" in desfecho) || !assinaturaDaAcesso({ status: desfecho.assinatura.status, currentPeriodEnd: desfecho.assinatura.pagoAte });
    if (semAcesso) console.error(`[stripe] aviso ${aviso.id}: o Pix ${aviso.pagamentoPrePago.id} foi PAGO e ${"assinatura" in desfecho ? `a assinatura ${desfecho.assinatura.id} (${desfecho.assinatura.status})` : "nenhuma assinatura"} dá acesso — pagante trancado; conferir no painel da Stripe`);
  }
  if (desfecho.resultado === "sem-conta") {
    // Assinatura sem conta na escola: em voz alta. Se ela dá acesso, há alguém PAGANDO e trancado
    // fora (achado P1 da revisão) — o force-sync (etapa 4.4) conserta depois que a conta existir.
    const { id, clienteId, status, pagoAte } = desfecho.assinatura;
    const linha = `[stripe] aviso ${aviso.id} (${aviso.tipo}): assinatura ${id} do cliente ${clienteId} (${status}) SEM CONTA — ${desfecho.motivo}`;
    if (assinaturaDaAcesso({ status, currentPeriodEnd: pagoAte })) console.error(`${linha}; ela dá acesso: o assinante está trancado fora`);
    // A tentativa do visitante que ainda não foi paga (etapa 4.7, passo 4): o normal de toda
    // assinatura dele até o pagamento passar — a conta nasce no aviso seguinte. Não é aviso.
    else if (desfecho.motivo === "aguardando o pagamento") console.info(linha);
    else console.warn(linha);
  } else {
    const qual = "assinatura" in desfecho ? ` — assinatura ${desfecho.assinatura.id} (${desfecho.assinatura.status})` : "";
    // A conta tinha acesso e deixou de ter: as sessões dela caíram junto (etapa 4.4).
    const caiu = desfecho.resultado === "atualizada" && desfecho.perdeuAcesso ? "; a conta perdeu o acesso: sessões encerradas" : "";
    // A conta do visitante nasceu agora, do pagamento (etapa 4.7, passo 4) — o id, nunca o e-mail.
    const nasceu = desfecho.resultado === "atualizada" && desfecho.contaNova ? `; a conta ${desfecho.contaNova} nasceu da ficha ${desfecho.assinatura.pedido ?? "?"}` : "";
    console.info(`[stripe] aviso ${aviso.id} (${aviso.tipo}): ${desfecho.resultado}${qual}${caiu}${nasceu}`);
  }
  // As boas-vindas de quem assinou sem conta (etapa 4.7, passo 5): DEPOIS do commit, e em todo aviso
  // da assinatura — inclusive o repetido —, até sair uma vez. Nunca derruba este 200. A assinatura que
  // NASCEU de um Pix pré-pago (etapa 4.9) só é conhecida depois de processar o aviso.
  const assinaturaDoAviso = aviso.assinatura ?? ("assinatura" in desfecho ? desfecho.assinatura.id : null);
  if (assinaturaDoAviso) await mandarBoasVindasDaAssinatura(assinaturaDoAviso);
  // Os e-mails da cobrança (etapa 4.7, passo 7): a cobrança que falhou, o aviso antes de trancar, a
  // assinatura que terminou — com o que a Stripe acabou de dizer, DEPOIS do commit, uma vez cada. O
  // aviso repetido não traz a assinatura de agora: o que ficar para trás, a rodada do agendador manda.
  if (desfecho.resultado === "atualizada") await avisarSobreAAssinatura(desfecho.assinatura);
  res.json({ recebido: true });
});

export default router;
