import { Router } from "express";
import { sincronizarContaSchema, type SincroniaDaConta } from "@jilson/core";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { cobrancaConfigurada } from "../lib/stripe.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { sincronizarConta, sincronizarPedido, type Conferida } from "../lib/assinaturas.js";
import { mandarBoasVindasDaAssinatura } from "../lib/boas-vindas.js";

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
  const email = corpo.email.toLowerCase();
  let conta = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  let conferidas: Conferida[];
  if (conta) conferidas = await sincronizarConta(conta.id);
  else {
    // QUEM PAGOU SEM CONTA e ficou sem ela (etapa 4.7, passo 4): o aviso da Stripe se perdeu, e a
    // conta só nasce na sincronia. Confere a ficha de espera deste e-mail — se o pagamento passou,
    // a conta nasce aqui. Sem ficha, ou sem pagamento, continua não existindo conta com o e-mail.
    const daFicha = await sincronizarPedido(email);
    conta = daFicha ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
    if (!daFicha || !conta) {
      if (daFicha) console.info(`[stripe] sincronia pelo admin ${req.user?.id}: a ficha de espera conferida segue sem conta → ${daFicha.map((a) => `${a.id} ${a.resultado}`).join(", ") || "nenhuma assinatura"}`);
      res.status(404).json({ error: "ContaNaoEncontrada" });
      return;
    }
    conferidas = daFicha;
    // A conta nasceu nesta conferência: as boas-vindas saem daqui (depois do commit; uma vez só).
    for (const a of daFicha) if (a.resultado === "atualizada") await mandarBoasVindasDaAssinatura(a.id);
  }
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
