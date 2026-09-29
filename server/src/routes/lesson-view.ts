import { Router, type Response } from "express";
import { ContentStatus, LessonKind } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { loadSession, requireAdmin } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { doBanco } from "../lib/language.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { enderecoAssinado } from "../lib/bunny-stream.js";
import { lerArquivoDaAula } from "../lib/bunny-storage.js";
import { nomeParaDownload } from "../lib/nome-do-download.js";

const router = Router();

// A PÁGINA DA AULA (etapa 4 do Bloco U — plano aprovado pelo operador em
// 29/09/2026). Duas portas, e só duas:
//   - a do ALUNO: só a cadeia PUBLICADA (aula → módulo → curso); o conteúdo
//     (player, texto, arquivos) sai quando a aula é PRÉVIA GRÁTIS (qualquer
//     visitante, sem login — a segunda exceção ao portão de vídeo) ou quando
//     `temAcessoAtivo()` diz sim. Fora isso, a página recebe só a lista do curso
//     e "para assinantes";
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

/** O curso da aula, para a lista do nível 2. O aluno vê só o publicado. */
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
            select: { id: true, title: true, kind: true, isFreePreview: true, status: true, _count: { select: { files: true } } },
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
    modulos: curso.modules.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      aulas: m.lessons.map(({ _count, ...aula }) => ({ ...aula, temArquivos: _count.files > 0 })),
    })),
  };
}

type Aula = { id: number; title: string; kind: string; content: string | null; bunnyVideoId: string | null; isFreePreview: boolean; status: string; moduleId: number };

/** A aula atual. O conteúdo SÓ entra quando `liberada` — bloqueada, nem a chave aparece. */
async function aulaParaAPagina(aula: Aula, liberada: boolean) {
  const base = { id: aula.id, title: aula.title, kind: aula.kind, isFreePreview: aula.isFreePreview, status: aula.status, moduloId: aula.moduleId, liberada };
  if (!liberada) return base;
  const arquivos = await prisma.lessonFile.findMany({
    where: { lessonId: aula.id },
    orderBy: { id: "asc" },
    select: { id: true, originalName: true, sizeBytes: true },
  });
  return {
    ...base,
    playerUrl: aula.kind === LessonKind.VIDEO ? enderecoAssinado(aula.bunnyVideoId) : null,
    texto: aula.kind === LessonKind.TEXT ? aula.content : null,
    arquivos: arquivos.map((a) => ({ ...a, sizeBytes: Number(a.sizeBytes) })),
  };
}

/** A aula de aluno está liberada para quem pede? Prévia grátis, ou a trava diz sim. */
async function liberadaParaQuemPede(req: Parameters<typeof loadSession>[0], isFreePreview: boolean): Promise<boolean> {
  if (isFreePreview) return true;
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
  const liberada = await liberadaParaQuemPede(req, aula.isFreePreview);
  const curso = await arvoreDoCurso(aula.module.courseId, true);
  // A página muda com a assinatura de quem pede: nunca guardada em cache.
  res.set("Cache-Control", "private, no-store");
  res.json({ curso, aula: await aulaParaAPagina(aula, liberada) });
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
  res.set("Cache-Control", "private, no-store");
  res.json({ curso, aula: await aulaParaAPagina(aula, true) });
});

/** Entrega o arquivo do Storage, em fluxo, com o NOME ORIGINAL limpo. */
async function entregarArquivo(res: Response, arquivo: { storagePath: string; originalName: string }) {
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
  leitura.corpo.pipe(res);
}

// GET /api/lessons/:id/files/:fileId — o download do ALUNO, com a mesma regra da página.
router.get("/lessons/:id/files/:fileId", async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const fileId = parseId(req.params.fileId, res);
  if (fileId === null) return;
  const aula = await prisma.lesson.findFirst({ where: { id, ...cadeiaPublicada }, select: { isFreePreview: true } });
  // O arquivo tem que ser DESTA aula: o id de outra aula não passa por aqui.
  const arquivo = aula ? await prisma.lessonFile.findFirst({ where: { id: fileId, lessonId: id } }) : null;
  if (!aula || !arquivo) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!(await liberadaParaQuemPede(req, aula.isFreePreview))) {
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
