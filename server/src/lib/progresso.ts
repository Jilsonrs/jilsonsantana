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
