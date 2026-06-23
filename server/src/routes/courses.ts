import { Router } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";

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

export default router;
