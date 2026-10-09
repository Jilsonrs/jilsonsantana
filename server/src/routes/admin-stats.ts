import { Router } from "express";
import { Prisma } from "@prisma/client";
import { Role } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

// OS NÚMEROS DO CARTÃO DO CURSO NO ADMIN (Fase 5, Bloco MEDIR, etapa 2 — Bloco A de
// 27/09/2026 e decisões do operador de 09/10/2026). Leitura do operador, NUNCA do site. Rota
// própria de estatística, à parte do que guarda (CLAUDE.md → Analytics Convention):
//   - HORAS ASSISTIDAS: o tempo entre um "tocou" e o evento seguinte da mesma pessoa na mesma
//     aula (os eventos do vídeo, etapa 1). Da revisão de segurança da etapa 1: cada trecho
//     conta no máximo a duração do vídeo da aula (um fechamento perdido não vira dias), e o
//     "tocou" sem evento seguinte não conta;
//   - ALUNOS QUE COMEÇARAM: quem abriu ao menos uma aula do curso (a linha do progresso nasce
//     ao abrir — Bloco AULA), contado na primeira vez;
//   - os dois NO MÊS (o de Brasília) e no TOTAL; só ALUNOS — o admin não entra, nem conta
//     excluída (`deletedAt`).

/** Sem a duração do vídeo (ainda processando), o teto de um trecho. */
const TETO_SEM_DURACAO = 3 * 60 * 60;
/** O mês é o de Brasília: o começo dele, na hora do banco (UTC, como o Prisma grava). */
const INICIO_DO_MES = Prisma.sql`((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC')`;

type Linha = { courseId: number; total: number; mes: number };

export type NumerosDoCurso = {
  courseId: number;
  /** Segundos assistidos. */
  horas: { total: number; mes: number };
  alunos: { total: number; mes: number };
};

/** Os números de cada curso que tem algum (curso sem nenhum não vem: é zero). */
export async function numerosDosCursos(): Promise<NumerosDoCurso[]> {
  const horas = await prisma.$queryRaw<Linha[]>`
    WITH eventos AS (
      SELECT e."lessonId", e."type", e."createdAt",
             LEAD(e."createdAt") OVER (PARTITION BY e."userId", e."lessonId" ORDER BY e."createdAt", e."id") AS seguinte
        FROM "lesson_event" e
        JOIN "user" u ON u."id" = e."userId"
       WHERE u."role" = ${Role.MEMBER} AND u."deletedAt" IS NULL
    ), trechos AS (
      SELECT m."courseId", ev."createdAt",
             LEAST(EXTRACT(EPOCH FROM (ev.seguinte - ev."createdAt")), COALESCE(NULLIF(l."videoDurationSeconds", 0), ${TETO_SEM_DURACAO})) AS segundos
        FROM eventos ev
        JOIN "lesson" l ON l."id" = ev."lessonId"
        JOIN "module" m ON m."id" = l."moduleId"
       WHERE ev."type" = 'PLAY' AND ev.seguinte IS NOT NULL
    )
    SELECT "courseId",
           COALESCE(SUM(segundos), 0)::float8 AS total,
           COALESCE(SUM(segundos) FILTER (WHERE "createdAt" >= ${INICIO_DO_MES}), 0)::float8 AS mes
      FROM trechos
     GROUP BY "courseId"`;

  const alunos = await prisma.$queryRaw<Linha[]>`
    WITH inicio AS (
      SELECT m."courseId", p."userId", MIN(p."createdAt") AS comecou
        FROM "lesson_progress" p
        JOIN "user" u ON u."id" = p."userId"
        JOIN "lesson" l ON l."id" = p."lessonId"
        JOIN "module" m ON m."id" = l."moduleId"
       WHERE u."role" = ${Role.MEMBER} AND u."deletedAt" IS NULL
       GROUP BY m."courseId", p."userId"
    )
    SELECT "courseId",
           COUNT(*)::float8 AS total,
           COUNT(*) FILTER (WHERE comecou >= ${INICIO_DO_MES})::float8 AS mes
      FROM inicio
     GROUP BY "courseId"`;

  const porCurso = new Map<number, NumerosDoCurso>();
  const doCurso = (courseId: number) => {
    const existente = porCurso.get(courseId);
    if (existente) return existente;
    const novo = { courseId, horas: { total: 0, mes: 0 }, alunos: { total: 0, mes: 0 } };
    porCurso.set(courseId, novo);
    return novo;
  };
  for (const h of horas) doCurso(h.courseId).horas = { total: Math.round(h.total), mes: Math.round(h.mes) };
  for (const a of alunos) doCurso(a.courseId).alunos = { total: a.total, mes: a.mes };
  return [...porCurso.values()];
}

const router = Router();

// GET /api/admin/stats/cursos — os números de cada curso, para o cartão da lista do admin.
router.get("/admin/stats/cursos", requireAdmin, async (_req, res) => {
  res.set("Cache-Control", "private, no-store");
  res.json({ cursos: await numerosDosCursos() });
});

export default router;
