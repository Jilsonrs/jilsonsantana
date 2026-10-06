import { Router, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { announcementSchema, type AnnouncementInput } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";

const router = Router();

// COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1 — decisões do operador, 06/10/2026). Tudo
// admin-only. O operador escreve o aviso, escolhe para quem — TODOS (todo mundo com
// conta) ou CURSO (quem já começou aquele curso) —, salva como rascunho ou envia.
// Enviado, pode ser EDITADO (o sino lê o texto atual: todos passam a ver o novo) e
// APAGADO (as notificações dele saem junto, do sino de todos).

const comContagem = {
  course: { select: { id: true, title: true } },
  _count: { select: { notifications: true } },
} satisfies Prisma.AnnouncementInclude;

type AvisoComContagem = Prisma.AnnouncementGetPayload<{ include: typeof comContagem }>;

/** O aviso para a tela, com quantos receberam e quantos já leram. */
async function saida(aviso: AvisoComContagem) {
  const lidas = await prisma.notification.count({ where: { announcementId: aviso.id, readAt: { not: null } } });
  return {
    id: aviso.id,
    title: aviso.title,
    body: aviso.body,
    audience: aviso.audience,
    course: aviso.course,
    sentAt: aviso.sentAt,
    createdAt: aviso.createdAt,
    updatedAt: aviso.updatedAt,
    recebidas: aviso._count.notifications,
    lidas,
  };
}

/** Quem recebe: todo mundo com conta, ou quem já começou o curso. Nunca conta excluída. */
function destinatarios(audience: AnnouncementInput["audience"], courseId: number | null | undefined): Prisma.UserWhereInput {
  return audience === "CURSO" ? { deletedAt: null, courseStarts: { some: { courseId: courseId ?? -1 } } } : { deletedAt: null };
}

/** O curso escolhido existe? Senão responde 400. */
async function cursoValido(data: AnnouncementInput, res: Response): Promise<boolean> {
  if (data.audience !== "CURSO") return true;
  if (data.courseId && (await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } }))) return true;
  res.status(400).json({ error: "CourseNotFound" });
  return false;
}

// GET /api/admin/announcements — os rascunhos e os enviados, o mais novo primeiro.
router.get("/admin/announcements", requireAdmin, async (_req, res) => {
  const avisos = await prisma.announcement.findMany({ include: comContagem, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  res.json(await Promise.all(avisos.map(saida)));
});

// GET /api/admin/announcements/destinatarios — quantos vão receber (o Enviar confirma).
router.get("/admin/announcements/destinatarios", requireAdmin, async (req, res) => {
  const audience = req.query.audience === "CURSO" ? "CURSO" : "TODOS";
  const courseId = Number(req.query.courseId);
  const quantos = await prisma.user.count({ where: destinatarios(audience, Number.isInteger(courseId) ? courseId : null) });
  res.json({ quantos });
});

router.get("/admin/announcements/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aviso = await prisma.announcement.findUnique({ where: { id }, include: comContagem });
  if (!aviso) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json(await saida(aviso));
});

// POST /api/admin/announcements — cria como RASCUNHO.
router.post("/admin/announcements", requireAdmin, async (req, res) => {
  const data = validate(announcementSchema, req.body, res);
  if (data === null || !(await cursoValido(data, res))) return;
  const criado = await prisma.announcement.create({
    data: { title: data.title, body: data.body, audience: data.audience, courseId: data.audience === "CURSO" ? data.courseId : null },
    include: comContagem,
  });
  res.status(201).json(await saida(criado));
});

// PUT /api/admin/announcements/:id — salva. Enviado, só o título e o texto mudam:
// trocar o "para quem" depois de enviar não tira nem põe ninguém (409).
router.put("/admin/announcements/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(announcementSchema, req.body, res);
  if (data === null || !(await cursoValido(data, res))) return;
  const atual = await prisma.announcement.findUnique({ where: { id } });
  if (!atual) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const courseId = data.audience === "CURSO" ? (data.courseId ?? null) : null;
  if (atual.sentAt && (atual.audience !== data.audience || atual.courseId !== courseId)) {
    res.status(409).json({ error: "AudienceLocked" });
    return;
  }
  const salvo = await prisma.announcement.update({
    where: { id },
    data: { title: data.title, body: data.body, audience: data.audience, courseId },
    include: comContagem,
  });
  res.json(await saida(salvo));
});

// POST /api/admin/announcements/:id/enviar — manda para quem é, uma vez só. Marcar
// como enviado e criar as notificações acontecem juntos; o "uma vez só" é o
// `sentAt` nulo na mesma escrita (dois cliques ao mesmo tempo: o segundo dá 409).
router.post("/admin/announcements/:id/enviar", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aviso = await prisma.announcement.findUnique({ where: { id } });
  if (!aviso) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const enviadas = await prisma.$transaction(async (tx) => {
    const marcado = await tx.announcement.updateMany({ where: { id, sentAt: null }, data: { sentAt: new Date() } });
    if (marcado.count === 0) return null;
    const pessoas = await tx.user.findMany({ where: destinatarios(aviso.audience, aviso.courseId), select: { id: true } });
    const criadas = await tx.notification.createMany({
      data: pessoas.map((p) => ({ userId: p.id, kind: "AVISO" as const, announcementId: id, body: aviso.body })),
      skipDuplicates: true,
    });
    return criadas.count;
  });
  if (enviadas === null) {
    res.status(409).json({ error: "AlreadySent" });
    return;
  }
  res.json({ enviadas });
});

// DELETE /api/admin/announcements/:id — apaga o aviso e, com ele, as notificações
// que ele gerou (some do sino de todos — decisão do operador, 06/10/2026).
router.delete("/admin/announcements/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const { count } = await prisma.announcement.deleteMany({ where: { id } });
  if (count === 0) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.status(204).end();
});

// GET /api/admin/course-messages — as MENSAGENS AUTOMÁTICAS: a boas-vindas e os
// parabéns de cada curso, para a lista de Comunicação (06/10/2026). Quem edita é o
// passo Mensagens do curso; aqui só se lê.
router.get("/admin/course-messages", requireAdmin, async (_req, res) => {
  const cursos = await prisma.course.findMany({
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    select: { id: true, title: true, status: true, welcomeMessage: true, congratsMessage: true },
  });
  res.json(
    cursos.map((c) => ({
      courseId: c.id,
      courseTitle: c.title,
      status: c.status,
      boasVindas: c.welcomeMessage?.trim() || null,
      parabens: c.congratsMessage?.trim() || null,
    })),
  );
});

export default router;
