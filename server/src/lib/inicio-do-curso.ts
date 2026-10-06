import { prisma } from "./prisma.js";

// QUEM JÁ COMEÇOU O CURSO (decisão do operador, 06/10/2026): a escola não tem
// matrícula, então "os alunos de um curso" — para quem o operador manda um aviso —
// são os que abriram uma aula dele com acesso. Gravado pela página da aula; a
// primeira vez fica.

/** Registra que a pessoa começou o curso. Falhar aqui nunca derruba a aula: só registra no log. */
export async function registrarInicioDoCurso(userId: string, courseId: number): Promise<void> {
  // FECHA na dúvida, como `concluirAula`: sem pessoa, nada.
  if (typeof userId !== "string" || userId.length === 0) return;
  try {
    await prisma.courseStart.createMany({ data: [{ userId, courseId }], skipDuplicates: true });
  } catch (erro) {
    const codigo = erro instanceof Error && "code" in erro ? String((erro as { code: unknown }).code) : "sem-codigo";
    console.error(`[inicio-do-curso] falhou: user=${userId} course=${courseId} ${codigo}`);
  }
}
