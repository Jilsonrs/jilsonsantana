import { isAxiosError } from "axios";

/**
 * Tentar de novo depois de uma falha? Só quando ela pode passar: queda de rede ou
 * erro do servidor (5xx), até 3 vezes. Um 4xx nunca vai dar certo repetindo — um
 * 404 tem que aparecer na hora, não depois de ~10 s de "Carregando…" (Fase 2).
 *
 * Vale para as BUSCAS (todas, em `main.tsx`) e para as GRAVAÇÕES que o servidor
 * aceita repetidas sem efeito a mais (concluir a aula, salvar, marcar como lida —
 * 06/10/2026). Gravação que cria algo (um curso, uma aula) NUNCA tenta de novo:
 * se a resposta se perdeu depois de gravar, a repetição criaria outro.
 */
export function deveTentarDeNovo(falhas: number, erro: unknown): boolean {
  if (isAxiosError(erro) && erro.response && erro.response.status < 500) return false;
  return falhas < 3;
}
