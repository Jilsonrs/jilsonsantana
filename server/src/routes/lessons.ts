import { Router } from "express";
import { ContentStatus, lessonCreateSchema, lessonUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";

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

// ── Writes (admin only) ──────────────────────────────────────────────────────

// POST /api/lessons — moduleId in body. Pre-check the module for a friendly 404.
router.post("/lessons", requireAdmin, async (req, res) => {
  const data = validate(lessonCreateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.module.findUnique({ where: { id: data.moduleId } }))) {
    res.status(404).json({ error: "ModuleNotFound" });
    return;
  }
  const created = await prisma.lesson.create({ data });
  res.status(201).json(created);
});

router.patch("/lessons/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(lessonUpdateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.lesson.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const updated = await prisma.lesson.update({ where: { id }, data });
  res.json(updated);
});

// DELETE /api/lessons/:id — hard delete (cascades plan_items referencing it).
router.delete("/lessons/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.lesson.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await prisma.lesson.delete({ where: { id } });
  res.status(204).end();
});

export default router;
