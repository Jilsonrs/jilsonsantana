import { ContentStatus, PlanItemType } from "@jilson/core";
import { prisma } from "./prisma.js";

// O PROGRESSO do aluno (Fase 5 — plano aprovado pelo operador em 03/10/2026).
// Só duas operações: concluir uma aula e dizer quais aulas a pessoa concluiu.
// Nada aqui decide ACESSO: quem chama confere antes (rota do aluno com
// `temAcessoAtivo()`, rota do admin com `requireAdmin`).

/**
 * Marca a aula como concluída. Marcar de novo não muda nada: a data que fica é a
 * da PRIMEIRA conclusão. Duas chamadas ao mesmo tempo não quebram (o banco
 * ignora a linha repetida, em vez de recusar).
 */
export async function concluirAula(userId: string, lessonId: number): Promise<void> {
  // FECHA na dúvida, como `temAcessoAtivo()`: no Prisma, `userId: undefined` num
  // filtro quer dizer "sem filtro", e o `updateMany` abaixo marcaria a aula de
  // TODO MUNDO (achado P2 da revisão de segurança, 03/10/2026).
  if (!pessoaValida(userId)) throw new Error("concluirAula sem pessoa");
  const agora = new Date();
  await prisma.lessonProgress.createMany({
    data: [{ userId, lessonId, completed: true, completedAt: agora }],
    skipDuplicates: true,
  });
  // Uma linha que exista sem estar concluída: a que o PONTO da aula cria quando a
  // pessoa abre a aula (Bloco AULA, `onde-parou.ts`).
  await prisma.lessonProgress.updateMany({
    where: { userId, lessonId, completed: false },
    data: { completed: true, completedAt: agora },
  });
}

/** Das aulas pedidas, quais esta pessoa concluiu. Nunca devolve aula fora da lista. */
export async function aulasConcluidas(userId: string, lessonIds: number[]): Promise<number[]> {
  // Sem pessoa, nada — senão a busca voltaria com as conclusões de todo mundo.
  if (!pessoaValida(userId) || lessonIds.length === 0) return [];
  const linhas = await prisma.lessonProgress.findMany({
    where: { userId, completed: true, lessonId: { in: lessonIds } },
    select: { lessonId: true },
    orderBy: { lessonId: "asc" },
  });
  return linhas.map((l) => l.lessonId);
}

export function pessoaValida(userId: unknown): userId is string {
  return typeof userId === "string" && userId.length > 0;
}

const PUBLICADO = ContentStatus.PUBLISHED;

export type ProgressoDaTrilha = { planId: number; concluidas: number; total: number; concluida: boolean };

/**
 * O PROGRESSO NAS TRILHAS DO ALUNO (Fase 5, Bloco MEDIR, etapa 3 — 09/10/2026). As aulas de
 * cada trilha dele são as dos itens: item de aula = a aula; item de curso = as aulas
 * publicadas do curso. Só a cadeia publicada, e a aula que entra pelos dois caminhos conta
 * uma vez. A trilha está CONCLUÍDA quando todas estão concluídas — é o que a Fase 6.5 usa para
 * o certificado. Só as trilhas COMEÇADAS (ao menos uma aula concluída), como a barra do
 * cartão do curso.
 */
export async function progressoDasTrilhas(userId: string): Promise<ProgressoDaTrilha[]> {
  if (!pessoaValida(userId)) return [];
  const trilhas = await prisma.learningPlan.findMany({
    where: { ownerUserId: userId },
    select: { id: true, planModules: { select: { items: { select: { itemType: true, courseId: true, lessonId: true } } } } },
  });
  const itens = trilhas.flatMap((t) => t.planModules.flatMap((m) => m.items));
  const cursos = [...new Set(itens.flatMap((i) => (i.itemType === PlanItemType.COURSE && i.courseId !== null ? [i.courseId] : [])))];
  const avulsas = [...new Set(itens.flatMap((i) => (i.itemType === PlanItemType.LESSON && i.lessonId !== null ? [i.lessonId] : [])))];

  const aulasDosCursos = cursos.length
    ? await prisma.lesson.findMany({
        where: { status: PUBLICADO, module: { status: PUBLICADO, courseId: { in: cursos }, course: { status: PUBLICADO } } },
        select: { id: true, module: { select: { courseId: true } } },
      })
    : [];
  const avulsasPublicadas = avulsas.length
    ? await prisma.lesson.findMany({
        where: { id: { in: avulsas }, status: PUBLICADO, module: { status: PUBLICADO, course: { status: PUBLICADO } } },
        select: { id: true },
      })
    : [];
  const doCurso = new Map<number, number[]>();
  for (const a of aulasDosCursos) doCurso.set(a.module.courseId, [...(doCurso.get(a.module.courseId) ?? []), a.id]);
  const avulsaPublicada = new Set(avulsasPublicadas.map((a) => a.id));
  const todas = [...new Set([...aulasDosCursos.map((a) => a.id), ...avulsaPublicada])];
  const feitas = new Set(await aulasConcluidas(userId, todas));

  return trilhas
    .map((t) => {
      const aulas = new Set<number>();
      for (const item of t.planModules.flatMap((m) => m.items)) {
        if (item.itemType === PlanItemType.COURSE && item.courseId !== null) for (const id of doCurso.get(item.courseId) ?? []) aulas.add(id);
        if (item.itemType === PlanItemType.LESSON && item.lessonId !== null && avulsaPublicada.has(item.lessonId)) aulas.add(item.lessonId);
      }
      const concluidas = [...aulas].filter((id) => feitas.has(id)).length;
      return { planId: t.id, concluidas, total: aulas.size, concluida: aulas.size > 0 && concluidas === aulas.size };
    })
    .filter((p) => p.concluidas > 0);
}
