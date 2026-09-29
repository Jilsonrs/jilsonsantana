import { Router } from "express";
import { ContentStatus, courseStructureSchema, lessonInsertSchema, moduleInsertSchema } from "@jilson/core";
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

// Ordem das listas: o número gravado, e o id para desempatar (o mesmo das leituras).
const porOrdem = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

/**
 * O status com que a aula ou o módulo NOVO nasce, como na Udemy (decisão do
 * operador, 29/09/2026): curso ainda em RASCUNHO → já nasce publicado, sem ter de
 * publicar item por item; curso publicado (ou arquivado) → nasce em rascunho, até
 * ser publicado à mão, para nada aparecer para o aluno antes da hora.
 */
function statusDoNovo(statusDoCurso: string): ContentStatus {
  return statusDoCurso === ContentStatus.DRAFT ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
}

/** A lista com o id novo na posição pedida (além do fim, vai para o fim). */
function comNovoNaPosicao(ids: number[], novo: number, posicao: number): number[] {
  const lugar = Math.min(posicao, ids.length);
  return [...ids.slice(0, lugar), novo, ...ids.slice(lugar)];
}

// POST /api/admin/modules/:id/lessons — o "+" entre duas aulas (Bloco E, etapa 2):
// a aula nasce NAQUELA posição, e a ordem do módulo é reescrita de 0 em diante na
// mesma transação.
router.post("/admin/modules/:id/lessons", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(lessonInsertSchema, req.body, res);
  if (body === null) return;

  const modulo = await prisma.module.findUnique({
    where: { id },
    select: { course: { select: { status: true } }, lessons: { orderBy: porOrdem, select: { id: true } } },
  });
  if (!modulo) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const criada = await prisma.$transaction(async (tx) => {
    const nova = await tx.lesson.create({
      data: { moduleId: id, title: body.title, kind: body.kind, status: statusDoNovo(modulo.course.status) },
    });
    const ordem = comNovoNaPosicao(modulo.lessons.map((l) => l.id), nova.id, body.posicao);
    for (const [ordemNova, aulaId] of ordem.entries()) {
      await tx.lesson.update({ where: { id: aulaId }, data: { displayOrder: ordemNova } });
    }
    return tx.lesson.findUniqueOrThrow({ where: { id: nova.id } });
  });
  res.status(201).json(criada);
});

// POST /api/admin/courses/:id/modules — o "+" entre dois módulos: o módulo nasce
// naquela posição.
router.post("/admin/courses/:id/modules", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(moduleInsertSchema, req.body, res);
  if (body === null) return;

  const curso = await prisma.course.findUnique({
    where: { id },
    select: { status: true, modules: { orderBy: porOrdem, select: { id: true } } },
  });
  if (!curso) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const criado = await prisma.$transaction(async (tx) => {
    const novo = await tx.module.create({ data: { courseId: id, title: body.title, status: statusDoNovo(curso.status) } });
    const ordem = comNovoNaPosicao(curso.modules.map((m) => m.id), novo.id, body.posicao);
    for (const [ordemNova, moduloId] of ordem.entries()) {
      await tx.module.update({ where: { id: moduloId }, data: { displayOrder: ordemNova } });
    }
    return tx.module.findUniqueOrThrow({ where: { id: novo.id } });
  });
  res.status(201).json(criado);
});

export default router;
