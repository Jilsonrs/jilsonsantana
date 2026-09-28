import { Router } from "express";
import { moduleCreateSchema, moduleUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";
import { limparModuloNoBunny } from "../lib/limpeza-no-bunny.js";

const router = Router();

// Modules are read within the course tree (GET /courses/:slug); this router is
// writes only (admin). Express 5 auto-catches rejections — no try/catch.

// POST /api/modules — courseId in body. Pre-check the course for a friendly 404
// (the FK is the hard guard).
router.post("/modules", requireAdmin, async (req, res) => {
  const data = validate(moduleCreateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.course.findUnique({ where: { id: data.courseId } }))) {
    res.status(404).json({ error: "CourseNotFound" });
    return;
  }
  const created = await prisma.module.create({ data });
  res.status(201).json(created);
});

router.patch("/modules/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(moduleUpdateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.module.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const updated = await prisma.module.update({ where: { id }, data });
  res.json(updated);
});

// DELETE /api/modules/:id — hard delete (cascades its lessons + plan_items).
router.delete("/modules/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.module.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // O Bunny primeiro: o que existe lá não pode ficar perdido (operador, 28/09/2026).
  if (!(await limparModuloNoBunny(id))) {
    res.status(502).json({ error: "BunnyNaoApagou" });
    return;
  }
  await prisma.module.delete({ where: { id } });
  res.status(204).end();
});

export default router;
