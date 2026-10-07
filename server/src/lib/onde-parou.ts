import { ContentStatus, LessonKind, pontoUtil } from "@jilson/core";
import { prisma } from "./prisma.js";
import { aulasConcluidas, pessoaValida } from "./progresso.js";

// ONDE A PESSOA PAROU (Bloco AULA — plano aprovado pelo operador em 06/10/2026):
// quem sai e volta — no mesmo aparelho ou em outro, amanhã ou daqui a um ano —
// abre a MESMA aula, no MESMO segundo. Guardado na CONTA (`lesson_progress`), e
// não no navegador: o Safari apaga o que o site guarda no aparelho depois de 7
// dias sem visita. Três operações: gravar o ponto, dizer de que segundo a aula
// abre, e dizer em que aula a pessoa entra quando volta ao curso.
//
// Nada aqui decide ACESSO: quem chama confere antes (a rota do aluno com
// `aulaLiberada()`, a do admin com `requireAdmin`), como em `progresso.ts`.

const PUBLISHED = ContentStatus.PUBLISHED;
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];

/**
 * A pessoa está nesta aula, neste segundo (`null` = viu até o fim, ou a aula não
 * tem vídeo). Grava o ponto e a hora — a hora é o que diz em que aula ela entra
 * quando volta ao curso. Não mexe na conclusão. Duas chamadas ao mesmo tempo não
 * quebram (o banco ignora a linha repetida, em vez de recusar).
 */
export async function gravarPonto(userId: string, lessonId: number, segundos: number | null): Promise<void> {
  // FECHA na dúvida, como `concluirAula`: no Prisma, `userId: undefined` num filtro
  // quer dizer "sem filtro", e o `updateMany` abaixo gravaria o ponto de TODO MUNDO.
  if (!pessoaValida(userId)) throw new Error("gravarPonto sem pessoa");
  const agora = new Date();
  // O player avisa o tempo com casas decimais; a coluna guarda o segundo inteiro.
  const ponto = segundos === null ? null : Math.floor(segundos);
  await prisma.lessonProgress.createMany({
    data: [{ userId, lessonId, positionSeconds: ponto, lastSeenAt: agora }],
    skipDuplicates: true,
  });
  await prisma.lessonProgress.updateMany({
    where: { userId, lessonId },
    data: { positionSeconds: ponto, lastSeenAt: agora },
  });
}

/**
 * De que segundo a aula abre para esta pessoa: o ponto dela, ou `null` (do começo).
 * Sem pessoa, do começo. O começo e o fim do vídeo contam como "do começo"
 * (`pontoUtil`, no `core`: a mesma regra da tela).
 */
export async function pontoDaAula(userId: string | undefined, lessonId: number, duracao: number | null): Promise<number | null> {
  if (!pessoaValida(userId)) return null;
  const linha = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { positionSeconds: true },
  });
  return pontoUtil(linha?.positionSeconds ?? null, duracao);
}

/**
 * O vídeo da aula foi trocado: o ponto de quem estava no meio não vale para o
 * vídeo novo (num vídeo mais curto, cairia depois do fim). Volta para o começo —
 * ZERO, e não vazio: vazio quer dizer "viu até o fim", e faria a entrada no curso
 * achar que a pessoa terminou o curso.
 */
export async function esquecerPontosDaAula(lessonId: number): Promise<void> {
  // FECHA na dúvida, como `gravarPonto` (achado P2 da revisão de segurança,
  // 06/10/2026): `lessonId: undefined` sumiria do filtro, e o `updateMany`
  // zeraria o ponto de todo mundo em todas as aulas.
  if (!Number.isInteger(lessonId) || lessonId <= 0) throw new Error("esquecerPontosDaAula sem aula");
  await prisma.lessonProgress.updateMany({ where: { lessonId, positionSeconds: { gt: 0 } }, data: { positionSeconds: 0 } });
}

/**
 * Em que aula a pessoa entra quando abre o curso (decisões do operador,
 * 06/10/2026). Só a cadeia PUBLICADA, na ordem do Conteúdo, e sem filtro de idioma
 * (link direto não filtra):
 *   - visitante, ou quem nunca abriu uma aula do curso: a primeira aula;
 *   - quem já abriu: a última aula em que esteve — aula que saiu do ar é pulada;
 *   - quem viu até o fim a ÚLTIMA aula (de vídeo) do curso: a primeira que ainda
 *     não concluiu; concluiu todas, a primeira.
 * `null`: o curso não existe ou não está publicado. `aulaId: null`: o curso não tem
 * aula publicada.
 */
export async function aulaDeEntrada(slug: string, userId: string | undefined): Promise<{ aulaId: number | null } | null> {
  const curso = await prisma.course.findFirst({
    where: { slug, status: PUBLISHED },
    select: {
      modules: {
        where: { status: PUBLISHED },
        orderBy: byOrder,
        select: { lessons: { where: { status: PUBLISHED }, orderBy: byOrder, select: { id: true, kind: true } } },
      },
    },
  });
  if (!curso) return null;
  const lista = curso.modules.flatMap((m) => m.lessons);
  if (lista.length === 0) return { aulaId: null };
  const primeira = lista[0].id;
  if (!pessoaValida(userId)) return { aulaId: primeira };

  const ids = lista.map((a) => a.id);
  // Só entre as aulas da lista publicada: a que saiu do ar não volta.
  const ultima = await prisma.lessonProgress.findFirst({
    where: { userId, lessonId: { in: ids }, lastSeenAt: { not: null } },
    orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
    select: { lessonId: true, positionSeconds: true, completed: true },
  });
  if (!ultima) return { aulaId: primeira };

  const ultimaDoCurso = lista[lista.length - 1];
  const terminouOCurso =
    ultima.lessonId === ultimaDoCurso.id && ultimaDoCurso.kind === LessonKind.VIDEO && ultima.completed && ultima.positionSeconds === null;
  if (!terminouOCurso) return { aulaId: ultima.lessonId };

  const feitas = new Set(await aulasConcluidas(userId, ids));
  return { aulaId: (lista.find((a) => !feitas.has(a.id)) ?? lista[0]).id };
}
