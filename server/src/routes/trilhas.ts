import { Router } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

// Public reads of CURATED trilhas only (isTemplate, ownerUserId = null). A
// member's own saved/cloned plans are private and fetched via their own routes
// (Block 3/5) — never exposed here.

// GET /api/trilhas — curated catalog.
router.get("/trilhas", async (_req, res) => {
  const trilhas = await prisma.learningPlan.findMany({
    where: { status: PUBLISHED, isTemplate: true },
    orderBy: byOrder,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      skillsCovered: true,
      displayOrder: true,
      _count: { select: { planModules: true } },
    },
  });
  res.json(trilhas);
});

// GET /api/trilhas/:slug — full tree: modules → items, each item resolved to its
// course or lesson (the free mix).
router.get("/trilhas/:slug", async (req, res) => {
  const trilha = await prisma.learningPlan.findFirst({
    where: { slug: req.params.slug, status: PUBLISHED, isTemplate: true },
    include: {
      planModules: {
        orderBy: byOrder,
        include: {
          items: {
            orderBy: byOrder,
            include: {
              course: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  subtitle: true,
                  level: true,
                  thumbnailUrl: true,
                  camadas: true,
                },
              },
              lesson: { select: { id: true, title: true, tags: true } },
            },
          },
        },
      },
    },
  });

  if (!trilha) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json(trilha);
});

export default router;
