import { createHash } from "node:crypto";

// O Bunny Stream: onde moram os vídeos. Este módulo é a ÚNICA porta do servidor
// para a API do Stream — as rotas não chamam o Bunny direto (mesma disciplina do
// `bunny-storage.ts`). A chave de cada biblioteca vive SÓ aqui, no servidor.
//
// Guia do fornecedor, bibliotecas e segurança: docs/bunny.md §3. Formato
// conferido na doc oficial via context7 em 27/09/2026: o vídeo nasce com
// `POST /library/:id/videos` (o id volta em `guid`), e o envio retomável (TUS)
// vai direto do navegador para o Bunny com uma assinatura SHA-256.

/**
 * As bibliotecas que o site usa (bunny.md §3.1): a de APRESENTAÇÃO (sem token:
 * toca para qualquer visitante) e a de AULAS (com token: o player só abre com o
 * endereço assinado pelo nosso servidor — Bloco U, etapa 3).
 */
export type Biblioteca = "apresentacao" | "aulas";

function config(biblioteca: Biblioteca) {
  const vars = {
    apresentacao: { id: process.env.BUNNY_STREAM_INTRO_LIBRARY_ID, chave: process.env.BUNNY_STREAM_INTRO_API_KEY },
    aulas: { id: process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID, chave: process.env.BUNNY_STREAM_LESSONS_API_KEY },
  }[biblioteca];
  return vars.id && vars.chave ? { id: vars.id, chave: vars.chave } : null;
}

/**
 * A assinatura do envio retomável: SHA-256 (em hex) de biblioteca + chave +
 * validade + id do vídeo, nessa ordem, sem separador. Função pura — é ela que
 * deixa o navegador enviar direto para o Bunny SEM conhecer a chave.
 */
export function assinaturaDeEnvio(libraryId: string, chave: string, expira: number, videoId: string): string {
  return createHash("sha256").update(`${libraryId}${chave}${expira}${videoId}`).digest("hex");
}

/**
 * O endereço do player do Bunny para um vídeo. Derivado, nunca coluna. `null`
 * quando a biblioteca não está configurada neste ambiente (o computador do
 * operador não tem as chaves de propósito — bunny.md §5).
 *
 * `iframe.mediadelivery.net` é o endereço dos exemplos oficiais. A doc também
 * cita `player.mediadelivery.net` para o player novo: se um dia só esse tocar,
 * a troca é nesta linha (bunny.md §7).
 */
export function enderecoDoPlayer(biblioteca: Biblioteca, videoId: string | null): string | null {
  const c = config(biblioteca);
  if (!videoId || !c) return null;
  return montarEndereco(c.id, videoId);
}

const montarEndereco = (libraryId: string, videoId: string) =>
  `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;

/**
 * O token do player com token (Embed view token authentication). Função pura.
 * Formato CONFIRMADO na doc oficial via context7 em 28/09/2026:
 * `SHA256_HEX(token_security_key + video_id + expires)`, com `expires` em
 * SEGUNDOS, e a chave é a TOKEN KEY da biblioteca (Security), não a API key.
 */
export function tokenDoPlayer(chaveDoToken: string, videoId: string, expira: number): string {
  return createHash("sha256").update(`${chaveDoToken}${videoId}${expira}`).digest("hex");
}

// 6 h: dentro da janela de 6–12 h decidida em Ago 2026 (sem trava por IP, para o
// vídeo não parar quando o aluno troca o Wi-Fi pelo 4G). Não encurtar.
export const VALIDADE_DO_PLAYER = 6 * 60 * 60;

/**
 * O endereço ASSINADO do player de uma aula (`?token=…&expires=…`). `null` sem a
 * biblioteca de aulas ou sem a token key neste ambiente (o computador do
 * operador — bunny.md §5). Quem chama decide a quem entregar: hoje só o admin
 * (a prévia do editor); o aluno, na etapa 4, depois da trava de acesso.
 */
export function enderecoAssinado(videoId: string | null, agora = Date.now()): string | null {
  const c = config("aulas");
  const chaveDoToken = process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY;
  if (!videoId || !c || !chaveDoToken) return null;
  const expira = Math.floor(agora / 1000) + VALIDADE_DO_PLAYER;
  return `${montarEndereco(c.id, videoId)}?token=${tokenDoPlayer(chaveDoToken, videoId, expira)}&expires=${expira}`;
}

export type CredenciaisDeEnvio = {
  videoId: string;
  /** O nome do vídeo no Bunny (o nome do arquivo enviado). Vai também no envio, para os dois baterem. */
  titulo: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
  embedUrl: string;
};

export type ResultadoDoInicio =
  | { ok: true; credenciais: CredenciaisDeEnvio }
  | { ok: false; motivo: "NaoConfigurado" | "Falhou" };

// 24 h para terminar o envio, como no exemplo oficial: um vídeo grande numa
// conexão lenta pode levar horas, e o envio retoma de onde parou.
const VALIDADE_DO_ENVIO = 24 * 60 * 60;

/** Cria o vídeo no Bunny e devolve o que o navegador precisa para enviar o arquivo. */
export async function iniciarEnvio(biblioteca: Biblioteca, titulo: string): Promise<ResultadoDoInicio> {
  const c = config(biblioteca);
  if (!c) return { ok: false, motivo: "NaoConfigurado" };

  const resposta = await fetch(`https://video.bunnycdn.com/library/${c.id}/videos`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", AccessKey: c.chave },
    body: JSON.stringify({ title: titulo }),
  });
  if (!resposta.ok) {
    console.error(`[bunny-stream] criar vídeo recusado: ${resposta.status}`);
    return { ok: false, motivo: "Falhou" };
  }
  const { guid } = (await resposta.json()) as { guid?: unknown };
  if (typeof guid !== "string") {
    console.error("[bunny-stream] resposta sem guid");
    return { ok: false, motivo: "Falhou" };
  }

  const expirationTime = Math.floor(Date.now() / 1000) + VALIDADE_DO_ENVIO;
  return {
    ok: true,
    credenciais: {
      videoId: guid,
      titulo,
      libraryId: c.id,
      expirationTime,
      signature: assinaturaDeEnvio(c.id, c.chave, expirationTime, guid),
      embedUrl: montarEndereco(c.id, guid),
    },
  };
}

/**
 * Apaga um vídeo no Bunny. Só é chamada pela limpeza do envio (decisão do
 * operador, 27/09/2026): o envio que ficou pela metade quando se reenvia, e o
 * vídeo substituído depois que o novo termina. Nunca para o vídeo em uso.
 *
 * Devolve `false` sem derrubar nada: a limpeza é arrumação, e um vídeo que
 * sobrar no Bunny se apaga no painel. 404 conta como apagado (já não existe).
 */
export async function apagarVideo(biblioteca: Biblioteca, videoId: string): Promise<boolean> {
  const c = config(biblioteca);
  if (!c) return false;
  const resposta = await fetch(`https://video.bunnycdn.com/library/${c.id}/videos/${videoId}`, {
    method: "DELETE",
    headers: { Accept: "application/json", AccessKey: c.chave },
  });
  if (resposta.ok || resposta.status === 404) return true;
  console.error(`[bunny-stream] apagar vídeo recusado: ${resposta.status}`);
  return false;
}

export type EstadoDoVideo = { pronto: boolean; falhou: boolean };

/**
 * Lê o estado do vídeo que o Bunny devolve. Função pura, com teste de unidade.
 *
 * A doc consultada em 27/09/2026 lista os números do WEBHOOK (3 = terminado,
 * 4 = a primeira resolução ficou pronta e o vídeo já toca, 5 = falhou) e não
 * confirma se a leitura do vídeo usa os mesmos. Por isso "pronto" aceita dois
 * sinais, e qualquer um basta: status 4 (tocável nas duas leituras possíveis) ou
 * `encodeProgress` 100. Falha: 5, ou os números de envio que falhou.
 */
export function interpretarEstado(video: { status?: unknown; encodeProgress?: unknown }): EstadoDoVideo {
  const status = typeof video.status === "number" ? video.status : -1;
  const progresso = typeof video.encodeProgress === "number" ? video.encodeProgress : -1;
  return { pronto: status === 4 || progresso >= 100, falhou: status === 5 || status === 8 };
}

/** O estado de um vídeo no Bunny, para a prévia do admin atualizar sozinha. */
export async function estadoDoVideo(biblioteca: Biblioteca, videoId: string): Promise<EstadoDoVideo | null> {
  const c = config(biblioteca);
  if (!c) return null;
  const resposta = await fetch(`https://video.bunnycdn.com/library/${c.id}/videos/${videoId}`, {
    headers: { Accept: "application/json", AccessKey: c.chave },
  });
  if (!resposta.ok) {
    console.error(`[bunny-stream] ler vídeo recusado: ${resposta.status}`);
    return null;
  }
  return interpretarEstado((await resposta.json()) as { status?: unknown; encodeProgress?: unknown });
}
