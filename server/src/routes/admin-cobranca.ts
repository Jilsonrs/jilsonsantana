import { Router } from "express";
import { acharQuerySchema, fichaQuerySchema } from "@jilson/core";
import { requireAdmin } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { acharPeloCodigo, listarTentativas, montarFicha } from "../lib/ficha-da-cobranca.js";

// O PAINEL DA COBRANÇA — A FICHA DO ALUNO E O "ACHAR PELO CÓDIGO" (Fase 4, etapa 4.7b, passo 1c). Só admin, só
// leitura: nenhuma destas rotas muda nada na Stripe nem no banco. As operações moram em `lib/ficha-da-cobranca.ts`.

const router = Router();

// GET /api/admin/cobranca/ficha?conta=<id> | ?assinatura=<id do espelho>
router.get("/admin/cobranca/ficha", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const quem = validate(fichaQuerySchema, req.query, res);
  if (quem === null) return;
  const ficha = await montarFicha(quem);
  if (!ficha) {
    res.status(404).json({ error: "NaoEncontrada" });
    return;
  }
  res.json(ficha);
});

// GET /api/admin/cobranca/tentativas — quem começou a assinar e não terminou (passo 1e).
router.get("/admin/cobranca/tentativas", requireAdmin, async (_req, res) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await listarTentativas());
});

// GET /api/admin/cobranca/achar?codigo=<sub_|cus_|pi_|ch_|in_|du_…> — de quem é o código que veio num alerta.
router.get("/admin/cobranca/achar", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const pedido = validate(acharQuerySchema, req.query, res);
  if (pedido === null) return;
  const onde = await acharPeloCodigo(pedido.codigo);
  if (!onde) {
    res.status(404).json({ error: "NaoEncontrada" });
    return;
  }
  res.json(onde);
});

export default router;
