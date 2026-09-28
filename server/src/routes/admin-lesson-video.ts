import { Router } from "express";
import { LessonKind, bunnyVideoIdSchema, videoUploadCompleteSchema, videoUploadStartSchema } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { validate, parseId } from "../lib/http.js";
import { apagarVideo, enderecoAssinado, estadoDoVideo, iniciarEnvio } from "../lib/bunny-stream.js";

const router = Router();

// O VÍDEO DE CADA AULA (Bloco U, etapa 3 = Bloco E etapa 2, parte 2d — plano
// aprovado pelo operador em 28/09/2026). A mesma forma do vídeo de apresentação
// (`admin-media.ts`), com duas diferenças:
//   - a biblioteca é a de AULAS, com token: o player só abre com o endereço
//     assinado, e aqui ele sai só para o ADMIN (a prévia do editor). O aluno
//     recebe o dele na etapa 4, depois da trava de acesso;
//   - só aula de VÍDEO recebe vídeo (a de texto tem o seu texto).
// Decisões do operador que valem aqui (bunny.md §3.4 e §7.1): nome do vídeo no
// Bunny = nome do arquivo; um vídeo por vez e sem reuso entre aulas; reenviar
// apaga o envio incompleto e terminar apaga o substituído, NUNCA o vídeo em uso.

async function aulaDeVideo(id: number) {
  return prisma.lesson.findUnique({
    where: { id },
    select: { kind: true, bunnyVideoId: true, bunnyVideoPendingId: true },
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

  // Sem o endereço do player: sem token, ele não abre numa biblioteca com token.
  // A prévia vem do `complete` ou do `/player`, sempre assinada.
  const { embedUrl: _semToken, ...credenciais } = inicio.credenciais;
  res.json(credenciais);
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

  await prisma.lesson.update({ where: { id }, data: { bunnyVideoId: videoId, bunnyVideoPendingId: null } });

  const substituido = aula.bunnyVideoId;
  if (substituido && substituido !== videoId) await apagarVideo("aulas", substituido);

  res.json({ bunnyVideoId: videoId, playerUrl: enderecoAssinado(videoId) });
});

// GET /api/admin/lessons/:id/player — a prévia do admin, com o endereço
// assinado (6 h). `null` quando a aula não tem vídeo, ou sem a biblioteca neste
// ambiente.
router.get("/admin/lessons/:id/player", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const aula = await aulaDeVideo(id);
  if (!aula) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  res.json({ playerUrl: enderecoAssinado(aula.bunnyVideoId) });
});

// GET /api/admin/lesson-video/:videoId/status — o Bunny já terminou de
// processar? A prévia pergunta até ficar pronta (como a da apresentação).
router.get("/admin/lesson-video/:videoId/status", requireAdmin, async (req, res) => {
  const videoId = validate(bunnyVideoIdSchema, req.params.videoId, res);
  if (videoId === null) return;
  const estado = await estadoDoVideo("aulas", videoId);
  if (!estado) {
    res.status(502).json({ error: "StreamFalhou" });
    return;
  }
  res.json(estado);
});

export default router;
