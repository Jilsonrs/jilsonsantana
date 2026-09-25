import { Router } from "express";
import { myLanguageSchema } from "@jilson/core";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/me — any authenticated user. Echoes the session user.
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/me/language — o idioma do app, escolhido no seletor do rodapé
// (decisão do operador, 24/09/2026). Fica na CONTA: sobrevive a recarregar e a
// entrar de novo, em qualquer aparelho.
//
// O usuário é SEMPRE o da sessão — o corpo não diz de quem é a conta, então não
// existe como gravar o idioma de outra pessoa por aqui.
//
// Rota nossa, e não o `updateUser` do Better Auth: `preferredLanguage` é
// `input: false` lá (o cliente não escreve direto na coluna), e aqui o valor é
// conferido contra os dois idiomas da escola antes de gravar.
router.patch("/me/language", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = validate(myLanguageSchema, req.body, res);
  if (body === null) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { preferredLanguage: body.language },
  });
  res.json({ language: body.language });
});

export default router;
