import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ContentStatus, courseCreateSchema, courseUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;

// Public reads — "onboarding aberto e livre" (CLAUDE.md): the catalog is
// browsable by anyone, member or not. Only PUBLISHED content is exposed; nested
// modules/lessons are filtered to PUBLISHED too, so DRAFT/ARCHIVED never leak.

// Ordering shared by every list: operator-set displayOrder, then id as a stable
// tiebreaker.
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

// GET /api/courses — catalog cards. lessonCount is DERIVED (Σ published lessons
// across published modules), never a stored column.
router.get("/courses", async (_req, res) => {
  const courses = await prisma.course.findMany({
    where: { status: PUBLISHED },
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
// is the public URL). 404 if missing or not published.
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
  res.json({ ...course, moduleCount: course.modules.length, lessonCount });
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
  const course = await prisma.course.create({ data: { ...data, ...jsonFields(data) } });
  res.status(201).json(course);
});

// PATCH /api/courses/:id — update (404 if missing; 409 if slug taken by another).
router.patch("/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(courseUpdateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.course.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (data.slug) {
    const bySlug = await prisma.course.findUnique({ where: { slug: data.slug } });
    if (bySlug && bySlug.id !== id) {
      res.status(409).json({ error: "SlugTaken" });
      return;
    }
  }
  const course = await prisma.course.update({ where: { id }, data: { ...data, ...jsonFields(data) } });
  res.json(course);
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
