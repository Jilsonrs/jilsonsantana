import { randomBytes } from "node:crypto";
import { Router } from "express";
import { EXTENSOES_DOS_ARQUIVOS_DA_AULA } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { parseId } from "../lib/http.js";
import { apagarArquivoDaAula, enviarArquivoDaAula } from "../lib/bunny-storage.js";

const router = Router();

// OS ARQUIVOS PARA BAIXAR de cada aula (Bloco E, etapa 2, parte 2e — plano
// aprovado pelo operador em 28/09/2026): o ENVIO pelo admin. A entrega ao aluno
// (só assinante, sempre como download) entra com a trava de acesso, na etapa 4
// do Bloco U: hoje NENHUMA rota entrega o arquivo.
//
// O arquivo chega CRU no corpo (sem multipart, sem peça nova), e o nome original
// vem no cabeçalho `X-Nome-Do-Arquivo` (codificado para URL). SEM limite de
// tamanho (operador, 29/09/2026): o corpo segue EM FLUXO para o Bunny, sem ficar
// inteiro na memória. O único teto é o do Railway (o envio termina em 5 minutos).

const ACEITAS: readonly string[] = EXTENSOES_DOS_ARQUIVOS_DA_AULA;

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

// GET /api/admin/lessons/:id/files — os arquivos da aula, na ordem de envio.
router.get("/admin/lessons/:id/files", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  if (!(await prisma.lesson.findUnique({ where: { id }, select: { id: true } }))) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const arquivos = await prisma.lessonFile.findMany({ where: { lessonId: id }, orderBy: { id: "asc" }, select: campos });
  res.json(arquivos.map(paraTela));
});

// POST /api/admin/lessons/:id/files — guarda um arquivo na zona própria (sem CDN).
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
  const tamanho = Number(req.get("content-length"));
  if (!Number.isSafeInteger(tamanho) || tamanho <= 0) {
    res.status(400).json({ error: "ArquivoVazio" });
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
    data: { lessonId: id, originalName: nome, storagePath: caminho, sizeBytes: tamanho },
    select: campos,
  });
  res.status(201).json(paraTela(arquivo));
});

// DELETE /api/admin/lesson-files/:id — apaga no Bunny e depois no banco. Se o
// Bunny recusar, o registro FICA (502): assim nenhum arquivo pago some da vista
// do operador enquanto continua guardado.
router.delete("/admin/lesson-files/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id, res);
  if (id === null) return;
  const arquivo = await prisma.lessonFile.findUnique({ where: { id } });
  if (!arquivo) {
    res.status(404).json({ error: "NotFound" });
    return;
  }
  const apagado = await apagarArquivoDaAula(arquivo.storagePath);
  if (!apagado.ok) {
    res.status(apagado.motivo === "NaoConfigurado" ? 503 : 502).json({ error: `Storage${apagado.motivo}` });
    return;
  }
  await prisma.lessonFile.delete({ where: { id } });
  res.status(204).end();
});

export default router;
