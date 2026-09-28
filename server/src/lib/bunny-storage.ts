// O Bunny Storage: onde mora o arquivo que o site RECEBE (capa de curso hoje;
// foto do aluno depois). Nunca o disco do container: a Railway zera o disco a
// cada publicação (CLAUDE.md → Video; decisão do operador, 25/09/2026).
//
// A senha da Storage Zone vive SÓ aqui, no servidor. O navegador manda o
// arquivo para a nossa rota, e a rota manda para o Bunny — o contrário
// entregaria a senha para quem abrisse o admin.
//
// Guia do fornecedor e o estado da conta: docs/bunny.md §4.

export type ResultadoDoEnvio =
  | { ok: true; endereco: string }
  | { ok: false; motivo: "NaoConfigurado" | "Falhou" };

function config() {
  const zona = process.env.BUNNY_STORAGE_ZONE;
  const host = process.env.BUNNY_STORAGE_HOST;
  const senha = process.env.BUNNY_STORAGE_PASSWORD;
  const base = process.env.BUNNY_IMG_BASE_URL;
  if (!zona || !host || !senha || !base) return null;
  return { zona, host, senha, base: base.replace(/\/+$/, "") };
}

/**
 * Envia o arquivo para `caminho` (ex.: `cursos/power-bi-3f9a1c2b7d4e.webp`) e
 * devolve o endereço público dele na CDN (`img.jilsonsantana.com`).
 *
 * O endereço gravado no banco é o COMPLETO: a imagem sai do domínio da escola,
 * então trocar de fornecedor não muda o endereço — basta reapontar o `img`
 * (bunny.md §4.3).
 */
export async function enviarParaOStorage(caminho: string, conteudo: Buffer): Promise<ResultadoDoEnvio> {
  const c = config();
  if (!c) return { ok: false, motivo: "NaoConfigurado" };

  const resposta = await fetch(`https://${c.host}/${c.zona}/${caminho}`, {
    method: "PUT",
    headers: { AccessKey: c.senha, "Content-Type": "application/octet-stream" },
    body: new Uint8Array(conteudo),
  });
  if (!resposta.ok) {
    // Só o status: a URL leva o nome da zona e a resposta pode ecoar cabeçalho.
    console.error(`[bunny-storage] envio recusado: ${resposta.status}`);
    return { ok: false, motivo: "Falhou" };
  }
  return { ok: true, endereco: `${c.base}/${caminho}` };
}

// ── A zona dos ARQUIVOS PARA BAIXAR (Bloco E, etapa 2, parte 2e) ──────────────
// Uma Storage Zone PRÓPRIA, sem Pull Zone (decisão do operador, 28/09/2026):
// nada lá tem endereço público. Quem entrega ao aluno é o nosso servidor, depois
// da trava de acesso (etapa 4 do Bloco U). Doc conferida via context7 em
// 28/09/2026: PUT/GET/DELETE em `https://{host}/{zona}/{caminho}` com `AccessKey`
// = a senha DA ZONA, e **apagar uma PASTA apaga tudo dentro dela, sem aviso**.

function configDosArquivos() {
  const zona = process.env.BUNNY_FILES_STORAGE_ZONE;
  const host = process.env.BUNNY_FILES_STORAGE_HOST;
  const senha = process.env.BUNNY_FILES_STORAGE_PASSWORD;
  if (!zona || !host || !senha) return null;
  return { zona, host, senha };
}

/**
 * O caminho de um arquivo de aula: `aulas/<id da aula>/<24 caracteres>.<ext>`.
 * Função pura. É a TRAVA contra o apagar recursivo do Bunny: um caminho vazio,
 * uma pasta (`aulas/12/`) ou um `..` nunca passa daqui.
 */
export function caminhoDeArquivoDaAula(caminho: string): boolean {
  return /^aulas\/\d+\/[0-9a-f]{24}\.[a-z0-9]{1,5}$/.test(caminho);
}

export type ResultadoDoArquivo = { ok: true } | { ok: false; motivo: "NaoConfigurado" | "Falhou" };

/** Guarda o arquivo na zona dos arquivos. Não há endereço público para devolver. */
export async function enviarArquivoDaAula(caminho: string, conteudo: Buffer): Promise<ResultadoDoArquivo> {
  const c = configDosArquivos();
  if (!c) return { ok: false, motivo: "NaoConfigurado" };
  if (!caminhoDeArquivoDaAula(caminho)) return { ok: false, motivo: "Falhou" };

  const resposta = await fetch(`https://${c.host}/${c.zona}/${caminho}`, {
    method: "PUT",
    headers: { AccessKey: c.senha, "Content-Type": "application/octet-stream" },
    body: new Uint8Array(conteudo),
  });
  if (!resposta.ok) {
    console.error(`[bunny-storage] envio de arquivo recusado: ${resposta.status}`);
    return { ok: false, motivo: "Falhou" };
  }
  return { ok: true };
}

/**
 * Apaga UM arquivo da zona dos arquivos. Recusa (sem chamar o Bunny) tudo o que
 * não for caminho de arquivo de aula: apagar pasta, no Bunny, apaga tudo dentro.
 * 404 conta como apagado (já não existe).
 */
export async function apagarArquivoDaAula(caminho: string): Promise<ResultadoDoArquivo> {
  if (!caminhoDeArquivoDaAula(caminho)) return { ok: false, motivo: "Falhou" };
  const c = configDosArquivos();
  if (!c) return { ok: false, motivo: "NaoConfigurado" };

  const resposta = await fetch(`https://${c.host}/${c.zona}/${caminho}`, {
    method: "DELETE",
    headers: { AccessKey: c.senha },
  });
  if (resposta.ok || resposta.status === 404) return { ok: true };
  console.error(`[bunny-storage] apagar arquivo recusado: ${resposta.status}`);
  return { ok: false, motivo: "Falhou" };
}
