import { Router } from "express";
import { sincronizarContaSchema, type SincroniaDaConta } from "@jilson/core";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { cobrancaConfigurada } from "../lib/stripe.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { sincronizarConta } from "../lib/assinaturas.js";

// FORÇAR A SINCRONIA COM A STRIPE (Fase 4, etapa 4.4 — billing.md; CLAUDE.md → Membership Gating,
// "Force-sync"). É a RECUPERAÇÃO de quando um aviso da Stripe se perde: o assinante pagando e
// trancado fora, ou o acesso que continua depois de a Stripe encerrar a assinatura.
// SÓ ADMIN, sempre: uma rota aberta que "confere e libera" seria um desvio da cobrança. E ela
// não escolhe nada — o admin diz só DE QUEM (o e-mail); quais assinaturas conferir e o que
// gravar saem da Stripe, pela mesma rotina do aviso (`lib/assinaturas.ts`).
// O registro leva ids e status; o e-mail digitado não vai para ele.

const router = Router();

// POST /api/admin/assinaturas/sincronizar
router.post("/admin/assinaturas/sincronizar", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const corpo = validate(sincronizarContaSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] sincronia recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  // AO PÉ DA LETRA, em minúsculas — como o login acha a conta (o Better Auth grava e busca o
  // e-mail assim). A busca "sem diferenciar maiúsculas" do banco NÃO serve: nela o "_" vale por
  // qualquer caractere, e um e-mail parecido conferiria a conta de outra pessoa (achado da
  // revisão de segurança da etapa 4.4, medido).
  const conta = await prisma.user.findUnique({ where: { email: corpo.email.toLowerCase() }, select: { id: true } });
  if (!conta) {
    res.status(404).json({ error: "ContaNaoEncontrada" });
    return;
  }
  const conferidas = await sincronizarConta(conta.id);
  const temAcesso = await temAcessoAtivo(conta.id);
  const resumo = conferidas.map((a) => `${a.id} ${"assinatura" in a ? `${a.resultado} (${a.assinatura.status})` : a.resultado}`).join(", ") || "nenhuma assinatura";
  console.info(`[stripe] sincronia pelo admin ${req.user?.id}: conta ${conta.id} → ${resumo}; acesso: ${temAcesso ? "sim" : "não"}`);
  const resposta: SincroniaDaConta = {
    temAcesso,
    assinaturas: conferidas.map((a) =>
      "assinatura" in a
        ? { id: a.id, resultado: a.resultado, status: a.assinatura.status, pagoAte: a.assinatura.pagoAte?.toISOString() ?? null }
        : { id: a.id, resultado: a.resultado, status: null, pagoAte: null },
    ),
  };
  res.json(resposta);
});

export default router;
