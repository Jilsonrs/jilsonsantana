import { randomBytes } from "node:crypto";
import { Router } from "express";
import { EXTENSOES_DOS_ARQUIVOS_DA_AULA } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { apagarArquivoDaAula, caminhoDaParte, enviarArquivoDaAula } from "../lib/bunny-storage.js";

const router = Router();

// OS ARQUIVOS PARA BAIXAR de cada aula (Bloco E, etapa 2, parte 2e — plano
// aprovado pelo operador em 28/09/2026; adaptado em partes na etapa G2 do
// Bloco G): o ENVIO pelo admin. A entrega ao aluno (só assinante, sempre como
// download) mora em `routes/lesson-view.ts`.
//
// O arquivo chega CRU no corpo (sem multipart, sem peça nova), em pedaços de
// até 30 MB para caber no limite de 32 MB por pedido HTTP/1.1 do Cloud Run, e
// o nome original vem no cabeçalho `X-Nome-Do-Arquivo` (codificado para URL).
// SEM limite para o tamanho total do arquivo (operador, 29/09/2026): cada
// pedaço segue EM FLUXO para o Bunny Storage, sem ficar inteiro na memória, e
// o arquivo só fica visível quando todas as partes chegaram.

const ACEITAS: readonly string[] = EXTENSOES_DOS_ARQUIVOS_DA_AULA;

/** Até 30 MB por pedaço: cabe com folga nos 32 MB do pedido HTTP/1.1 no Cloud Run. */
export const TAMANHO_MAXIMO_DA_PARTE = 30 * 1024 * 1024;
const MAXIMO_DE_PARTES = 10_000;

/**
 * O nome que o aluno vai ver no download: só o nome (sem pasta), sem caracteres
 * de controle, até 200 caracteres. `null` se não sobrar nome.
 */
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

const extensaoDe = (nome: string) => (nome.includes(".") ? (nome.split(".").pop() ?? "").toLowerCase() : "");

// O que a tela recebe: nunca o caminho no Storage.
const campos = { id: true, originalName: true, sizeBytes: true, createdAt: true } as const;

// O tamanho é BigInt no banco (sem limite — operador, 29/09/2026), e o JSON não
// sabe escrever BigInt: vai como número (exato até ~9 PB).
const paraTela = <T extends { sizeBytes: bigint }>(arquivo: T) => ({ ...arquivo, sizeBytes: Number(arquivo.sizeBytes) });

// GET /api/admin/lessons/:id/files — os arquivos completos da aula, na ordem de envio.
router.get("/admin/lessons/:id/files", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.lesson.findUnique({ where: { id }, select: { id: true } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const arquivos = await prisma.lessonFile.findMany({
    where: { lessonId: id, completo: true },
    orderBy: { id: "asc" },
    select: { ...campos, partes: true, partesEnviadas: true },
  });
  res.json(
    arquivos
      .filter((a) => a.partesEnviadas === a.partes)
      .map(({ id: fileId, originalName, sizeBytes, createdAt }) => paraTela({ id: fileId, originalName, sizeBytes, createdAt })),
  );
});

// POST /api/admin/lessons/:id/files — guarda a 1ª parte (ou o arquivo inteiro,
// quando cabe numa parte só) na zona própria do Bunny Storage (sem CDN).
router.post("/admin/lessons/:id/files", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.lesson.findUnique({ where: { id }, select: { id: true } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }

  const nome = nomeDoArquivo(req.get("x-nome-do-arquivo"));
  if (!nome) {
    res.status(400).json({ error: "NomeInvalido" });
    return;
  }
  const extensao = extensaoDe(nome);
  if (!ACEITAS.includes(extensao)) {
    res.status(400).json({ error: "TipoNaoAceito" });
    return;
  }
  // O corpo tem que chegar intacto, como arquivo: outro tipo de envio já teria
  // sido lido por outro leitor antes daqui.
  if (!req.is("application/octet-stream")) {
    res.status(400).json({ error: "EnvioInvalido" });
    return;
  }
  const cabecalhoPartes = req.get("x-total-de-partes");
  const totalDePartes = cabecalhoPartes === undefined ? 1 : Number(cabecalhoPartes);
  if (!Number.isSafeInteger(totalDePartes) || totalDePartes < 1 || totalDePartes > MAXIMO_DE_PARTES) {
    req.resume();
    res.status(400).json({ error: "PartesInvalidas" });
    return;
  }
  const tamanho = Number(req.get("content-length"));
  if (!Number.isSafeInteger(tamanho) || tamanho <= 0) {
    res.status(400).json({ error: "ArquivoVazio" });
    return;
  }
  if (tamanho > TAMANHO_MAXIMO_DA_PARTE) {
    req.resume();
    res.status(413).json({ error: "ParteMuitoGrande" });
    return;
  }

  // Nome ALEATÓRIO no Storage: o do operador fica só no banco (é o que o aluno vê).
  const caminho = `aulas/${id}/${randomBytes(12).toString("hex")}.${extensao}`;
  const envio = await enviarArquivoDaAula(caminho, req, tamanho);
  if (!envio.ok) {
    res.status(envio.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Storage${envio.motivo}` });
    return;
  }

  const arquivo = await prisma.lessonFile.create({
    data: {
      lessonId: id,
      originalName: nome,
      storagePath: caminho,
      sizeBytes: tamanho,
      partes: totalDePartes,
      partesEnviadas: 1,
      completo: totalDePartes === 1,
    },
    select: campos,
  });
  res.status(201).json(paraTela(arquivo));
});

// PUT /api/admin/lesson-files/:id/partes/:parte — guarda cada parte seguinte
// (`2..partes`), em sequência. Quando a última chega, o arquivo fica completo.
router.put("/admin/lesson-files/:id/partes/:parte", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const parte = parseId(req.params.parte, res);
  if (parte === null) return;

  const arquivo = await prisma.lessonFile.findUnique({ where: { id } });
  if (!arquivo) {
    req.resume();
    res.status(404).json({ error: "NotFound" });
    return;
  }
  if (parte < 2 || parte > arquivo.partes || parte > arquivo.partesEnviadas + 1) {
    req.resume();
    res.status(400).json({ error: "ParteInvalida" });
    return;
  }
  if (!req.is("application/octet-stream")) {
    res.status(400).json({ error: "EnvioInvalido" });
    return;
  }
  const tamanho = Number(req.get("content-length"));
  if (!Number.isSafeInteger(tamanho) || tamanho <= 0) {
    res.status(400).json({ error: "ArquivoVazio" });
    return;
  }
  if (tamanho > TAMANHO_MAXIMO_DA_PARTE) {
    req.resume();
    res.status(413).json({ error: "ParteMuitoGrande" });
    return;
  }

  const envio = await enviarArquivoDaAula(caminhoDaParte(arquivo.storagePath, parte - 1), req, tamanho);
  if (!envio.ok) {
    res.status(envio.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Storage${envio.motivo}` });
    return;
  }

  const novaParte = parte === arquivo.partesEnviadas + 1;
  const partesEnviadas = novaParte ? parte : arquivo.partesEnviadas;
  const atualizado = await prisma.lessonFile.update({
    where: { id },
    data: {
      sizeBytes: novaParte ? arquivo.sizeBytes + BigInt(tamanho) : arquivo.sizeBytes,
      partesEnviadas,
      completo: partesEnviadas === arquivo.partes,
    },
    select: campos,
  });
  res.json(paraTela(atualizado));
});

// DELETE /api/admin/lesson-files/:id — apaga todas as partes no Bunny e depois
// no banco. Se o Bunny recusar alguma, o registro FICA (502): assim nenhum
// arquivo pago some da vista do operador enquanto continua guardado.
router.delete("/admin/lesson-files/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const arquivo = await prisma.lessonFile.findUnique({ where: { id } });
  if (!arquivo) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  for (let indice = 0; indice < arquivo.partes; indice++) {
    const apagado = await apagarArquivoDaAula(caminhoDaParte(arquivo.storagePath, indice));
    if (!apagado.ok) {
      res.status(apagado.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Storage${apagado.motivo}` });
      return;
    }
  }
  await prisma.lessonFile.delete({ where: { id } });
  res.status(204).end();
});

export default router;
