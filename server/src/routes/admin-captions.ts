import express, { Router, type Response } from "express";
import { ContentStatus, LessonKind } from "@jilson/core";
import type { Language } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { doBanco } from "../lib/language.js";
import { apagarLegenda, enviarLegenda, limparCacheDaLegenda } from "../lib/bunny-stream.js";
import { nomeParaDownload } from "../lib/nome-do-download.js";
import { ROTULO_DA_LEGENDA, contagemDeLegendas } from "../lib/legendas.js";

const router = Router();

// AS LEGENDAS — o passo Legendas do editor do curso (decisões do operador:
// 28/09 e 04/10/2026). Uma legenda por aula de vídeo e uma pela apresentação, só
// no idioma do curso, só `.vtt`. Para corrigir, envia-se de novo (substitui).
//
// O BUNNY PRIMEIRO, como na troca de vídeo: se ele recusar, nada é gravado aqui
// (502). O banco guarda uma CÓPIA de cada legenda (bunny.md §7.1): é ela que a
// tela lista, que o "Baixar" entrega, e que a troca de vídeo reenvia.


/** Até 2 MB: uma legenda de aula longa tem dezenas de KB. Maior que isso, 413. */
const corpoDaLegenda = express.text({ type: () => true, limit: "2mb" });

/** O nome enviado no cabeçalho `X-Nome-Do-Arquivo` (codificado para URL), limpo. */
function nomeDoArquivo(cabecalho: string | undefined): string | null {
  if (!cabecalho) return null;
  let nome: string;
  try {
    nome = decodeURIComponent(cabecalho);
  } catch {
    return null;
  }
  nome = (nome.split(/[/\\]/).pop() ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return nome.length > 0 && nome.length <= 200 ? nome : null;
}

/** O conteúdo de uma legenda `.vtt` válida (sem o BOM do começo), ou o motivo da recusa. */
export function lerLegenda(nome: string | null, corpo: unknown): { ok: true; conteudo: string } | { ok: false; motivo: string } {
  if (!nome || !nome.toLowerCase().endsWith(".vtt")) return { ok: false, motivo: "SoVtt" };
  if (typeof corpo !== "string") return { ok: false, motivo: "ArquivoVazio" };
  const conteudo = corpo.replace(/^﻿/, "");
  if (!/^WEBVTT(\s|$)/.test(conteudo)) return { ok: false, motivo: "NaoEVtt" };
  // Byte nulo: o banco recusaria a cópia DEPOIS de o Bunny já ter trocado a
  // legenda (achado P2 da revisão de segurança, 04/10/2026). Recusa antes.
  if (conteudo.includes("\u0000")) return { ok: false, motivo: "NaoEVtt" };
  return { ok: true, conteudo };
}

type Dono = { videoId: string | null; idioma: Language; onde: { lessonId: number } | { courseId: number } };

const camposDaLegenda = { uploadedAt: true, originalName: true, needsResend: true } as const;
const legendaParaATela = (l: { uploadedAt: Date; originalName: string; needsResend: boolean } | null) =>
  l ? { enviadaEm: l.uploadedAt, nomeDoArquivo: l.originalName, precisaReenviar: l.needsResend } : null;

/** Envia (ou substitui) a legenda do dono: o Bunny primeiro, a cópia depois. */
async function enviar(dono: Dono, nome: string | null, corpo: unknown, res: Response) {
  if (!dono.videoId) {
    res.status(409).json({ error: "SemVideo" });
    return;
  }
  const lida = lerLegenda(nome, corpo);
  if (!lida.ok) {
    res.status(400).json({ error: lida.motivo });
    return;
  }
  if (!(await enviarLegenda(dono.videoId, doBanco(dono.idioma), ROTULO_DA_LEGENDA[dono.idioma], lida.conteudo))) {
    res.status(502).json({ error: "BunnyRecusou" });
    return;
  }
  // Seguro: `lerLegenda` só aceita com nome.
  const dados = { language: dono.idioma, content: lida.conteudo, originalName: nome as string, needsResend: false, uploadedAt: new Date() };
  await prisma.caption.upsert({
    where: "lessonId" in dono.onde ? { lessonId: dono.onde.lessonId } : { courseId: dono.onde.courseId },
    create: { ...dados, ...dono.onde },
    update: dados,
  });
  // O CDN guardaria a legenda anterior (teste no ar, 04/10/2026): limpa, e diz à
  // tela se conseguiu — a legenda já valeu de qualquer jeito.
  res.json({ cacheLimpo: await limparCacheDaLegenda(dono.videoId, doBanco(dono.idioma)) });
}

/** Baixa a cópia da legenda, com o nome original. */
async function baixar(onde: Dono["onde"], res: Response) {
  const legenda = await prisma.caption.findUnique({ where: onde, select: { content: true, originalName: true } });
  if (!legenda) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.attachment(nomeParaDownload(legenda.originalName));
  res.type("text/vtt; charset=utf-8");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "private, no-store");
  res.send(legenda.content);
}

/** Exclui a legenda: o Bunny primeiro (se há vídeo), a cópia depois. */
async function excluir(dono: Dono, res: Response) {
  const legenda = await prisma.caption.findUnique({ where: dono.onde, select: { id: true, language: true } });
  if (!legenda) {
    res.status(204).end();
    return;
  }
  if (dono.videoId && !(await apagarLegenda(dono.videoId, doBanco(legenda.language)))) {
    res.status(502).json({ error: "BunnyRecusou" });
    return;
  }
  await prisma.caption.delete({ where: { id: legenda.id } });
  // Sem vídeo, não há o que limpar no CDN.
  res.json({ cacheLimpo: dono.videoId ? await limparCacheDaLegenda(dono.videoId, doBanco(legenda.language)) : true });
}

/** A aula como dono de legenda: só aula de VÍDEO. `null` (e a resposta) se não serve. */
async function aulaDona(id: number, res: Response): Promise<Dono | null> {
  const aula = await prisma.lesson.findUnique({
    where: { id },
    select: { kind: true, bunnyVideoId: true, module: { select: { course: { select: { language: true } } } } },
  });
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return null;
  }
  if (aula.kind !== LessonKind.VIDEO) {
    res.status(409).json({ error: "AulaDeTexto" });
    return null;
  }
  return { videoId: aula.bunnyVideoId, idioma: aula.module.course.language, onde: { lessonId: id } };
}

/** A apresentação do curso como dono de legenda. */
async function apresentacaoDona(id: number, res: Response): Promise<Dono | null> {
  const curso = await prisma.course.findUnique({ where: { id }, select: { introVideoId: true, language: true } });
  if (!curso) {
    res.status(404).json({ error: "NotFound" });
    return null;
  }
  return { videoId: curso.introVideoId, idioma: curso.language, onde: { courseId: id } };
}

// GET /api/admin/courses/:id/legendas — a tela: a apresentação, cada módulo com
// as suas aulas de VÍDEO, e "x de y aulas publicadas com legenda".
router.get("/admin/courses/:id/legendas", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const curso = await prisma.course.findUnique({
    where: { id },
    select: {
      language: true,
      introVideoId: true,
      introCaption: { select: camposDaLegenda },
      modules: {
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          status: true,
          lessons: {
            where: { kind: LessonKind.VIDEO },
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
            select: { id: true, title: true, status: true, bunnyVideoId: true, caption: { select: camposDaLegenda } },
          },
        },
      },
    },
  });
  if (!curso) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // A conta da Udemy: aulas de vídeo PUBLICADAS (em módulo publicado) com legenda
  // em dia — a que precisa ser reenviada não conta.
  const publicadas = curso.modules
    .filter((m) => m.status === ContentStatus.PUBLISHED)
    .flatMap((m) => m.lessons)
    .filter((a) => a.status === ContentStatus.PUBLISHED);
  res.set("Cache-Control", "private, no-store");
  res.json({
    idioma: doBanco(curso.language),
    apresentacao: { temVideo: curso.introVideoId !== null, legenda: legendaParaATela(curso.introCaption) },
    modulos: curso.modules.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      aulas: m.lessons.map((a) => ({ id: a.id, title: a.title, status: a.status, temVideo: a.bunnyVideoId !== null, legenda: legendaParaATela(a.caption) })),
    })),
    contagem: contagemDeLegendas(publicadas),
  });
});

// A LEGENDA DA AULA: enviar ou substituir, baixar, excluir.
router.put("/admin/lessons/:id/legenda", requireAdmin, corpoDaLegenda, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const dono = await aulaDona(id, res);
  if (dono) await enviar(dono, nomeDoArquivo(req.get("x-nome-do-arquivo")), req.body, res);
});

router.get("/admin/lessons/:id/legenda", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  await baixar({ lessonId: id }, res);
});

router.delete("/admin/lessons/:id/legenda", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const dono = await aulaDona(id, res);
  if (dono) await excluir(dono, res);
});

// A LEGENDA DA APRESENTAÇÃO do curso: o mesmo, com o vídeo de apresentação.
router.put("/admin/courses/:id/legenda-apresentacao", requireAdmin, corpoDaLegenda, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const dono = await apresentacaoDona(id, res);
  if (dono) await enviar(dono, nomeDoArquivo(req.get("x-nome-do-arquivo")), req.body, res);
});

router.get("/admin/courses/:id/legenda-apresentacao", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  await baixar({ courseId: id }, res);
});

router.delete("/admin/courses/:id/legenda-apresentacao", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const dono = await apresentacaoDona(id, res);
  if (dono) await excluir(dono, res);
});

export default router;
