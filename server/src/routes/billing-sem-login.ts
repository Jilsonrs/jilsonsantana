import { Router } from "express";
import { assinarSemLoginSchema, confirmacaoSemLoginSchema, previaSchema, type AssinaturaSemLogin, type ConfirmacaoSemLogin, type PlanosDaAssinatura, type PreviaDaAssinatura } from "@jilson/core";
import { validate } from "../lib/http.js";
import { cobrancaConfigurada } from "../lib/stripe.js";
import { lerPlanos, lerPrevia } from "../lib/vitrine-da-assinatura.js";
import { assinarComoVisitante, pagamentoConfirmado } from "../lib/checkout-do-visitante.js";
import { contarClienteNovo, limiteSemLogin } from "../lib/limite-de-tentativas.js";
import { protecaoDaCobranca } from "../lib/protecao-da-cobranca.js";

// ASSINAR SEM LOGIN (Fase 4, etapa 4.7, passo 4 — billing.md → *Assinar sem conta*; CLAUDE.md →
// Membership Gating). As portas que a tela pública de assinar (passo 6) vai usar: os planos, a
// prévia do código, assinar e "o pagamento já valeu?". Nenhuma pede login — e por isso:
// - a conta NÃO nasce aqui: nasce na rotina do espelho, quando a Stripe diz que o pagamento passou
//   (`lib/pedido-do-visitante.ts`); o e-mail que já tem conta é mandado entrar, antes da Stripe;
// - o site diz o e-mail, o CPF ou CNPJ, o plano, o código, as novidades e a origem — preço, valor,
//   cliente e conta nunca vêm do navegador (`lib/checkout-do-visitante.ts`);
// - toda rota passa pelo limite de tentativas SEM LOGIN (por endereço; ao assinar, também por
//   e-mail e pelos e-mails novos do dia), antes de ir à Stripe;
// - FORA DO AR NO SITE até o dia de abrir (passo 8): sem `ASSINAR_SEM_LOGIN=true` na Railway, as
//   rotas respondem 404 em produção. Se a `dev` for publicada antes, o site não começa a vender
//   sem o e-mail de criar a senha (passo 5) e sem a tela (passo 6). Fora de produção, ligadas.
// O registro leva ids — nunca o e-mail, o CPF ou CNPJ, o código digitado ou o segredo do pagamento.

const router = Router();

/** As rotas sem login estão no ar? Em produção, só com a chave ligada na Railway (o operador liga no passo 8). */
export function assinaturaSemLoginNoAr(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" || env.ASSINAR_SEM_LOGIN === "true";
}

router.use("/billing/visitante", (_req, res, next) => {
  if (!assinaturaSemLoginNoAr()) {
    res.status(404).json({ error: "NaoEncontrado" });
    return;
  }
  next();
}, protecaoDaCobranca);

// GET /api/billing/visitante/planos — os dois planos com o valor da Stripe e a chave do campo do cartão.
router.get("/billing/visitante/planos", ...limiteSemLogin.leitura, async (_req, res) => {
  const resposta: PlanosDaAssinatura | null = cobrancaConfigurada() ? await lerPlanos() : null;
  if (!resposta) {
    console.error("[stripe] planos (sem login) recusados: STRIPE_SECRET_KEY ou STRIPE_PUBLISHABLE_KEY ausente ou trocada");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  res.json(resposta);
});

// POST /api/billing/visitante/previa — quanto fica HOJE com o código promocional. Com teto por dia
// (decisão do operador, 21/10/2026): sem login, qualquer pessoa confere código.
router.post("/billing/visitante/previa", ...limiteSemLogin.previa, async (req, res) => {
  const corpo = validate(previaSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] prévia (sem login) recusada: STRIPE_SECRET_KEY ausente");
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

// POST /api/billing/visitante/assinatura — assinar sem conta. A regra inteira mora em
// `lib/checkout-do-visitante.ts`. O segredo do pagamento e o código da tentativa vão SÓ na resposta.
router.post("/billing/visitante/assinatura", ...limiteSemLogin.assinar, async (req, res) => {
  const corpo = validate(assinarSemLoginSchema, req.body, res);
  if (corpo === null) return;
  if (!cobrancaConfigurada()) {
    console.error("[stripe] assinatura (sem login) recusada: STRIPE_SECRET_KEY ausente");
    res.status(503).json({ error: "NaoConfigurado" });
    return;
  }
  // O teto dos e-mails novos do dia conta só quando um cliente novo vai mesmo nascer na Stripe.
  const desfecho = await assinarComoVisitante(corpo, { antesDeCriarCliente: () => contarClienteNovo(req) });
  if (desfecho.resultado === "ja-tem-conta") {
    // A tela avisa e manda entrar (decisão do operador, 21/10/2026).
    res.status(409).json({ error: "JaTemConta" });
    return;
  }
  if (desfecho.resultado === "ocupada") {
    res.status(409).json({ error: "Ocupada" });
    return;
  }
  if (desfecho.resultado === "codigo-invalido") {
    res.status(400).json({ error: "CodigoInvalido" });
    return;
  }
  if (desfecho.resultado === "muitos-emails-novos") {
    res.set("Retry-After", String(desfecho.segundos));
    res.status(429).json({ error: "MuitasTentativas" });
    return;
  }
  if (desfecho.resultado === "documento-recusado") {
    res.status(400).json({ error: "DocumentoInvalido" });
    return;
  }
  const resposta: AssinaturaSemLogin =
    desfecho.resultado === "ativa" ? { estado: "ativa", tentativa: desfecho.tentativa } : { estado: "pagar", segredo: desfecho.segredo, tipo: desfecho.tipo, tentativa: desfecho.tentativa };
  res.json(resposta);
});

// POST /api/billing/visitante/confirmacao — "o pagamento já valeu?": a tela de depois do pagamento
// pergunta até a resposta ser sim. Só sim ou não, pelo código da tentativa. POST, e não GET: o
// código não vai para o endereço, que fica no registro da hospedagem.
router.post("/billing/visitante/confirmacao", ...limiteSemLogin.confirmacao, async (req, res) => {
  const corpo = validate(confirmacaoSemLoginSchema, req.body, res);
  if (corpo === null) return;
  const resposta: ConfirmacaoSemLogin = { confirmada: await pagamentoConfirmado(corpo.tentativa) };
  res.json(resposta);
});

export default router;
