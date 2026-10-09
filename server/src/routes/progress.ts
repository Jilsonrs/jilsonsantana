import { Router } from "express";
import { ContentStatus, LessonKind, eventoDaAulaSchema, pontoDaAulaSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { loadSession, requireAdmin, requireAuth } from "../middleware/auth.js";
import { parseId, validate } from "../lib/http.js";
import { aulaLiberada, temAcessoAtivo } from "../lib/acesso.js";
import { concluirAula, progressoDasTrilhas } from "../lib/progresso.js";
import { aulaDeEntrada, gravarPonto } from "../lib/onde-parou.js";
import { enviarParabensSeConcluiu, semDerrubar } from "../lib/notificacoes.js";

const router = Router();

// CONCLUIR UMA AULA (Fase 5 — plano aprovado pelo operador em 03/10/2026). A tela
// chama sozinha, sem botão: vídeo ao chegar a 90%, texto ao abrir. Duas portas,
// como a página da aula:
//   - a do ALUNO: só a cadeia PUBLICADA, e só a aula que ele pode ver — prévia
//     grátis ou `temAcessoAtivo()`. Concluir o que não pode ver é 403;
//   - a do ADMIN: qualquer status, pela rota de admin (a plataforma é uma só e o
//     operador testa como aluno — 29/09/2026). NÃO é exceção dentro de
//     `temAcessoAtivo()`: é a mesma regra própria que a página da aula já usa.

const PUBLISHED = ContentStatus.PUBLISHED;
const cadeiaPublicada = { status: PUBLISHED, module: { status: PUBLISHED, course: { status: PUBLISHED } } };

// PUT /api/lessons/:id/concluida — o aluno concluiu a aula.
router.put("/lessons/:id/concluida", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: { id: true, isFreePreview: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // A mesma regra da página da aula: só conclui o que pode assistir.
  const assinante = await temAcessoAtivo(user.id);
  if (!aulaLiberada(aula, assinante)) {
    res.status(403).json({ error: "AssinaturaNecessaria" });
    return;
  }
  await concluirAula(user.id, aula.id);
  // Era a última? Os parabéns do curso (operador, 04/10/2026), contando só o
  // publicado — e só para quem assina, como a boas-vindas: a prévia grátis não basta.
  if (assinante) await semDerrubar("parabéns", user.id, aula.id, () => enviarParabensSeConcluiu(user.id, aula.id, true));
  res.status(204).end();
});

// PUT /api/admin/lessons/:id/concluida — o admin concluiu a aula, em qualquer status.
router.put("/admin/lessons/:id/concluida", requireAdmin, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await prisma.lesson.findUnique({ where: { id }, select: { id: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await concluirAula(user.id, aula.id);
  // O admin conta todas as aulas, como a barra de progresso dele.
  await semDerrubar("parabéns", user.id, aula.id, () => enviarParabensSeConcluiu(user.id, aula.id, false));
  res.status(204).end();
});

// ONDE A PESSOA PAROU (Bloco AULA — plano aprovado pelo operador em 06/10/2026).
// A tela grava sozinha: ao abrir a aula, de tempos em tempos enquanto o vídeo
// toca, na pausa e ao sair; no fim do vídeo, o ponto fica vazio. As mesmas duas
// portas e a MESMA regra do concluir: só grava o ponto de quem pode assistir.

// POST /api/lessons/:id/ponto — o aluno está nesta aula, neste segundo.
router.post("/lessons/:id/ponto", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(pontoDaAulaSchema, req.body, res);
  if (body === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: { id: true, isFreePreview: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!aulaLiberada(aula, await temAcessoAtivo(user.id))) {
    res.status(403).json({ error: "AssinaturaNecessaria" });
    return;
  }
  await gravarPonto(user.id, aula.id, body.segundos);
  res.status(204).end();
});

// POST /api/admin/lessons/:id/ponto — o admin, em qualquer status (ele testa como aluno).
router.post("/admin/lessons/:id/ponto", requireAdmin, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(pontoDaAulaSchema, req.body, res);
  if (body === null) return;
  const aula = await prisma.lesson.findUnique({ where: { id }, select: { id: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await gravarPonto(user.id, aula.id, body.segundos);
  res.status(204).end();
});

// OS EVENTOS DO VÍDEO (Fase 5, Bloco MEDIR, etapa 1 — pedido do operador, 09/10/2026):
// tocou, pausou, terminou — só GUARDADOS, para as horas assistidas do cartão do admin
// (a conta é leitura à parte, etapa 2). Só aula de VÍDEO, e a MESMA trava do ponto. Só a
// porta do aluno: a tela do admin não manda (assistir para conferir não conta como aluno),
// e a conta das horas soma só alunos.

// O TETO POR PESSOA (achado P1 da revisão de segurança, 09/10/2026): é a primeira tabela em
// que o aluno só ACRESCENTA linhas, e sem teto um script enche o banco de todos. Quem assiste
// de verdade faz poucos eventos por minuto (tocar, pausar, trocar de aba); o teto é folgado.
// Passou: 429, e a tela não insiste (`deveTentarDeNovo` não repete 4xx).
export const EVENTOS_POR_MINUTO = 30;
export const EVENTOS_POR_DIA = 1000;

async function passouDoTeto(userId: string): Promise<boolean> {
  const agora = Date.now();
  const noMinuto = await prisma.lessonEvent.count({ where: { userId, createdAt: { gte: new Date(agora - 60_000) } } });
  if (noMinuto >= EVENTOS_POR_MINUTO) return true;
  const noDia = await prisma.lessonEvent.count({ where: { userId, createdAt: { gte: new Date(agora - 24 * 60 * 60_000) } } });
  return noDia >= EVENTOS_POR_DIA;
}

// POST /api/lessons/:id/eventos — aconteceu isto no vídeo desta aula, neste segundo.
router.post("/lessons/:id/eventos", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(eventoDaAulaSchema, req.body, res);
  if (body === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: { id: true, isFreePreview: true, kind: true } });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (aula.kind !== LessonKind.VIDEO) {
    res.status(400).json({ error: "AulaSemVideo" });
    return;
  }
  if (!aulaLiberada(aula, await temAcessoAtivo(user.id))) {
    res.status(403).json({ error: "AssinaturaNecessaria" });
    return;
  }
  if (await passouDoTeto(user.id)) {
    res.status(429).json({ error: "MuitosEventos" });
    return;
  }
  // O player avisa o tempo com casas decimais; o evento guarda o segundo inteiro.
  await prisma.lessonEvent.create({ data: { userId: user.id, lessonId: aula.id, type: body.tipo, positionSeconds: Math.floor(body.segundos) } });
  res.status(204).end();
});

// GET /api/cursos/:slug/entrada — em que aula esta pessoa entra no curso: a última
// em que esteve (ou, se terminou o curso, a primeira que não concluiu). Visitante
// e quem nunca abriu: a primeira. Só a cadeia publicada.
router.get("/cursos/:slug/entrada", async (req, res) => {
  const sessao = await loadSession(req);
  const entrada = await aulaDeEntrada(req.params.slug, sessao?.user.id);
  if (!entrada) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // Muda com o progresso de quem pede: nunca em cache.
  res.set("Cache-Control", "private, no-store");
  res.json(entrada);
});

// GET /api/progresso/cursos — o progresso de quem pede em cada curso que ele
// COMEÇOU (a barra no cartão do curso — pedido do operador de 30/09/2026). Conta só
// a cadeia publicada, nos dois lados da conta: aulas concluídas ÷ aulas
// publicadas. Curso não começado não entra. Não filtra por idioma: o que é do
// aluno aparece nos dois (CLAUDE.md → Idiomas).
router.get("/progresso/cursos", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const feitas = await prisma.lessonProgress.findMany({
    where: { userId: user.id, completed: true, lesson: cadeiaPublicada },
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  const concluidasPorCurso = new Map<number, number>();
  for (const { lesson } of feitas) {
    const curso = lesson.module.courseId;
    concluidasPorCurso.set(curso, (concluidasPorCurso.get(curso) ?? 0) + 1);
  }
  const modulos = await prisma.module.findMany({
    where: { courseId: { in: [...concluidasPorCurso.keys()] }, status: PUBLISHED, course: { status: PUBLISHED } },
    select: { courseId: true, _count: { select: { lessons: { where: { status: PUBLISHED } } } } },
  });
  const totalPorCurso = new Map<number, number>();
  for (const m of modulos) totalPorCurso.set(m.courseId, (totalPorCurso.get(m.courseId) ?? 0) + m._count.lessons);

  // Muda com o progresso de quem pede: nunca em cache.
  res.set("Cache-Control", "private, no-store");
  res.json(
    [...concluidasPorCurso].map(([courseId, concluidas]) => ({ courseId, concluidas, total: totalPorCurso.get(courseId) ?? 0 })),
  );
});

// GET /api/progresso/trilhas — o progresso de quem pede em cada trilha DELE que ele
// começou (a barra no cartão da trilha — Bloco MEDIR, etapa 3, decisão do operador de
// 09/10/2026), e se ela está CONCLUÍDA (o certificado, Fase 6.5). Só a cadeia publicada.
router.get("/progresso/trilhas", requireAuth, async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Muda com o progresso de quem pede: nunca em cache.
  res.set("Cache-Control", "private, no-store");
  res.json(await progressoDasTrilhas(user.id));
});

export default router;
