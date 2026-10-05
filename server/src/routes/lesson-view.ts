import { pipeline } from "node:stream/promises";
import { Router, type Request, type Response } from "express";
import { ContentStatus, LessonKind } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { loadSession, requireAdmin } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { doBanco } from "../lib/language.js";
import { aulaLiberada, temAcessoAtivo } from "../lib/acesso.js";
import { enderecoAssinado } from "../lib/bunny-stream.js";
import { lerArquivoDaAula } from "../lib/bunny-storage.js";
import { nomeParaDownload } from "../lib/nome-do-download.js";
import { aulasConcluidas } from "../lib/progresso.js";
import { enviarBoasVindas, semDerrubar } from "../lib/notificacoes.js";
import { oQueOCursoInclui } from "../lib/inclui.js";

const router = Router();

// A PÁGINA DA AULA (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026). Duas portas, e só duas:
//   - a do ALUNO: só a cadeia PUBLICADA (aula → módulo → curso). O player e o
//     texto saem quando a aula é PRÉVIA GRÁTIS (qualquer visitante, sem login — a
//     segunda exceção ao portão de vídeo) ou quando `temAcessoAtivo()` diz sim.
//     Os ARQUIVOS, só com assinatura: na prévia grátis o visitante só assiste
//     (decisão do operador, 29/09/2026). Fora isso, a página recebe só a lista do
//     curso e "para assinantes";
//   - a do ADMIN: qualquer status, com o rascunho marcado, e o conteúdo sempre —
//     é por ela que o operador assiste (decisão dele, 29/09/2026). NÃO é uma
//     exceção na trava: é leitura de admin, atrás do `requireAdmin`.

const PUBLISHED = ContentStatus.PUBLISHED;
const byOrder = [{ displayOrder: "asc" as const }, { id: "asc" as const }];
const cadeiaPublicada = { status: PUBLISHED, module: { status: PUBLISHED, course: { status: PUBLISHED } } };

const camposDaAula = {
  id: true,
  title: true,
  kind: true,
  content: true,
  bunnyVideoId: true,
  isFreePreview: true,
  status: true,
  moduleId: true,
  module: { select: { courseId: true } },
} as const;

/**
 * O curso da aula: a lista do nível 2 (o aluno vê só o publicado) e os DETALHES
 * que ficam embaixo do player, em toda aula — descrição, o que vai aprender,
 * pré-requisitos, pra quem é, camadas, destaques e perguntas (decisão do operador,
 * 29/09/2026). São os mesmos campos que a página pública já mostra.
 */
async function arvoreDoCurso(courseId: number, soPublicado: boolean) {
  const filtro = soPublicado ? { status: PUBLISHED } : {};
  const curso = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      language: true,
      status: true,
      level: true,
      description: true,
      learnTags: true,
      requirements: true,
      personas: true,
      highlights: true,
      faq: true,
      camadas: true,
      // O quadro "Este curso inclui", também no "Sobre o curso" (operador, 04/10/2026).
      materiais: true,
      modules: {
        where: filtro,
        orderBy: byOrder,
        select: {
          id: true,
          title: true,
          status: true,
          lessons: {
            where: filtro,
            orderBy: byOrder,
            select: { id: true, title: true, kind: true, isFreePreview: true, status: true, videoDurationSeconds: true, _count: { select: { files: true } } },
          },
        },
      },
    },
  });
  if (!curso) return null;
  return {
    id: curso.id,
    slug: curso.slug,
    title: curso.title,
    language: doBanco(curso.language),
    status: curso.status,
    level: curso.level,
    description: curso.description,
    learnTags: curso.learnTags,
    requirements: curso.requirements,
    personas: curso.personas,
    highlights: curso.highlights,
    faq: curso.faq,
    camadas: curso.camadas,
    materiais: curso.materiais,
    // As linhas de "Este curso inclui" que se calculam sozinhas, da mesma lista
    // que a pessoa vê (05/10/2026 — `lib/inclui.ts`).
    inclui: await oQueOCursoInclui(curso.id, soPublicado),
    // A duração do curso: só aula de VÍDEO, como na página do curso — uma aula que
    // virou texto não leva o tempo do vídeo antigo. O aluno soma só o publicado
    // (é a lista que ele vê); o admin, a lista inteira.
    videoSeconds: curso.modules
      .flatMap((m) => m.lessons)
      .reduce((total, l) => total + (l.kind === LessonKind.VIDEO ? (l.videoDurationSeconds ?? 0) : 0), 0),
    modulos: curso.modules.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      aulas: m.lessons.map(({ _count, videoDurationSeconds, ...aula }) => ({ ...aula, temArquivos: _count.files > 0 })),
    })),
  };
}

type Aula = { id: number; title: string; kind: string; content: string | null; bunnyVideoId: string | null; isFreePreview: boolean; status: string; moduleId: number };

/**
 * A aula atual. O player e o texto SÓ entram quando `liberada`; os arquivos, só
 * quando `arquivosLiberados` (assinatura ou admin). Bloqueada, nem a chave aparece.
 */
async function aulaParaAPagina(aula: Aula, liberada: boolean, arquivosLiberados: boolean) {
  const base = {
    id: aula.id,
    title: aula.title,
    kind: aula.kind,
    isFreePreview: aula.isFreePreview,
    status: aula.status,
    moduloId: aula.moduleId,
    liberada,
    arquivosLiberados,
  };
  if (!liberada) return base;
  const conteudo = {
    ...base,
    playerUrl: aula.kind === LessonKind.VIDEO ? enderecoAssinado(aula.bunnyVideoId, { tocarAoAbrir: true }) : null,
    texto: aula.kind === LessonKind.TEXT ? aula.content : null,
  };
  if (!arquivosLiberados) return conteudo;
  const arquivos = await prisma.lessonFile.findMany({
    where: { lessonId: aula.id },
    orderBy: { id: "asc" },
    select: { id: true, originalName: true, sizeBytes: true },
  });
  return { ...conteudo, arquivos: arquivos.map((a) => ({ ...a, sizeBytes: Number(a.sizeBytes) })) };
}

/**
 * As aulas DESTE curso que quem pede concluiu (Fase 5, 03/10/2026) — só entre as
 * aulas da lista que ele vê, então nunca vaza o id de um rascunho. Sem login, nada.
 */
function concluidasDoCurso(userId: string | undefined, curso: Awaited<ReturnType<typeof arvoreDoCurso>>): Promise<number[]> {
  if (!userId || !curso) return Promise.resolve([]);
  return aulasConcluidas(userId, curso.modulos.flatMap((m) => m.aulas.map((a) => a.id)));
}

/** Quem pede está logado e com assinatura que dá acesso? Sem sessão: não. */
async function temAssinatura(req: Request): Promise<boolean> {
  const sessao = await loadSession(req);
  return sessao ? temAcessoAtivo(sessao.user.id) : false;
}

// GET /api/lessons/:id/aula — a página da aula para o ALUNO (e para o visitante).
router.get("/lessons/:id/aula", async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: camposDaAula });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const sessao = await loadSession(req);
  const assinante = sessao ? await temAcessoAtivo(sessao.user.id) : false;
  const curso = await arvoreDoCurso(aula.module.courseId, true);
  // A boas-vindas do curso chega ao abrir a primeira aula — só para quem ASSINA
  // (operador, 04/10/2026): o visitante e o logado sem assinatura não recebem,
  // nem na prévia grátis.
  if (sessao && assinante) {
    const { id: userId } = sessao.user;
    await semDerrubar("boas-vindas", userId, aula.module.courseId, () => enviarBoasVindas(userId, aula.module.courseId));
  }
  // A página muda com a assinatura e o progresso de quem pede: nunca em cache.
  res.set("Cache-Control", "private, no-store");
  res.json({
    curso,
    aula: await aulaParaAPagina(aula, aulaLiberada(aula, assinante), assinante),
    concluidas: await concluidasDoCurso(sessao?.user.id, curso),
  });
});

// GET /api/admin/lessons/:id/aula — a mesma página para o ADMIN: qualquer status.
router.get("/admin/lessons/:id/aula", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await prisma.lesson.findUnique({ where: { id }, select: camposDaAula });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const curso = await arvoreDoCurso(aula.module.courseId, false);
  // O admin também recebe: ele testa como aluno (a plataforma é uma só).
  const admin = req.user;
  if (admin) await semDerrubar("boas-vindas", admin.id, aula.module.courseId, () => enviarBoasVindas(admin.id, aula.module.courseId));
  res.set("Cache-Control", "private, no-store");
  res.json({ curso, aula: await aulaParaAPagina(aula, true, true), concluidas: await concluidasDoCurso(req.user?.id, curso) });
});

// GET /api/admin/courses/:id/pagina — a PRÉ-VISUALIZAÇÃO do curso como aluno, no
// passo Publicar (decisão do operador, 04/10/2026): o mesmo curso que a página da
// aula monta para o admin, em qualquer status, SEM aula. Serve ao curso que ainda
// não tem nenhuma aula; com aula, a prévia abre a primeira pela rota de sempre.
router.get("/admin/courses/:id/pagina", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const curso = await arvoreDoCurso(id, false);
  if (!curso) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.set("Cache-Control", "private, no-store");
  res.json({ curso });
});

/** Entrega o arquivo do Storage, em fluxo, com o NOME ORIGINAL limpo. */
async function entregarArquivo(res: Response, arquivo: { id: number; storagePath: string; originalName: string }) {
  const leitura = await lerArquivoDaAula(arquivo.storagePath);
  if (!leitura.ok) {
    const status = leitura.motivo === "NaoConfigurado" ? 503 : leitura.motivo === "NaoEncontrado" ? 404 : 502;
    res.status(status).json({ error: `Storage${leitura.motivo}` });
    return;
  }
  // `attachment()` escreve o Content-Disposition com o nome em UTF-8 (RFC 5987)
  // e o tipo pela extensão; sempre download, nunca aberto no navegador.
  res.attachment(nomeParaDownload(arquivo.originalName));
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "private, no-store");
  if (leitura.tamanho) res.set("Content-Length", leitura.tamanho);
  // `pipeline`, nunca `.pipe()`: se o Bunny cair no meio, o erro vem para cá em
  // vez de virar "Unhandled 'error' event" e derrubar o servidor inteiro; e se o
  // aluno desistir, o fluxo do Bunny é fechado junto (achado P1 da revisão de
  // segurança, 29/09/2026).
  try {
    await pipeline(leitura.corpo, res);
  } catch (erro) {
    const codigo = erro instanceof Error && "code" in erro ? String((erro as NodeJS.ErrnoException).code) : "sem-codigo";
    console.error(`[download] arquivo ${arquivo.id} interrompido: ${codigo}`);
    if (!res.headersSent && !res.destroyed) res.status(502).json({ error: "StorageFalhou" });
  }
}

// GET /api/lessons/:id/files/:fileId — o download do ALUNO: só com assinatura.
router.get("/lessons/:id/files/:fileId", async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const fileId = parseId(req.params.fileId, res);
  if (fileId === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: { id: true } });
  // O arquivo tem que ser DESTA aula: o id de outra aula não passa por aqui.
  const arquivo = aula ? await prisma.lessonFile.findFirst({ where: { id: fileId, lessonId: id } }) : null;
  if (!aula || !arquivo) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // Só com assinatura, inclusive na prévia grátis (decisão do operador, 29/09/2026).
  if (!(await temAssinatura(req))) {
    res.status(403).json({ error: "AssinaturaNecessaria" });
    return;
  }
  await entregarArquivo(res, arquivo);
});

// GET /api/admin/lesson-files/:id/download — o download do ADMIN, qualquer status.
router.get("/admin/lesson-files/:id/download", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const arquivo = await prisma.lessonFile.findUnique({ where: { id } });
  if (!arquivo) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  await entregarArquivo(res, arquivo);
});

export default router;
