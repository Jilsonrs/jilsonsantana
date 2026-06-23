import { Router } from "express";
import type { Response } from "express";
import {
  ContentStatus,
  Role,
  planCreateSchema,
  planUpdateSchema,
  planModuleCreateSchema,
  planModuleUpdateSchema,
  planItemCreateSchema,
  planItemUpdateSchema,
  PlanItemType,
} from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

// Resolve the course/lesson a PlanItem points at (shared by the public + owned
// trilha trees).
const itemInclude = {
  course: {
    select: { id: true, slug: true, title: true, subtitle: true, level: true, thumbnailUrl: true, camadas: true },
  },
  lesson: { select: { id: true, title: true, tags: true } },
};
const planTreeInclude = {
  planModules: { orderBy: byOrder, include: { items: { orderBy: byOrder, include: itemInclude } } },
};

// Authorization for trilha writes: admin edits any plan; a member edits only a
// plan they own; a curated template (ownerUserId null) is admin-only. Returns the
// plan, or null after sending 404/403. Sub-resources (PlanModule/PlanItem) check
// their PARENT plan through this same helper — there is no other write path.
async function loadEditablePlan(
  planId: number,
  user: { id: string; role?: string | null },
  res: Response,
) {
  const plan = await prisma.learningPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    res.status(404).json({ error: "NotFound" });
    return null;
  }
  if (user.role !== Role.ADMIN && plan.ownerUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return plan;
}

// ── Public reads (curated templates only) ────────────────────────────────────

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

// ── Member-owned reads (MUST precede GET /trilhas/:slug so ":slug" can't capture
// "mine") ────────────────────────────────────────────────────────────────────

// GET /api/trilhas/mine — the requester's saved/cloned trilhas.
router.get("/trilhas/mine", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const trilhas = await prisma.learningPlan.findMany({
    where: { ownerUserId: user.id },
    orderBy: byOrder,
    select: {
      id: true,
      name: true,
      description: true,
      skillsCovered: true,
      sourcePlanId: true,
      displayOrder: true,
      _count: { select: { planModules: true } },
    },
  });
  res.json(trilhas);
});

// GET /api/trilhas/mine/:id — one owned trilha (full tree); 404 if not the owner's.
router.get("/trilhas/mine/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const trilha = await prisma.learningPlan.findFirst({
    where: { id, ownerUserId: user.id },
    include: planTreeInclude,
  });
  if (!trilha) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json(trilha);
});

// GET /api/trilhas/:slug — full tree of a curated trilha (after /mine routes).
router.get("/trilhas/:slug", async (req, res) => {
  const trilha = await prisma.learningPlan.findFirst({
    where: { slug: req.params.slug, status: PUBLISHED, isTemplate: true },
    include: planTreeInclude,
  });
  if (!trilha) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json(trilha);
});

// ── Curated trilha writes ────────────────────────────────────────────────────

// POST /api/trilhas — create a curated template (admin). isTemplate/ownerUserId
// are FORCED server-side, never from the body (a member never creates a template;
// member plans are born only via save/clone below).
router.post("/trilhas", requireAdmin, async (req, res) => {
  const data = validate(planCreateSchema, req.body, res);
  if (data === null) return;
  if (data.slug && (await prisma.learningPlan.findUnique({ where: { slug: data.slug } }))) {
    res.status(409).json({ error: "SlugTaken" });
    return;
  }
  const plan = await prisma.learningPlan.create({
    data: { ...data, isTemplate: true, ownerUserId: null },
  });
  res.status(201).json(plan);
});

// PATCH /api/trilhas/:id — admin edits a curated trilha; a member edits their own.
router.patch("/trilhas/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(planUpdateSchema, req.body, res);
  if (data === null) return;
  const plan = await loadEditablePlan(id, user, res);
  if (!plan) return;
  // A slug is a curated-template concept (the public /trilha/:slug URL). A
  // member-owned plan is reached by id (/trilhas/mine/:id), so strip any slug
  // from a non-template edit — keeps members out of the global slug namespace.
  if (!plan.isTemplate) delete data.slug;
  if (data.slug && data.slug !== plan.slug) {
    const bySlug = await prisma.learningPlan.findUnique({ where: { slug: data.slug } });
    if (bySlug && bySlug.id !== id) {
      res.status(409).json({ error: "SlugTaken" });
      return;
    }
  }
  const updated = await prisma.learningPlan.update({ where: { id }, data });
  res.json(updated);
});

// DELETE /api/trilhas/:id — admin (curated) or owner (own). Cascades modules/items.
router.delete("/trilhas/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const plan = await loadEditablePlan(id, user, res);
  if (!plan) return;
  await prisma.learningPlan.delete({ where: { id } });
  res.status(204).end();
});

// POST /api/trilhas/:id/save — a member saves/clones a curated trilha into their
// own. Idempotent (an existing clone of the same template is returned, not
// duplicated). Deep-copies modules + items in a transaction.
router.post("/trilhas/:id/save", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const template = await prisma.learningPlan.findUnique({
    where: { id },
    include: { planModules: { include: { items: true } } },
  });
  if (!template || !template.isTemplate) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const existing = await prisma.learningPlan.findFirst({
    where: { ownerUserId: user.id, sourcePlanId: template.id },
  });
  if (existing) {
    res.status(200).json(existing);
    return;
  }

  const clone = await prisma.$transaction(async (tx) => {
    const newPlan = await tx.learningPlan.create({
      data: {
        name: template.name,
        description: template.description,
        skillsCovered: template.skillsCovered,
        ownerUserId: user.id,
        isTemplate: false,
        sourcePlanId: template.id,
        status: PUBLISHED,
      },
    });
    for (const pm of template.planModules) {
      const newModule = await tx.planModule.create({
        data: { planId: newPlan.id, title: pm.title, displayOrder: pm.displayOrder },
      });
      for (const item of pm.items) {
        await tx.planItem.create({
          data: {
            planModuleId: newModule.id,
            itemType: item.itemType,
            courseId: item.courseId,
            lessonId: item.lessonId,
            displayOrder: item.displayOrder,
          },
        });
      }
    }
    return newPlan;
  });
  res.status(201).json(clone);
});

// ── PlanModule writes (parent-plan authorization) ────────────────────────────

router.post("/plan-modules", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const data = validate(planModuleCreateSchema, req.body, res);
  if (data === null) return;
  const plan = await loadEditablePlan(data.planId, user, res);
  if (!plan) return;
  const created = await prisma.planModule.create({ data });
  res.status(201).json(created);
});

router.patch("/plan-modules/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(planModuleUpdateSchema, req.body, res);
  if (data === null) return;
  const mod = await prisma.planModule.findUnique({ where: { id } });
  if (!mod) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!(await loadEditablePlan(mod.planId, user, res))) return;
  const updated = await prisma.planModule.update({ where: { id }, data });
  res.json(updated);
});

router.delete("/plan-modules/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const mod = await prisma.planModule.findUnique({ where: { id } });
  if (!mod) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!(await loadEditablePlan(mod.planId, user, res))) return;
  await prisma.planModule.delete({ where: { id } });
  res.status(204).end();
});

// ── PlanItem writes (parent-plan authorization) ──────────────────────────────

router.post("/plan-items", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const data = validate(planItemCreateSchema, req.body, res);
  if (data === null) return;
  const mod = await prisma.planModule.findUnique({ where: { id: data.planModuleId } });
  if (!mod) {
    res.status(404).json({ error: "PlanModuleNotFound" });
    return;
  }
  if (!(await loadEditablePlan(mod.planId, user, res))) return;
  // Verify the referenced course/lesson exists (friendly 404; FK is the hard guard).
  if (data.itemType === PlanItemType.COURSE) {
    if (!(await prisma.course.findUnique({ where: { id: data.courseId! } }))) {
      res.status(404).json({ error: "CourseNotFound" });
      return;
    }
  } else if (!(await prisma.lesson.findUnique({ where: { id: data.lessonId! } }))) {
    res.status(404).json({ error: "LessonNotFound" });
    return;
  }
  const created = await prisma.planItem.create({ data });
  res.status(201).json(created);
});

router.patch("/plan-items/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(planItemUpdateSchema, req.body, res);
  if (data === null) return;
  const item = await prisma.planItem.findUnique({ where: { id }, include: { planModule: true } });
  if (!item) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!(await loadEditablePlan(item.planModule.planId, user, res))) return;
  // Moving an item is only allowed within the SAME plan.
  if (data.planModuleId && data.planModuleId !== item.planModuleId) {
    const target = await prisma.planModule.findUnique({ where: { id: data.planModuleId } });
    if (!target || target.planId !== item.planModule.planId) {
      res.status(400).json({ error: "TargetModuleNotInSamePlan" });
      return;
    }
  }
  const updated = await prisma.planItem.update({ where: { id }, data });
  res.json(updated);
});

router.delete("/plan-items/:id", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const item = await prisma.planItem.findUnique({ where: { id }, include: { planModule: true } });
  if (!item) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!(await loadEditablePlan(item.planModule.planId, user, res))) return;
  await prisma.planItem.delete({ where: { id } });
  res.status(204).end();
});

export default router;
