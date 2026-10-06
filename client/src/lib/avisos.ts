import type { AdminAviso } from "@/lib/api";

// COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1, 06/10/2026): as frases que a lista e o
// editor do aviso repetem. Admin: em português (decisão do operador, 23/09/2026).

/** "Todo mundo com conta" ou "Alunos de: Excel com IA". */
export function paraQuem(aviso: Pick<AdminAviso, "audience" | "course">): string {
  return aviso.audience === "CURSO" ? `Alunos de: ${aviso.course?.title ?? "curso apagado"}` : "Todo mundo com conta";
}

/** "Rascunho" ou "Enviada em 06/10/2026". */
export function quandoFoiEnviado(aviso: Pick<AdminAviso, "sentAt">, fuso?: string): string {
  if (!aviso.sentAt) return "Rascunho";
  return `Enviada em ${new Date(aviso.sentAt).toLocaleDateString("pt-BR", fuso ? { timeZone: fuso } : undefined)}`;
}

/** A frase da confirmação do envio: "Vai para 1 pessoa." / "Vai para 1.234 pessoas." */
export function fraseDaConfirmacao(quantos: number): string {
  return quantos === 1 ? "Vai para 1 pessoa." : `Vai para ${quantos.toLocaleString("pt-BR")} pessoas.`;
}
