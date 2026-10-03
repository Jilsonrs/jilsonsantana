import { Router } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { aulaLiberada, temAcessoAtivo } from "../lib/acesso.js";
import { concluirAula } from "../lib/progresso.js";

const router = Router();

// CONCLUIR UMA AULA (Fase 5 — plano aprovado pelo operador em 03/10/2026). A tela
// chama sozinha, sem botão: vídeo ao chegar a 90%, texto ao abrir. Duas portas,
// como a página da aula:
//   - a do ALUNO: só a cadeia PUBLICADA, e só a aula que ele pode ver — prévia
//     grátis ou `temAcessoAtivo()`. Concluir o que não pode ver é 403;
//   - a do ADMIN: qualquer status, pela rota de admin (a plataforma é uma só e o
//     operador testa como aluno — 29/09/2026). NÃO é exceção dentro de
//     `temAcessoAtivo()`: é a mesma regra própria que a página da aula já usa.

const PUBLISHED = ContentStatus.PUBLISHED;
const cadeiaPublicada = { status: PUBLISHED, module: { status: PUBLISHED, course: { status: PUBLISHED } } };

// PUT /api/lessons/:id/concluida — o aluno concluiu a aula.
router.put("/lessons/:id/concluida", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: { id: true, isFreePreview: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // A mesma regra da página da aula: só conclui o que pode assistir.
  if (!aulaLiberada(aula, await temAcessoAtivo(user.id))) {
    res.status(403).json({ error: "AssinaturaNecessaria" });
    return;
  }
  await concluirAula(user.id, aula.id);
  res.status(204).end();
});

// PUT /api/admin/lessons/:id/concluida — o admin concluiu a aula, em qualquer status.
router.put("/admin/lessons/:id/concluida", requireAdmin, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await prisma.lesson.findUnique({ where: { id }, select: { id: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await concluirAula(user.id, aula.id);
  res.status(204).end();
});

export default router;
