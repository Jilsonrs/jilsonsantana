import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { codigoDoErro } from "@/lib/course-form";

// AS LEGENDAS na tela do editor (decisões do operador, 04/10/2026). Uma consulta
// para a tela inteira; enviar e excluir recarregam ela.

const chave = (courseId: number) => ["admin-legendas", courseId];

export function useLegendas(courseId: number) {
  return useQuery({ queryKey: chave(courseId), queryFn: () => api.getLegendas(courseId) });
}

export function useAlterarLegenda(courseId: number) {
  const queryClient = useQueryClient();
  // A lista E o curso: o ✓ do passo Legendas vem do curso, e aparece ou some na hora.
  const recarregar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chave(courseId) }),
      queryClient.invalidateQueries({ queryKey: ["admin-course", courseId] }),
    ]);
  return {
    enviar: useMutation({ mutationFn: (v: { dono: api.DonoDaLegenda; arquivo: File }) => api.enviarLegenda(v.dono, v.arquivo), onSuccess: recarregar }),
    excluir: useMutation({ mutationFn: (dono: api.DonoDaLegenda) => api.excluirLegenda(dono), onSuccess: recarregar }),
  };
}

/** A frase do erro, pelo motivo que o servidor devolveu (admin: só português). */
export function mensagemDoErroDaLegenda(erro: unknown): string {
  // Seguro: o Axios põe o status em `response.status`; o resto é opcional.
  if ((erro as { response?: { status?: number } } | null)?.response?.status === 413) return "A legenda passa de 2 MB.";
  switch (codigoDoErro(erro)) {
    case "SoVtt":
      return "Envie um arquivo .vtt.";
    case "NaoEVtt":
      return "Este arquivo não é uma legenda .vtt válida (tem que começar com WEBVTT).";
    case "SemVideo":
      return "Envie o vídeo primeiro.";
    case "BunnyRecusou":
      return "O Bunny não aceitou. Tente de novo.";
    default:
      return "Não foi possível concluir. Tente de novo.";
  }
}

/** "hoje", "há 1 dia", "há 20 dias" — como a tela da Udemy. */
export function haQuantoTempo(iso: string, agora: Date = new Date()): string {
  const dias = Math.floor((agora.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}
