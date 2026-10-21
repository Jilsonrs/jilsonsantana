import { Router } from "express";
import { pedirCodigoSchema, type CodigoPedido, type MotivoDoCodigo } from "@jilson/core";
import { auth } from "../lib/auth.js";
import { validate } from "../lib/http.js";
import { limiteDoCodigo } from "../lib/limite-de-tentativas.js";

// PEDIR O CÓDIGO NO E-MAIL (Fase 4, etapa 4.7, passo 5 — decisões do operador, 21/10/2026): para
// ENTRAR sem senha ("Receber código de acesso") e para criar uma SENHA nova ("Esqueci minha senha").
// É a ÚNICA porta para pedir código: as do próprio recurso do Better Auth ficam desligadas
// (`disabledPaths`, em `lib/auth.ts`), porque esta é a que tem os limites — sem eles, o site serviria
// para encher a caixa de e-mail de alguém e gastar a cota de e-mails da escola.
// - A resposta é a MESMA exista a conta ou não: quem pede não descobre nada (e nenhum código sai para
//   e-mail sem conta — entrar por código nunca cria conta).
// - O código se GASTA nas rotas do Better Auth: `/api/auth/sign-in/email-otp` (entrar) e
//   `/api/auth/email-otp/reset-password` (a senha nova), com 3 tentativas por código.
// - O registro leva só o que o balcão de e-mail registra: o tipo e o id da conta.

const router = Router();

/** O motivo da escola → o tipo do código no Better Auth. */
const TIPO_DO_CODIGO: Record<MotivoDoCodigo, "sign-in" | "forget-password"> = { entrar: "sign-in", senha: "forget-password" };

// POST /api/conta/codigo — { email, motivo: "entrar" | "senha" }
router.post(
  "/conta/codigo",
  (req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    // O pedido de OUTRO SITE é recusado (como nas rotas de cobrança): sem isso, uma página qualquer
    // faria o navegador de quem a visita pedir códigos para e-mails à escolha dela.
    if (req.get("sec-fetch-site") === "cross-site") {
      console.warn(`[api] ${req.method} ${req.baseUrl}${req.path} recusado: o pedido veio de outro site`);
      res.status(403).json({ error: "OutroSite" });
      return;
    }
    next();
  },
  ...limiteDoCodigo,
  async (req, res) => {
    const corpo = validate(pedirCodigoSchema, req.body, res);
    if (corpo === null) return;
    await auth.api.sendVerificationOTP({ body: { email: corpo.email.toLowerCase(), type: TIPO_DO_CODIGO[corpo.motivo] } });
    const resposta: CodigoPedido = { ok: true };
    res.json(resposta);
  },
);

export default router;
