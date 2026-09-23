import { Router } from "express";
import type { FaqItem } from "@prisma/client";
import { homeFaqCreateSchema, homeFaqUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";
import { paraBanco, doBanco } from "../lib/language.js";

const router = Router();

// Perguntas frequentes da home — tudo admin-only (Bloco C3). Mesmo desenho dos
// depoimentos (admin-testimonials.ts): a home lê direto do banco, e aqui só o
// operador escreve.

const byOrder = [{ language: "asc" as const }, { displayOrder: "asc" as const }, { id: "asc" as const }];
const saida = (f: FaqItem) => ({ ...f, language: doBanco(f.language) });

// GET /api/admin/faq — todas, de qualquer status e dos dois idiomas.
router.get("/admin/faq", requireAdmin, async (_req, res) => {
  const lista = await prisma.faqItem.findMany({ orderBy: byOrder });
  res.json(lista.map(saida));
});

router.post("/admin/faq", requireAdmin, async (req, res) => {
  const data = validate(homeFaqCreateSchema, req.body, res);
  if (data === null) return;
  const criada = await prisma.faqItem.create({
    data: { ...data, language: paraBanco(data.language) },
  });
  res.status(201).json(saida(criada));
});

router.patch("/admin/faq/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(homeFaqUpdateSchema, req.body, res);
  if (data === null) return;
  if (!(await prisma.faqItem.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const atualizada = await prisma.faqItem.update({
    where: { id },
    data: { ...data, language: data.language && paraBanco(data.language) },
  });
  res.json(saida(atualizada));
});

// DELETE apaga a linha — mesma regra dos depoimentos (decisão do operador,
// 23/09/2026: as duas telas funcionam igual). Esconder é o `status`.
router.delete("/admin/faq/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.faqItem.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await prisma.faqItem.delete({ where: { id } });
  res.status(204).end();
});

export default router;
