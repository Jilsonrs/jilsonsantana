import { Router } from "express";
import { ContentStatus } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { parseId } from "../lib/http.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;

// GET /api/lessons/:id — a lesson is first-class & individually addressable
// (searchable on its own in Block 4). By numeric id (no slug) → exercises
// parseId: 400 for non-numeric, 404 if missing/not published, 200 otherwise.
router.get("/lessons/:id", async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const lesson = await prisma.lesson.findFirst({
    where: { id, status: PUBLISHED },
    select: {
      id: true,
      title: true,
      tags: true,
      displayOrder: true,
      module: {
        select: {
          id: true,
          title: true,
          course: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });

  if (!lesson) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json(lesson);
});

export default router;
