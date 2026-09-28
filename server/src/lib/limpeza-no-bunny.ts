import { prisma } from "./prisma.js";
import { apagarVideo } from "./bunny-stream.js";
import { apagarArquivoDaAula } from "./bunny-storage.js";

// EXCLUIR APAGA NO BUNNY TAMBÉM (decisão do operador, 28/09/2026: "deveria
// excluir o vídeo, já que ele ficaria perdido no Bunny"). Excluir aula, módulo ou
// curso apaga no banco em cascata; sem isto, o vídeo, o envio pela metade e os
// arquivos para baixar ficavam guardados no Bunny SEM NINGUÉM SABER ONDE — nenhum
// código conseguiria mais limpá-los (achado da revisão de segurança, 28/09).
//
// Duas regras:
//   - o Bunny PRIMEIRO, o registro DEPOIS. Se o Bunny recusar, a função devolve
//     `false` e a exclusão PARA: nada fica perdido sem registro;
//   - cada coisa apagada no Bunny sai do banco NA HORA. Se parar no meio, tentar
//     de novo continua de onde parou (e 404 no Bunny conta como já apagado).
// Sem o Bunny configurado neste ambiente, uma aula COM vídeo ou arquivo não se
// exclui (a função não consegue apagar lá); aula sem nada no Bunny se exclui.

/** Apaga no Bunny tudo o que a aula tem lá: os arquivos, o envio pela metade e o vídeo. */
export async function limparAulaNoBunny(aulaId: number): Promise<boolean> {
  const aula = await prisma.lesson.findUnique({
    where: { id: aulaId },
    select: { bunnyVideoId: true, bunnyVideoPendingId: true, files: { select: { id: true, storagePath: true } } },
  });
  if (!aula) return true;

  for (const arquivo of aula.files) {
    if (!(await apagarArquivoDaAula(arquivo.storagePath)).ok) return false;
    await prisma.lessonFile.delete({ where: { id: arquivo.id } });
  }
  if (aula.bunnyVideoPendingId) {
    if (!(await apagarVideo("aulas", aula.bunnyVideoPendingId))) return false;
    await prisma.lesson.update({ where: { id: aulaId }, data: { bunnyVideoPendingId: null } });
  }
  if (aula.bunnyVideoId) {
    if (!(await apagarVideo("aulas", aula.bunnyVideoId))) return false;
    await prisma.lesson.update({ where: { id: aulaId }, data: { bunnyVideoId: null } });
  }
  return true;
}

/** Todas as aulas do módulo. */
export async function limparModuloNoBunny(moduloId: number): Promise<boolean> {
  const aulas = await prisma.lesson.findMany({ where: { moduleId: moduloId }, select: { id: true } });
  for (const aula of aulas) {
    if (!(await limparAulaNoBunny(aula.id))) return false;
  }
  return true;
}

/** Todas as aulas do curso, e o vídeo de apresentação dele (e o envio pela metade). */
export async function limparCursoNoBunny(cursoId: number): Promise<boolean> {
  const modulos = await prisma.module.findMany({ where: { courseId: cursoId }, select: { id: true } });
  for (const modulo of modulos) {
    if (!(await limparModuloNoBunny(modulo.id))) return false;
  }
  const curso = await prisma.course.findUnique({
    where: { id: cursoId },
    select: { introVideoId: true, introVideoPendingId: true },
  });
  if (curso?.introVideoPendingId) {
    if (!(await apagarVideo("apresentacao", curso.introVideoPendingId))) return false;
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoPendingId: null } });
  }
  if (curso?.introVideoId) {
    if (!(await apagarVideo("apresentacao", curso.introVideoId))) return false;
    await prisma.course.update({ where: { id: cursoId }, data: { introVideoId: null } });
  }
  return true;
}
