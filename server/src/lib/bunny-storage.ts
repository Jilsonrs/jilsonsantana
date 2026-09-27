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
