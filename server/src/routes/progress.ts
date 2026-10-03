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

// GET /api/progresso/cursos — o progresso de quem pede em cada curso que ele
// COMEÇOU (a barra no cartão do curso — pedido do operador de 30/09/2026). Conta só
// a cadeia publicada, nos dois lados da conta: aulas concluídas ÷ aulas
// publicadas. Curso não começado não entra. Não filtra por idioma: o que é do
// aluno aparece nos dois (CLAUDE.md → Idiomas).
router.get("/progresso/cursos", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const feitas = await prisma.lessonProgress.findMany({
    where: { userId: user.id, completed: true, lesson: cadeiaPublicada },
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  const concluidasPorCurso = new Map<number, number>();
  for (const { lesson } of feitas) {
    const curso = lesson.module.courseId;
    concluidasPorCurso.set(curso, (concluidasPorCurso.get(curso) ?? 0) + 1);
  }
  const modulos = await prisma.module.findMany({
    where: { courseId: { in: [...concluidasPorCurso.keys()] }, status: PUBLISHED, course: { status: PUBLISHED } },
    select: { courseId: true, _count: { select: { lessons: { where: { status: PUBLISHED } } } } },
  });
  const totalPorCurso = new Map<number, number>();
  for (const m of modulos) totalPorCurso.set(m.courseId, (totalPorCurso.get(m.courseId) ?? 0) + m._count.lessons);

  // Muda com o progresso de quem pede: nunca em cache.
  res.set("Cache-Control", "private, no-store");
  res.json(
    [...concluidasPorCurso].map(([courseId, concluidas]) => ({ courseId, concluidas, total: totalPorCurso.get(courseId) ?? 0 })),
  );
});

export default router;
