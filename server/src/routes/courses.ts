import { Router } from "express";
import { Prisma } from "@prisma/client";
import { ContentStatus, LessonKind, contarPalavras, courseCreateSchema, courseUpdateSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";
import { paraBanco, doBanco, comIdioma, idiomaDaLista } from "../lib/language.js";
import { apagarVideo, enderecoAssinado } from "../lib/bunny-stream.js";
import { confirmarVideosProntos } from "../lib/videos-prontos.js";
import { limparCursoNoBunny } from "../lib/limpeza-no-bunny.js";

const router = Router();
const PUBLISHED = ContentStatus.PUBLISHED;

// Public reads — "onboarding aberto e livre" (CLAUDE.md): the catalog is
// browsable by anyone, member or not. Only PUBLISHED content is exposed; nested
// modules/lessons are filtered to PUBLISHED too, so DRAFT/ARCHIVED never leak.

// Ordering shared by every list: operator-set displayOrder, then id as a stable
// tiebreaker.
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

// GET /api/courses?lang=pt|en — catalog cards. lessonCount is DERIVED (Σ
// published lessons across published modules), never a stored column. Lista de
// DESCOBERTA: filtra pelo idioma, como filtra pelo status (CLAUDE.md → Idiomas).
// `videoSeconds` (operador, 30/09/2026: "2 módulos · 4 aulas · 1h 05min") é a
// soma das aulas de VÍDEO publicadas na mesma cadeia — só o que o aluno vê.
// A duração de cada aula não sai: só o total.
router.get("/courses", async (req, res) => {
  const language = idiomaDaLista(req.query.lang, res);
  if (language === null) return;
  const courses = await prisma.course.findMany({
    where: { status: PUBLISHED, language },
    orderBy: byOrder,
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      level: true,
      thumbnailUrl: true,
      camadas: true,
      displayOrder: true,
      modules: {
        where: { status: PUBLISHED },
        select: {
          _count: { select: { lessons: { where: { status: PUBLISHED } } } },
          lessons: {
            where: { status: PUBLISHED, kind: LessonKind.VIDEO },
            select: { videoDurationSeconds: true },
          },
        },
      },
    },
  });

  const cards = courses.map(({ modules, ...course }) => ({
    ...course,
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, m) => sum + m._count.lessons, 0),
    videoSeconds: modules
      .flatMap((m) => m.lessons)
      .reduce((sum, l) => sum + (l.videoDurationSeconds ?? 0), 0),
  }));
  res.json(cards);
});

// GET /api/courses/:slug — full detail tree for the course page (by slug, which
// is the public URL). 404 if missing or not published. NÃO filtra por idioma:
// link direto nunca é barrado, e a assinatura vale nos dois idiomas.
router.get("/courses/:slug", async (req, res) => {
  const course = await prisma.course.findFirst({
    where: { slug: req.params.slug, status: PUBLISHED },
    // `select` EXPLÍCITO, nunca `include` (trava da Fase 3, feita no Bloco U,
    // etapa 2): com `include`, toda coluna nova do curso sai nesta resposta
    // pública sem ninguém decidir — e as colunas de vídeo (o envio em andamento,
    // o vídeo das aulas) não podem sair. Só o que `CourseDetail` (client) usa.
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      level: true,
      learnTags: true,
      requirements: true,
      personas: true,
      highlights: true,
      faq: true,
      camadas: true,
      thumbnailUrl: true,
      introVideoId: true,
      language: true,
      modules: {
        where: { status: PUBLISHED },
        orderBy: byOrder,
        select: {
          id: true,
          title: true,
          layer: true,
          displayOrder: true,
          status: true,
          lessons: {
            where: { status: PUBLISHED },
            orderBy: byOrder,
            select: { id: true, title: true, tags: true, displayOrder: true },
          },
        },
      },
    },
  });

  if (!course) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  // A duração (operador, 30/09/2026): a soma das aulas de VÍDEO publicadas, em
  // módulo publicado — a mesma cadeia do lessonCount. Consulta à parte para a
  // duração de cada aula NÃO entrar na resposta pública (o `select` acima é a
  // lista explícita do que sai).
  const { _sum } = await prisma.lesson.aggregate({
    _sum: { videoDurationSeconds: true },
    where: { status: PUBLISHED, kind: LessonKind.VIDEO, module: { status: PUBLISHED, courseId: course.id } },
  });
  // O vídeo de APRESENTAÇÃO sai para qualquer visitante, sem login: é ativo de
  // venda, a única exceção ao portão de vídeo (CLAUDE.md → Access Architecture).
  // ASSINADO, porque mora na biblioteca com token (operador, 28/09/2026). O
  // endereço é derivado a cada pedido, nunca coluna — por isso esta resposta não
  // pode ficar em cache mais do que a validade da assinatura (24 h).
  res.json({
    ...comIdioma(course),
    introVideoEmbedUrl: enderecoAssinado(course.introVideoId),
    moduleCount: course.modules.length,
    lessonCount,
    videoSeconds: _sum.videoDurationSeconds ?? 0,
  });
});

// ── Admin reads (any status) ─────────────────────────────────────────────────
// The public reads above only ever return PUBLISHED content — an admin
// drafting a course (the normal state while authoring) needs to see DRAFT/
// ARCHIVED too. Same shape as the public routes, just without the status
// filter and keyed by id instead of slug.

// GET /api/admin/courses — every course, any status.
router.get("/admin/courses", requireAdmin, async (_req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: byOrder,
    select: {
      id: true,
      slug: true,
      title: true,
      level: true,
      status: true,
      language: true,
      displayOrder: true,
      thumbnailUrl: true,
      introVideoId: true,
      description: true,
      modules: {
        select: {
          status: true,
          lessons: { select: { status: true, kind: true, bunnyVideoId: true, videoDurationSeconds: true } },
        },
      },
    },
  });
  // O cartão do admin (lista de cursos, 27/09/2026) mostra o PREENCHIMENTO do
  // curso: capa, vídeo de apresentação, descrição e aulas publicadas. O vídeo sai
  // como sim/não e a descrição como NÚMERO DE PALAVRAS (abaixo de 200 ela é
  // "curta" — operador, 28/09/2026): a lista não precisa do texto inteiro.
  const cards = courses.map(({ modules, introVideoId, description, ...course }) => ({
    ...comIdioma(course),
    moduleCount: modules.length,
    lessonCount: modules.reduce((sum, m) => sum + m.lessons.length, 0),
    // A duração (operador, 30/09/2026: "2 módulos · 5 aulas · 1h 05min" também
    // aqui): soma TODO vídeo enviado, como o topo do editor e como o
    // lessonCount desta mesma linha, que conta rascunho. Tela do admin.
    videoSeconds: modules
      .flatMap((m) => m.lessons)
      .filter((l) => l.kind === LessonKind.VIDEO && l.bunnyVideoId)
      .reduce((sum, l) => sum + (l.videoDurationSeconds ?? 0), 0),
    // "Publicada" é a CADEIA: aula publicada dentro de módulo publicado.
    publishedLessonCount: modules
      .filter((m) => m.status === PUBLISHED)
      .reduce((sum, m) => sum + m.lessons.filter((l) => l.status === PUBLISHED).length, 0),
    // O quinto item do Preenchimento (Bloco A, entra com o vídeo das aulas —
    // 28/09/2026): aulas de VÍDEO publicadas na cadeia que ainda não têm vídeo.
    lessonsWithoutVideo: modules
      .filter((m) => m.status === PUBLISHED)
      .reduce(
        (sum, m) =>
          sum + m.lessons.filter((l) => l.status === PUBLISHED && l.kind === LessonKind.VIDEO && !l.bunnyVideoId).length,
        0,
      ),
    hasIntroVideo: introVideoId !== null,
    descriptionWordCount: contarPalavras(description),
  }));
  res.json(cards);
});

// GET /api/admin/courses/:id — full tree by id, modules/lessons of ANY status.
router.get("/admin/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: byOrder,
        include: { lessons: { orderBy: byOrder } },
      },
    },
  });
  if (!course) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // As aulas cujo vídeo ficou pronto desde a última visita já voltam confirmadas,
  // e com a duração (que o topo do editor soma).
  const confirmadas = await confirmarVideosProntos(course.modules.flatMap((m) => m.lessons));
  const modules = course.modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      const lembrado = confirmadas.get(l.id);
      return lembrado ? { ...l, ...lembrado } : l;
    }),
  }));
  res.json({ ...comIdioma({ ...course, modules }), introVideoEmbedUrl: enderecoAssinado(course.introVideoId) });
});

// ── Writes (admin only) ──────────────────────────────────────────────────────
// Express 5 auto-catches rejected promises, so no try/catch (CLAUDE.md). The
// jsonb columns are Zod-typed; cast them to Prisma's Json input.
function jsonFields(input: { highlights?: unknown; faq?: unknown; camadaOverride?: unknown }) {
  return {
    highlights: input.highlights as Prisma.InputJsonValue | undefined,
    faq: input.faq as Prisma.InputJsonValue | undefined,
    camadaOverride: input.camadaOverride as Prisma.InputJsonValue | undefined,
  };
}

// POST /api/courses — create. Friendly 409 on duplicate slug (the unique index
// is the hard guard; a rare race surfaces as 500).
router.post("/courses", requireAdmin, async (req, res) => {
  const data = validate(courseCreateSchema, req.body, res);
  if (data === null) return;
  if (await prisma.course.findUnique({ where: { slug: data.slug } })) {
    res.status(409).json({ error: "SlugTaken" });
    return;
  }
  const { language, ...campos } = data;
  const course = await prisma.course.create({
    data: { ...campos, language: paraBanco(language), ...jsonFields(data) },
  });
  res.status(201).json(comIdioma(course));
});

// PATCH /api/courses/:id — update (404 if missing; 409 if slug taken by another).
//
// TROCAR O IDIOMA (decisão do operador, 24/09/2026): só enquanto o curso é
// RASCUNHO — publicado, trava (409 LanguageLocked). E nem em rascunho se ele já
// está numa trilha do outro idioma (409 LanguageInUse): é o curso que foi
// publicado, entrou numa trilha e voltou a rascunho — trocar quebraria a regra
// "trilha não mistura idiomas".
router.patch("/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const data = validate(courseUpdateSchema, req.body, res);
  if (data === null) return;
  const atual = await prisma.course.findUnique({ where: { id } });
  if (!atual) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const { language, ...campos } = data;
  const novoIdioma = language ? paraBanco(language) : undefined;
  if (novoIdioma && novoIdioma !== atual.language) {
    if (atual.status !== ContentStatus.DRAFT) {
      res.status(409).json({ error: "LanguageLocked" });
      return;
    }
    const emTrilhaDeOutroIdioma = await prisma.planItem.findFirst({
      where: {
        OR: [{ courseId: id }, { lesson: { module: { courseId: id } } }],
        planModule: { plan: { language: { not: novoIdioma } } },
      },
    });
    if (emTrilhaDeOutroIdioma) {
      res.status(409).json({ error: "LanguageInUse" });
      return;
    }
  }
  if (data.slug) {
    const bySlug = await prisma.course.findUnique({ where: { slug: data.slug } });
    if (bySlug && bySlug.id !== id) {
      res.status(409).json({ error: "SlugTaken" });
      return;
    }
  }
  // APAGAR O ID DO VÍDEO DE APRESENTAÇÃO apaga o vídeo no Bunny (decisão do
  // operador, 29/09/2026 — como a troca de vídeo já faz). O Bunny PRIMEIRO, como
  // na exclusão do curso: se ele recusar, nada é gravado, e o vídeo não fica
  // perdido lá sem nenhum curso apontando para ele. `undefined` (campo ausente)
  // não mexe no vídeo; só `null` apaga.
  if (data.introVideoId === null && atual.introVideoId) {
    if (!(await apagarVideo("aulas", atual.introVideoId))) {
      res.status(502).json({ error: "BunnyNaoApagou" });
      return;
    }
  }
  const course = await prisma.course.update({
    where: { id },
    data: { ...campos, language: novoIdioma, ...jsonFields(data) },
  });
  res.json(comIdioma(course));
});

// DELETE /api/courses/:id — hard delete (cascades modules/lessons + plan_items).
router.delete("/courses/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.course.findUnique({ where: { id } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // O Bunny primeiro: o que existe lá não pode ficar perdido (operador, 28/09/2026).
  if (!(await limparCursoNoBunny(id))) {
    res.status(502).json({ error: "BunnyNaoApagou" });
    return;
  }
  await prisma.course.delete({ where: { id } });
  res.status(204).end();
});

export default router;
