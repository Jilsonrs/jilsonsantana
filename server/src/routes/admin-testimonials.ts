import { Router } from "express";
import { testimonialCreateSchema, testimonialUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";

const router = Router();

// Depoimentos da home — tudo admin-only (Bloco C3, docs/content.md § 16).
// Leitura pública não passa por aqui: a home é SSR e lê direto do banco,
// filtrando PUBLICADO (routes/home.ts).

// Mais NOVO primeiro: depoimento não tem ordem (a home sorteia — decisão do
// operador, 23/09/2026), e o que o operador procura na lista é o que acabou de
// chegar.
const byOrder = [{ createdAt: "desc" as const }, { id: "desc" as const }];

// GET /api/admin/testimonials — todos, de qualquer status.
router.get("/admin/testimonials", requireAdmin, async (_req, res) => {
  res.json(await prisma.testimonial.findMany({ orderBy: byOrder }));
});

router.post("/admin/testimonials", requireAdmin, async (req, res) => {
  const data = validate(testimonialCreateSchema, req.body, res);
  if (data === null) return;
  const criado = await prisma.testimonial.create({ data });
  res.status(201).json(criado);
});

router.patch("/admin/testimonials/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(testimonialUpdateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.testimonial.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const atualizado = await prisma.testimonial.update({ where: { id }, data });
  res.json(atualizado);
});

// DELETE apaga a LINHA, não só esconde: é o caminho do "sai na hora se a pessoa
// pedir" — pelo LGPD o nome não pode ficar guardado (decisão do operador,
// 23/09/2026). Esconder sem apagar é o `status`.
router.delete("/admin/testimonials/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.testimonial.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await prisma.testimonial.delete({ where: { id } });
  res.status(204).end();
});

export default router;
