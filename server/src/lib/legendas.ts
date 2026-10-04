import type { Language } from "@prisma/client";
import { prisma } from "./prisma.js";
import { enviarLegenda } from "./bunny-stream.js";
import { doBanco } from "./language.js";

// A LEGENDA SOBREVIVE À TROCA DE VÍDEO (decisões do operador, 04/10/2026). No
// Bunny, a legenda fica presa ao VÍDEO: trocar o vídeo da aula (ou da
// apresentação) a deixaria para trás. O site guarda a cópia e a manda para o vídeo
// novo; se o Bunny recusar, a linha fica marcada "envie de novo", em vez de a
// legenda sumir em silêncio.

/** O que o player mostra no seletor de legenda, no idioma do curso. */
export const ROTULO_DA_LEGENDA: Record<Language, string> = { PT: "Português", EN: "English" };

/**
 * Manda a legenda guardada para o vídeo novo. Nunca derruba quem chama: a troca
 * do vídeo já valeu, e uma falha aqui vira a marca `needsResend`.
 */
export async function reenviarLegenda(onde: { lessonId: number } | { courseId: number }, videoId: string): Promise<void> {
  const legenda = await prisma.caption.findUnique({ where: onde, select: { id: true, language: true, content: true } });
  if (!legenda) return;
  let aceitou = false;
  try {
    aceitou = await enviarLegenda(videoId, doBanco(legenda.language), ROTULO_DA_LEGENDA[legenda.language], legenda.content);
  } catch {
    console.error(`[legendas] reenvio da legenda ${legenda.id} caiu na rede`);
  }
  await prisma.caption.update({ where: { id: legenda.id }, data: { needsResend: !aceitou } });
}
