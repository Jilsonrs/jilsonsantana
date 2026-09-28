import { Router } from "express";
import { courseStructureSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";

const router = Router();

/** Os dois lados têm exatamente os mesmos ids, sem repetição. */
function mesmoConjunto(enviados: number[], doCurso: Set<number>): boolean {
  return (
    enviados.length === doCurso.size &&
    new Set(enviados).size === enviados.length &&
    enviados.every((id) => doCurso.has(id))
  );
}

// PUT /api/admin/courses/:id/estrutura — a ORDEM INTEIRA de módulos e aulas do
// curso (Bloco E, etapa 2 — plano aprovado pelo operador em 28/09/2026). As
// setas, o "+" e o arrastar mandam por aqui.
//
// Por que uma gravação só, e não duas trocas de lugar: as setas antigas trocavam
// o `displayOrder` de dois itens em duas gravações separadas, e dois itens com o
// MESMO número (o padrão 0) não saíam do lugar. Aqui a ordem é reescrita de 0 em
// diante, numa transação.
//
// A aula pode MUDAR DE MÓDULO, mas só dentro deste curso: a lista enviada tem que
// ter exatamente os módulos e as aulas do curso — nem um a mais (de outro curso),
// nem um a menos, nem repetido. Senão, 400 e nada muda.
router.put("/admin/courses/:id/estrutura", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(courseStructureSchema, req.body, res);
  if (body === null) return;

  const curso = await prisma.course.findUnique({
    where: { id },
    select: { modules: { select: { id: true, lessons: { select: { id: true } } } } },
  });
  if (!curso) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const modulosDoCurso = new Set(curso.modules.map((m) => m.id));
  const aulasDoCurso = new Set(curso.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  if (
    !mesmoConjunto(body.modulos.map((m) => m.id), modulosDoCurso) ||
    !mesmoConjunto(body.modulos.flatMap((m) => m.aulas), aulasDoCurso)
  ) {
    res.status(400).json({ error: "EstruturaInvalida" });
    return;
  }

  await prisma.$transaction([
    ...body.modulos.map((m, ordem) => prisma.module.update({ where: { id: m.id }, data: { displayOrder: ordem } })),
    ...body.modulos.flatMap((m) =>
      m.aulas.map((aulaId, ordem) =>
        prisma.lesson.update({ where: { id: aulaId }, data: { moduleId: m.id, displayOrder: ordem } }),
      ),
    ),
  ]);
  res.status(204).end();
});

export default router;
