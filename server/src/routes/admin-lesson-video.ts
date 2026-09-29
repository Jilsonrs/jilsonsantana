import { Router } from "express";
import { LessonKind, videoUploadCompleteSchema, videoUploadStartSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";
import { apagarVideo, iniciarEnvio, resumoDoVideo } from "../lib/bunny-stream.js";

const router = Router();

// O VÍDEO DE CADA AULA (Bloco U, etapa 3 = Bloco E etapa 2, parte 2d — plano
// aprovado pelo operador em 28/09/2026). A mesma forma do vídeo de apresentação
// (`admin-media.ts`), com duas diferenças:
//   - o editor NÃO tem player: mostra o resumo do vídeo (miniatura, nome do
//     arquivo, duração), como a Udemy (operador, 28/09/2026). O player
//     assinado sai para o aluno na etapa 4, depois da trava de acesso;
//   - só aula de VÍDEO recebe vídeo (a de texto tem o seu texto).
// Decisões do operador que valem aqui (bunny.md §3.4 e §7.1): nome do vídeo no
// Bunny = nome do arquivo; um vídeo por vez e sem reuso entre aulas; reenviar
// apaga o envio incompleto e terminar apaga o substituído, NUNCA o vídeo em uso.

async function aulaDeVideo(id: number) {
  return prisma.lesson.findUnique({
    where: { id },
    select: { kind: true, bunnyVideoId: true, bunnyVideoPendingId: true, bunnyVideoReady: true },
  });
}

// POST /api/admin/lessons/:id/video — começa o envio: cria o vídeo no Bunny e
// devolve só a assinatura (a chave nunca sai daqui). O vídeo novo fica EM
// ANDAMENTO: a aula continua com o vídeo antigo até o envio terminar.
router.post("/admin/lessons/:id/video", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(videoUploadStartSchema, req.body, res);
  if (body === null) return;

  const aula = await aulaDeVideo(id);
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (aula.kind !== LessonKind.VIDEO) {
    res.status(400).json({ error: "AulaDeTexto" });
    return;
  }

  const inicio = await iniciarEnvio("aulas", body.titulo);
  if (!inicio.ok) {
    res.status(inicio.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Stream${inicio.motivo}` });
    return;
  }

  await prisma.lesson.update({ where: { id }, data: { bunnyVideoPendingId: inicio.credenciais.videoId } });

  // LIMPEZA: o envio anterior que ficou pela metade é apagado no Bunny. Nunca o
  // vídeo em uso — um envio concluído já saiu do "em andamento".
  const anterior = aula.bunnyVideoPendingId;
  if (anterior && anterior !== aula.bunnyVideoId) await apagarVideo("aulas", anterior);

  // Só a assinatura do envio: o resumo do vídeo vem de `GET …/video`.
  res.json(inicio.credenciais);
});

// POST /api/admin/lessons/:id/video/complete — o envio terminou: o vídeo em
// andamento vira o vídeo da aula, e o vídeo substituído é apagado no Bunny.
router.post("/admin/lessons/:id/video/complete", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const body = validate(videoUploadCompleteSchema, req.body, res);
  if (body === null) return;
  const { videoId } = body;

  const aula = await aulaDeVideo(id);
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  // Só o envio em andamento DESTA aula vira o vídeo dela. É isto que impede
  // colocar aqui o vídeo de outra aula (sem reuso — decisão do operador).
  if (aula.bunnyVideoPendingId !== videoId) {
    res.status(409).json({ error: "NotPending" });
    return;
  }

  // O vídeo novo começa a processar: deixa de estar confirmado como pronto.
  await prisma.lesson.update({
    where: { id },
    data: { bunnyVideoId: videoId, bunnyVideoPendingId: null, bunnyVideoReady: false },
  });

  const substituido = aula.bunnyVideoId;
  if (substituido && substituido !== videoId) await apagarVideo("aulas", substituido);

  res.json({ bunnyVideoId: videoId });
});

// GET /api/admin/lessons/:id/video — o RESUMO do vídeo desta aula para o editor:
// a miniatura, o nome do arquivo, a duração e se o Bunny já terminou de processar.
// Sem player: assistir é na página da aula do aluno (decisão do operador,
// 28/09/2026). O id do vídeo sai da aula, nunca de quem pede.
router.get("/admin/lessons/:id/video", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await aulaDeVideo(id);
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (!aula.bunnyVideoId) {
    res.json({ video: null });
    return;
  }
  const resultado = await resumoDoVideo(aula.bunnyVideoId);
  if (!resultado.ok) {
    res.status(resultado.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Stream${resultado.motivo}` });
    return;
  }
  // Pronto no Bunny: fica lembrado, e a aula volta recolhida na próxima visita.
  if (resultado.resumo.pronto && !aula.bunnyVideoReady) {
    await prisma.lesson.updateMany({ where: { id, bunnyVideoId: aula.bunnyVideoId }, data: { bunnyVideoReady: true } });
  }
  res.json({ video: resultado.resumo });
});

export default router;
