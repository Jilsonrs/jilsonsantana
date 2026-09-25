import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ContentStatus, courseCreateSchema, courseUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";
import { paraBanco, doBanco, comIdioma, idiomaDaLista } from "../lib/language.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;

// Public reads — "onboarding aberto e livre" (CLAUDE.md): the catalog is
// browsable by anyone, member or not. Only PUBLISHED content is exposed; nested
// modules/lessons are filtered to PUBLISHED too, so DRAFT/ARCHIVED never leak.

// Ordering shared by every list: operator-set displayOrder, then id as a stable
// tiebreaker.
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

// GET /api/courses?lang=pt|en — catalog cards. lessonCount is DERIVED (Σ
// published lessons across published modules), never a stored column. Lista de
// DESCOBERTA: filtra pelo idioma, como filtra pelo status (CLAUDE.md → Idiomas).
router.get("/courses", async (req, res) => {
  const language = idiomaDaLista(req.query.lang, res);
  if (language === null) return;
  const courses = await prisma.course.findMany({
    where: { status: PUBLISHED, language },
    orderBy: byOrder,
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      level: true,
      thumbnailUrl: true,
      camadas: true,
      displayOrder: true,
      modules: {
        where: { status: PUBLISHED },
        select: { _count: { select: { lessons: { where: { status: PUBLISHED } } } } },
      },
    },
  });

  const cards = courses.map(({ modules, ...course }) => ({
    ...course,
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, m) => sum + m._count.lessons, 0),
  }));
  res.json(cards);
});

// GET /api/courses/:slug — full detail tree for the course page (by slug, which
// is the public URL). 404 if missing or not published. NÃO filtra por idioma:
// link direto nunca é barrado, e a assinatura vale nos dois idiomas.
router.get("/courses/:slug", async (req, res) => {
  const course = await prisma.course.findFirst({
    where: { slug: req.params.slug, status: PUBLISHED },
    include: {
      modules: {
        where: { status: PUBLISHED },
        orderBy: byOrder,
        include: {
          lessons: {
            where: { status: PUBLISHED },
            orderBy: byOrder,
            select: { id: true, title: true, tags: true, displayOrder: true },
          },
        },
      },
    },
  });

  if (!course) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  res.json({ ...comIdioma(course), moduleCount: course.modules.length, lessonCount });
});

// ── Admin reads (any status) ─────────────────────────────────────────────────
// The public reads above only ever return PUBLISHED content — an admin
// drafting a course (the normal state while authoring) needs to see DRAFT/
// ARCHIVED too. Same shape as the public routes, just without the status
// filter and keyed by id instead of slug.

// GET /api/admin/courses — every course, any status.
router.get("/admin/courses", requireAdmin, async (_req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: byOrder,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      language: true,
      displayOrder: true,
      modules: { select: { _count: { select: { lessons: true } } } },
    },
  });
  const cards = courses.map(({ modules, ...course }) => ({
    ...comIdioma(course),
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, m) => sum + m._count.lessons, 0),
  }));
  res.json(cards);
});

// GET /api/admin/courses/:id — full tree by id, modules/lessons of ANY status.
router.get("/admin/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: byOrder,
        include: { lessons: { orderBy: byOrder } },
      },
    },
  });
  if (!course) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json(comIdioma(course));
});

// ── Writes (admin only) ──────────────────────────────────────────────────────
// Express 5 auto-catches rejected promises, so no try/catch (CLAUDE.md). The
// jsonb columns are Zod-typed; cast them to Prisma's Json input.
function jsonFields(input: { highlights?: unknown; faq?: unknown; camadaOverride?: unknown }) {
  return {
    highlights: input.highlights as Prisma.InputJsonValue | undefined,
    faq: input.faq as Prisma.InputJsonValue | undefined,
    camadaOverride: input.camadaOverride as Prisma.InputJsonValue | undefined,
  };
}

// POST /api/courses — create. Friendly 409 on duplicate slug (the unique index
// is the hard guard; a rare race surfaces as 500).
router.post("/courses", requireAdmin, async (req, res) => {
  const data = validate(courseCreateSchema, req.body, res);
  if (data === null) return;
  if (await prisma.course.findUnique({ where: { slug: data.slug } })) {
    res.status(409).json({ error: "SlugTaken" });
    return;
  }
  const { language, ...campos } = data;
  const course = await prisma.course.create({
    data: { ...campos, language: paraBanco(language), ...jsonFields(data) },
  });
  res.status(201).json(comIdioma(course));
});

// PATCH /api/courses/:id — update (404 if missing; 409 if slug taken by another).
//
// TROCAR O IDIOMA (decisão do operador, 24/09/2026): só enquanto o curso é
// RASCUNHO — publicado, trava (409 LanguageLocked). E nem em rascunho se ele já
// está numa trilha do outro idioma (409 LanguageInUse): é o curso que foi
// publicado, entrou numa trilha e voltou a rascunho — trocar quebraria a regra
// "trilha não mistura idiomas".
router.patch("/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(courseUpdateSchema, req.body, res);
  if (data === null) return;
  const atual = await prisma.course.findUnique({ where: { id } });
  if (!atual) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const { language, ...campos } = data;
  const novoIdioma = language ? paraBanco(language) : undefined;
  if (novoIdioma && novoIdioma !== atual.language) {
    if (atual.status !== ContentStatus.DRAFT) {
      res.status(409).json({ error: "LanguageLocked" });
      return;
    }
    const emTrilhaDeOutroIdioma = await prisma.planItem.findFirst({
      where: {
        OR: [{ courseId: id }, { lesson: { module: { courseId: id } } }],
        planModule: { plan: { language: { not: novoIdioma } } },
      },
    });
    if (emTrilhaDeOutroIdioma) {
      res.status(409).json({ error: "LanguageInUse" });
      return;
    }
  }
  if (data.slug) {
    const bySlug = await prisma.course.findUnique({ where: { slug: data.slug } });
    if (bySlug && bySlug.id !== id) {
      res.status(409).json({ error: "SlugTaken" });
      return;
    }
  }
  const course = await prisma.course.update({
    where: { id },
    data: { ...campos, language: novoIdioma, ...jsonFields(data) },
  });
  res.json(comIdioma(course));
});

// DELETE /api/courses/:id — hard delete (cascades modules/lessons + plan_items).
router.delete("/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.course.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await prisma.course.delete({ where: { id } });
  res.status(204).end();
});

export default router;
