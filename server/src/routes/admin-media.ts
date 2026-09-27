import { randomBytes } from "node:crypto";
import express, { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { tipoDaImagem } from "../lib/image-type.js";
import { enviarParaOStorage } from "../lib/bunny-storage.js";
import { iniciarEnvio } from "../lib/bunny-stream.js";

const router = Router();

// O arquivo chega CRU no corpo (sem multipart, sem peça nova): o `express.raw`
// vale só nesta rota. 5 MB cobre qualquer capa 16:9 em WebP/JPG.
const LIMITE = "5mb";
const corpoDeImagem = express.raw({ type: ["image/webp", "image/jpeg", "image/png"], limit: LIMITE });

// POST /api/admin/courses/:id/thumbnail — a capa do curso, enviada pelo admin
// (C4 → etapa 1 do bloco de envio, plano aprovado pelo operador em 27/09/2026).
// Pastas decididas pelo operador (P21): `cursos/<slug>-<código>.<ext>`. O código
// muda a cada envio porque a CDN guarda a imagem por 1 mês: com o mesmo nome, a
// capa antiga continuaria aparecendo (bunny.md §4.4).
router.post("/admin/courses/:id/thumbnail", requireAdmin, corpoDeImagem, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const course = await prisma.course.findUnique({ where: { id }, select: { slug: true } });
  if (!course) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const conteudo: unknown = req.body;
  const tipo = Buffer.isBuffer(conteudo) ? tipoDaImagem(conteudo) : null;
  if (!Buffer.isBuffer(conteudo) || !tipo) {
    res.status(400).json({ error: "UnsupportedImage" });
    return;
  }

  const caminho = `cursos/${course.slug}-${randomBytes(6).toString("hex")}.${tipo.extensao}`;
  const envio = await enviarParaOStorage(caminho, conteudo);
  if (!envio.ok) {
    res.status(envio.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Storage${envio.motivo}` });
    return;
  }

  // O arquivo anterior fica no Storage: custa centavos, e apagar é código a mais
  // (fora do escopo por decisão do plano de 27/09).
  await prisma.course.update({ where: { id }, data: { thumbnailUrl: envio.endereco } });
  res.json({ thumbnailUrl: envio.endereco });
});

// POST /api/admin/courses/:id/intro-video — começa o envio do vídeo de
// APRESENTAÇÃO do curso (Bloco U, etapa 2). O servidor cria o vídeo no Bunny e
// devolve só a assinatura: o arquivo vai do navegador direto para o Bunny, em
// partes, e retoma se a internet cair (regra do operador, 25/09). A chave da
// biblioteca nunca sai daqui.
//
// O `introVideoId` NÃO é gravado aqui: só depois que o envio termina, pelo
// PATCH do curso. Gravar antes deixaria o curso apontando para um vídeo vazio se
// o envio fosse abandonado no meio.
router.post("/admin/courses/:id/intro-video", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;

  const course = await prisma.course.findUnique({ where: { id }, select: { slug: true } });
  if (!course) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  // O título no painel do Bunny é o slug: é por ele que o operador acha o vídeo lá.
  const inicio = await iniciarEnvio("apresentacao", `${course.slug} — apresentação`);
  if (!inicio.ok) {
    res.status(inicio.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Stream${inicio.motivo}` });
    return;
  }
  res.json(inicio.credenciais);
});

export default router;
