import { Router } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;

// Cap per group — visible, not a silent truncation. Pagination is a post-launch
// concern (CLAUDE.md → Bloco 4 scope); the launch catalog is small enough that
// this never bites in practice.
const GROUP_CAP = 20;

// Keyword search only (substring, case-insensitive, no accent-fold). Semantic
// search is JilsonAI Fase 4-5. This is plain JS filtering over a small fetch of
// PUBLISHED rows — not $queryRaw/FTS — because the launch catalog is tiny and
// this is the only way to substring-match INSIDE arrays (tags/learnTags/
// skillsCovered), which Prisma's `hasSome` (exact match) can't do.
function matchesText(needle: string, ...haystacks: (string | null | undefined)[]): boolean {
  return haystacks.some((h) => h?.toLowerCase().includes(needle));
}

function matchesArray(needle: string, items: string[]): boolean {
  return items.some((item) => item.toLowerCase().includes(needle));
}

// GET /api/search?q=... — public keyword search over curated trilhas, courses
// and standalone lessons (with course context). Only PUBLISHED content (lessons
// require their module AND course to also be PUBLISHED).
router.get("/search", async (req, res) => {
  const raw = req.query.q;
  if (raw === undefined) {
    res.status(400).json({ error: "QueryRequired" });
    return;
  }
  const q = (Array.isArray(raw) ? raw[0] : raw)?.toString().trim() ?? "";
  if (q.length < 2) {
    res.status(400).json({ error: "QueryTooShort" });
    return;
  }
  const needle = q.toLowerCase();

  const [plans, courses, lessons] = await Promise.all([
    prisma.learningPlan.findMany({
      where: { status: PUBLISHED, isTemplate: true },
      select: { id: true, slug: true, name: true, description: true, skillsCovered: true },
    }),
    prisma.course.findMany({
      where: { status: PUBLISHED },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        level: true,
        thumbnailUrl: true,
        camadas: true,
        learnTags: true,
      },
    }),
    prisma.lesson.findMany({
      where: { status: PUBLISHED, module: { status: PUBLISHED, course: { status: PUBLISHED } } },
      select: {
        id: true,
        title: true,
        tags: true,
        module: { select: { title: true, course: { select: { slug: true, title: true } } } },
      },
    }),
  ]);

  const trilhas = plans
    .filter((p) => matchesText(needle, p.name, p.description) || matchesArray(needle, p.skillsCovered))
    .slice(0, GROUP_CAP)
    .map(({ id, slug, name, description }) => ({ id, slug, name, description }));

  const matchedCourses = courses
    .filter((c) => matchesText(needle, c.title, c.subtitle) || matchesArray(needle, c.learnTags))
    .slice(0, GROUP_CAP)
    .map(({ id, slug, title, subtitle, level, thumbnailUrl, camadas }) => ({
      id,
      slug,
      title,
      subtitle,
      level,
      thumbnailUrl,
      camadas,
    }));

  const matchedLessons = lessons
    .filter((l) => matchesText(needle, l.title) || matchesArray(needle, l.tags))
    .slice(0, GROUP_CAP);

  res.json({ query: q, trilhas, courses: matchedCourses, lessons: matchedLessons });
});

export default router;
