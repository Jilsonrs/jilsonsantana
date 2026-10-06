import { useSyncExternalStore } from "react";
import * as api from "@/lib/api";
import { enviarVideo } from "@/lib/video-upload";
import { codigoDoErro } from "@/lib/course-form";
import { semInterromper } from "@/lib/versao";

/**
 * OS ENVIOS DE VÍDEO EM ANDAMENTO, por aula, FORA dos componentes (pedido do
 * operador, 29/09/2026: trocar de passo ou recolher a aula no meio de um envio não
 * pode interromper nada nem esconder a porcentagem). O envio já continuava sozinho
 * quando a tela saía; o que se perdia era o estado, que morava no componente.
 * Aqui ele sobrevive enquanto a aba estiver aberta — fechar ou recarregar a aba
 * interrompe, como na Udemy.
 */
export type EstadoDoEnvio = { tipo: "enviando"; porcentagem: number } | { tipo: "falhou"; codigo: string | null };

const estados = new Map<number, EstadoDoEnvio>();
const ouvintes = new Set<() => void>();

function mudar(lessonId: number, estado: EstadoDoEnvio | null) {
  if (estado) estados.set(lessonId, estado);
  else estados.delete(lessonId);
  for (const avisar of ouvintes) avisar();
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
}

/** O envio desta aula agora: enviando (com a porcentagem), falhou, ou nenhum (`null`). */
export function useEnvioDeVideo(lessonId: number): EstadoDoEnvio | null {
  return useSyncExternalStore(assinar, () => estados.get(lessonId) ?? null);
}

/**
 * Envia o vídeo da aula: começa no servidor, manda o arquivo para o Bunny e
 * termina no servidor. Devolve `true` quando o vídeo entrou na aula. Com um envio
 * já em andamento NESTA aula, não começa outro (o segundo descartaria o primeiro).
 */
export async function enviarVideoDaAula(lessonId: number, arquivo: File): Promise<boolean> {
  if (estados.get(lessonId)?.tipo === "enviando") return false;
  mudar(lessonId, { tipo: "enviando", porcentagem: 0 });
  // Uma atualização do site no meio não corta o envio (`semInterromper`).
  return semInterromper(async () => {
    try {
      // O nome do arquivo vira o nome do vídeo no Bunny (operador, 27/09/2026).
      const dados = await api.startLessonVideoUpload(lessonId, arquivo.name);
      await enviarVideo(arquivo, dados, (porcentagem) => mudar(lessonId, { tipo: "enviando", porcentagem })).concluido;
      await api.completeLessonVideoUpload(lessonId, dados.videoId);
      mudar(lessonId, null);
      return true;
    } catch (erro) {
      mudar(lessonId, { tipo: "falhou", codigo: codigoDoErro(erro) ?? null });
      return false;
    }
  });
}

/** Só para os testes: cada teste começa sem envio nenhum. */
export function esquecerEnvios() {
  estados.clear();
  for (const avisar of ouvintes) avisar();
}
