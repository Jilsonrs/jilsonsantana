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
 * UMA BIBLIOTECA SÓ: a `jilsonsantana-stream`, COM TOKEN (decisão do operador,
 * 28/09/2026 — revê a de 25/09, que separava a apresentação numa biblioteca sem
 * token). Aulas e vídeos de apresentação moram nela, e o player só abre com o
 * endereço ASSINADO pelo nosso servidor (`enderecoAssinado`). A apresentação
 * continua tocando para qualquer visitante: o servidor assina sem conferir
 * assinatura do aluno, porque ela é vídeo de venda (CLAUDE.md → Access
 * Architecture). O nome fica como parâmetro para a leitura das rotas dizer de
 * qual biblioteca fala, se um dia houver outra.
 */
export type Biblioteca = "aulas";

function config(_biblioteca: Biblioteca) {
  const id = process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID;
  const chave = process.env.BUNNY_STREAM_LESSONS_API_KEY;
  return id && chave ? { id, chave } : null;
}

/**
 * A assinatura do envio retomável: SHA-256 (em hex) de biblioteca + chave +
 * validade + id do vídeo, nessa ordem, sem separador. Função pura — é ela que
 * deixa o navegador enviar direto para o Bunny SEM conhecer a chave.
 */
export function assinaturaDeEnvio(libraryId: string, chave: string, expira: number, videoId: string): string {
  return createHash("sha256").update(`${libraryId}${chave}${expira}${videoId}`).digest("hex");
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

// QUANTO TEMPO a assinatura do player vale depois de emitida: 24 h, para TODO
// vídeo — apresentação, prévia grátis e aula paga (decisões do operador,
// 28/09/2026, depois de comparar Bunny, Mux, Cloudflare e plataformas de curso;
// substitui a janela de 6–12 h de Ago 2026). QUEM recebe a assinatura é decidido
// pelo servidor (a aula paga, só para quem tem assinatura ativa — etapa 4); o
// player só abre no domínio da escola. Sem trava por IP: o vídeo não pode parar
// quando o aluno troca o Wi-Fi pelo 4G.
export const VALIDADE_DO_PLAYER = 24 * 60 * 60;

/**
 * O endereço ASSINADO do player (`?token=…&expires=…`), de aula ou de apresentação.
 * `null` sem vídeo, ou sem a biblioteca ou a token key neste ambiente (o
 * computador do operador — bunny.md §5). Quem chama decide a quem entregar: a
 * apresentação, a qualquer visitante; a aula, ao admin (prévia) e, na etapa 4,
 * ao aluno com acesso.
 *
 * `tocarAoAbrir` é OBRIGATÓRIO, e vai no endereço (`autoplay`, parâmetro de embed
 * do Bunny que se sobrepõe ao painel da biblioteca): a AULA começa a tocar sozinha,
 * como no LinkedIn; a APRESENTAÇÃO abre pausada (decisão do operador, 03/10/2026).
 * Não entra no token, que assina só o vídeo e a validade.
 */
export function enderecoAssinado(
  videoId: string | null,
  { tocarAoAbrir }: { tocarAoAbrir: boolean },
  agora = Date.now(),
): string | null {
  const c = config("aulas");
  const chaveDoToken = process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY;
  if (!videoId || !c || !chaveDoToken) return null;
  const expira = Math.floor(agora / 1000) + VALIDADE_DO_PLAYER;
  return `${montarEndereco(c.id, videoId)}?token=${tokenDoPlayer(chaveDoToken, videoId, expira)}&expires=${expira}&autoplay=${tocarAoAbrir}`;
}

export type CredenciaisDeEnvio = {
  videoId: string;
  /** O nome do vídeo no Bunny (o nome do arquivo enviado). Vai também no envio, para os dois baterem. */
  titulo: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
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

/** Lê um vídeo no Bunny. O objeto só é usado depois de conferido campo a campo. */
async function lerVideo(videoId: string): Promise<Record<string, unknown> | "NaoConfigurado" | "Falhou"> {
  const c = config("aulas");
  if (!c) return "NaoConfigurado";
  const resposta = await fetch(`https://video.bunnycdn.com/library/${c.id}/videos/${videoId}`, {
    headers: { Accept: "application/json", AccessKey: c.chave },
  });
  if (!resposta.ok) {
    console.error(`[bunny-stream] ler vídeo recusado: ${resposta.status}`);
    return "Falhou";
  }
  const json: unknown = await resposta.json();
  return typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
}

/**
 * A duração que o Bunny informa: o campo `length`, em SEGUNDOS, inteiro
 * (confirmado na doc em 29/09/2026, pela fonte alternativa do CLAUDE.md). Só vale
 * número positivo — antes de processar, ou num vídeo com falha, não há duração.
 */
export function duracaoDoVideo(video: Record<string, unknown>): number | null {
  return typeof video.length === "number" && Number.isFinite(video.length) && video.length > 0
    ? Math.round(video.length)
    : null;
}

/**
 * O estado de um vídeo no Bunny, e a duração dele (a do curso é a soma das
 * aulas — 29/09/2026). Serve à prévia do admin e ao "vídeo pronto" da aula.
 */
export async function estadoDoVideo(
  _biblioteca: Biblioteca,
  videoId: string,
): Promise<(EstadoDoVideo & { duracaoEmSegundos: number | null }) | null> {
  const video = await lerVideo(videoId);
  return typeof video === "string" ? null : { ...interpretarEstado(video), duracaoEmSegundos: duracaoDoVideo(video) };
}

/**
 * O RESUMO do vídeo de uma aula, para o editor mostrar como a Udemy: a miniatura,
 * o nome do arquivo e a duração, sem player (decisão do operador, 28/09/2026 —
 * assistir é na página da aula do aluno).
 */
export type ResumoDoVideo = EstadoDoVideo & {
  nome: string | null;
  duracaoEmSegundos: number | null;
  miniaturaUrl: string | null;
};

// O CDN Hostname da biblioteca (`vz-….b-cdn.net`): só letras, números, hífen e
// ponto — um valor torto na variável nunca vira pedaço de endereço.
const HOST_DA_CDN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
// O nome do arquivo da miniatura: sem barra e sem "..", só um nome de imagem.
const ARQUIVO_DA_MINIATURA = /^[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/i;

/**
 * Monta o resumo a partir do que o Bunny devolveu. Função pura, com teste de
 * unidade. A miniatura padrão mora em `https://{CDN host}/{id do vídeo}/thumbnail.jpg`
 * (doc do Bunny, consultada em 28/09/2026), e só aparece com o vídeo PRONTO: antes
 * disso ela não existe. A duração sai de `duracaoDoVideo`.
 */
export function interpretarResumo(videoId: string, video: Record<string, unknown>, cdnHost: string | undefined): ResumoDoVideo {
  const estado = interpretarEstado(video);
  const nome = typeof video.title === "string" && video.title.trim() !== "" ? video.title : null;
  const duracaoEmSegundos = duracaoDoVideo(video);
  const arquivo =
    typeof video.thumbnailFileName === "string" && ARQUIVO_DA_MINIATURA.test(video.thumbnailFileName)
      ? video.thumbnailFileName
      : "thumbnail.jpg";
  const host = cdnHost?.trim() ?? "";
  const miniaturaUrl = estado.pronto && HOST_DA_CDN.test(host) ? `https://${host}/${videoId}/${arquivo}` : null;
  return { ...estado, nome, duracaoEmSegundos, miniaturaUrl };
}

export type ResultadoDoResumo = { ok: true; resumo: ResumoDoVideo } | { ok: false; motivo: "NaoConfigurado" | "Falhou" };

/**
 * O resumo do vídeo de uma aula, lido no Bunny na hora. Só o "pronto" e a duração
 * ficam lembrados na aula (é o que evita perguntar ao Bunny por todas, toda vez).
 */
export async function resumoDoVideo(videoId: string): Promise<ResultadoDoResumo> {
  const video = await lerVideo(videoId);
  if (typeof video === "string") return { ok: false, motivo: video };
  return { ok: true, resumo: interpretarResumo(videoId, video, process.env.BUNNY_STREAM_LESSONS_CDN_HOST) };
}
