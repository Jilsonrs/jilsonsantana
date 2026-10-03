import { Router, type Request, type Response } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";

const router = Router();

// "SALVOS" — salvar para assistir depois, curso inteiro ou aula (decisão do
// operador, 03/10/2026, "como no LinkedIn"; a lista fica em Meus estudos). Tudo
// exige login, e é sempre da PRÓPRIA pessoa: o id dela vem da sessão, nunca do
// pedido. Não exige assinatura: salvar é só um marcador, e os títulos já aparecem
// para quem vê o curso.
//
// Salvar confere a CADEIA PUBLICADA inteira (CLAUDE.md → Server: "escrita também
// confere status do que REFERENCIA"): rascunho dá 404, igual ao que não existe —
// senão a rota viraria um jeito de descobrir o catálogo não publicado. A lista
// também só mostra o que continua publicado. Não filtra por idioma: o que é do
// aluno aparece nos dois (CLAUDE.md → Idiomas).

const PUBLISHED = ContentStatus.PUBLISHED;
const cursoPublicado = { status: PUBLISHED };
const aulaPublicada = { status: PUBLISHED, module: { status: PUBLISHED, course: cursoPublicado } };

/** O id de quem pede, ou 401. */
function pessoa(req: Request, res: Response): string | null {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return id;
}

// GET /api/salvos — os cursos e as aulas salvos, do mais novo para o mais antigo.
router.get("/salvos", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const linhas = await prisma.savedItem.findMany({
    where: { userId, OR: [{ course: cursoPublicado }, { lesson: aulaPublicada }] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      course: { select: { id: true, slug: true, title: true, subtitle: true, level: true, thumbnailUrl: true } },
      lesson: { select: { id: true, title: true, kind: true, module: { select: { course: { select: { slug: true, title: true } } } } } },
    },
  });
  res.set("Cache-Control", "private, no-store");
  res.json({
    cursos: linhas.flatMap((l) => (l.course ? [l.course] : [])),
    aulas: linhas.flatMap((l) =>
      l.lesson ? [{ id: l.lesson.id, title: l.lesson.title, kind: l.lesson.kind, curso: l.lesson.module.course }] : [],
    ),
  });
});

// PUT /api/salvos/cursos/:id — salva o curso. Salvar de novo não duplica.
router.put("/salvos/cursos/:id", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.course.findFirst({ where: { id, ...cursoPublicado }, select: { id: true } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await prisma.savedItem.createMany({ data: [{ userId, courseId: id }], skipDuplicates: true });
  res.status(204).end();
});

// PUT /api/salvos/aulas/:id — salva a aula. Salvar de novo não duplica.
router.put("/salvos/aulas/:id", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.lesson.findFirst({ where: { id, ...aulaPublicada }, select: { id: true } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await prisma.savedItem.createMany({ data: [{ userId, lessonId: id }], skipDuplicates: true });
  res.status(204).end();
});

// DELETE /api/salvos/cursos/:id e /api/salvos/aulas/:id — tira dos salvos. Só a
// linha DESTA pessoa; tirar o que não estava salvo também é 204.
router.delete("/salvos/cursos/:id", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  await prisma.savedItem.deleteMany({ where: { userId, courseId: id } });
  res.status(204).end();
});

router.delete("/salvos/aulas/:id", requireAuth, async (req, res) => {
  const userId = pessoa(req, res);
  if (!userId) return;
  const id = parseId(req.params.id, res);
  if (id === null) return;
  await prisma.savedItem.deleteMany({ where: { userId, lessonId: id } });
  res.status(204).end();
});

export default router;
