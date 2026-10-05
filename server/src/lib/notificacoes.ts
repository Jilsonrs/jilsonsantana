import { ContentStatus } from "@jilson/core";
import type { NotificationKind } from "@prisma/client";
import { prisma } from "./prisma.js";
import { aulasConcluidas } from "./progresso.js";

// AS MENSAGENS DO CURSO no sino de Notificações (Bloco E, etapa 4 — decisões do
// operador, 04/10/2026). Duas regras, e só elas:
//   - BOAS-VINDAS: na primeira vez que a pessoa abre QUALQUER aula do curso;
//   - PARABÉNS: quando a última aula da lista que ela vê fica concluída.
// Nada aqui decide ACESSO: quem chama confere antes. As duas só para quem ASSINA
// (`temAcessoAtivo()`) ou para o admin (`requireAdmin`) — nunca para quem só
// assistiu prévia grátis (achado P2 da revisão de segurança, 04/10/2026).
//
// O texto e o título do curso são COPIADOS no envio: editar a mensagem do curso
// depois não muda o que a pessoa já recebeu. Mensagem em branco, nada é enviado. Uma de cada tipo por
// pessoa e curso — o banco garante (índice único), então chamar de novo não faz nada.

const PUBLISHED = ContentStatus.PUBLISHED;

/** Manda a boas-vindas do curso, se ainda não mandou e se o curso tem a mensagem. */
export async function enviarBoasVindas(userId: string, courseId: number): Promise<void> {
  const curso = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true, welcomeMessage: true } });
  if (curso) await enviar(userId, courseId, curso.title, "BOAS_VINDAS", curso.welcomeMessage);
}

/**
 * Manda os parabéns se a pessoa concluiu TODAS as aulas do curso desta aula. O
 * aluno conta só o que vê (aula publicada em módulo publicado); o admin, todas,
 * como a barra de progresso dele.
 */
export async function enviarParabensSeConcluiu(userId: string, lessonId: number, soPublicado: boolean): Promise<void> {
  const aula = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true, course: { select: { title: true, congratsMessage: true } } } } },
  });
  if (!aula) return;
  const { courseId, course } = aula.module;
  // Sem mensagem, nem precisa contar.
  if (!course.congratsMessage?.trim()) return;
  const filtro = soPublicado ? { status: PUBLISHED, module: { courseId, status: PUBLISHED } } : { module: { courseId } };
  const ids = (await prisma.lesson.findMany({ where: filtro, select: { id: true } })).map((l) => l.id);
  if (ids.length === 0) return;
  const feitas = await aulasConcluidas(userId, ids);
  if (feitas.length === ids.length) await enviar(userId, courseId, course.title, "PARABENS", course.congratsMessage);
}

/**
 * Para quem chama na página da aula e na conclusão: a notificação é efeito
 * secundário, e a falha dela NUNCA derruba a aula nem a conclusão já gravada
 * (achado P2 da revisão de segurança, 04/10/2026). Loga só ids e o código.
 */
export async function semDerrubar(oQue: string, userId: string, id: number, enviarAgora: () => Promise<void>): Promise<void> {
  try {
    await enviarAgora();
  } catch (erro) {
    const codigo = erro instanceof Error && "code" in erro ? String((erro as { code: unknown }).code) : "sem-codigo";
    console.error(`[notificacao] ${oQue} falhou: user=${userId} id=${id} ${codigo}`);
  }
}

async function enviar(userId: string, courseId: number, courseTitle: string, kind: NotificationKind, texto: string | null | undefined) {
  // FECHA na dúvida, como `concluirAula`: sem pessoa, nada.
  if (typeof userId !== "string" || userId.length === 0) throw new Error("notificação sem pessoa");
  const body = texto?.trim();
  if (!body) return;
  // `skipDuplicates`: a segunda vez (ou duas ao mesmo tempo) não quebra nem repete.
  await prisma.notification.createMany({ data: [{ userId, courseId, courseTitle, kind, body }], skipDuplicates: true });
}
