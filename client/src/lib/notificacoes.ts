import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LanguageCode } from "@jilson/core";
import * as api from "@/lib/api";
import { deveTentarDeNovo } from "@/lib/tentar-de-novo";
import type { AppTexts } from "@/lib/language";

// O SINO DE NOTIFICAÇÕES na tela (Bloco E, etapa 4 — decisões do operador,
// 04/10/2026): só o número no sino, nada interrompe a aula; a lista abre no sino,
// e "Ver todas" leva à página. Uma consulta só, que o sino e a página dividem.

export const NOTIFICACOES = "notificacoes";

/** As notificações de quem está logado. Atualiza ao voltar para a aba. */
export function useNotificacoes() {
  return useQuery({ queryKey: [NOTIFICACOES], queryFn: api.getNotificacoes, refetchOnWindowFocus: true });
}

/** Marcar uma, ou todas (`id` ausente), como lidas. Ao terminar, o número muda. */
export function useMarcarLida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id?: number) => (id === undefined ? api.marcarTodasLidas() : api.marcarNotificacaoLida(id)),
    // Marcar de novo não muda nada no servidor (06/10/2026).
    retry: deveTentarDeNovo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [NOTIFICACOES] }),
  });
}

/** O título da notificação: o do aviso, ou, nas mensagens do curso, "Boas-vindas ao curso X" no idioma do app. */
export function tituloDaNotificacao(n: api.Notificacao, t: AppTexts): string {
  // O aviso de Comunicação tem o título que o operador escreveu (06/10/2026).
  if (n.titulo) return n.titulo;
  const modelo = n.tipo === "PARABENS" ? t.notificacoes.parabens : t.notificacoes.boasVindas;
  return modelo.replace("{curso}", n.curso?.titulo ?? "").trim();
}

/** O número sobre o sino: "9+" acima de nove; nada sem não lidas. */
export function numeroDoSino(naoLidas: number): string | null {
  if (naoLidas <= 0) return null;
  return naoLidas > 9 ? "9+" : String(naoLidas);
}

/**
 * O começo do texto na lista do sino, sem as marcas do Markdown (o texto
 * inteiro, formatado, fica na página "Ver todas"). Só tira as marcas que o
 * editor da mensagem põe: negrito, itálico e listas.
 */
export function previaDoTexto(texto: string): string {
  return texto
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|\*|_)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** "há 3 dias", "agora", "3 days ago" — no idioma do app, pelo próprio navegador. */
export function haQuantoTempo(iso: string, idioma: LanguageCode, agora: Date = new Date()): string {
  const segundos = Math.round((new Date(iso).getTime() - agora.getTime()) / 1000);
  const local = idioma === "en" ? "en" : "pt-BR";
  // "always", senão o navegador escreve "anteontem" no lugar de "há 2 dias".
  const formato = new Intl.RelativeTimeFormat(local, { numeric: "always" });
  const passos: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unidade, tamanho] of passos) {
    if (Math.abs(segundos) >= tamanho) return formato.format(Math.round(segundos / tamanho), unidade);
  }
  // Menos de um minuto: "agora" ("now").
  return new Intl.RelativeTimeFormat(local, { numeric: "auto" }).format(0, "second");
}
