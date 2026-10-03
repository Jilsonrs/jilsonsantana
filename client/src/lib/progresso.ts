import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";

// O PROGRESSO na tela (Fase 5 — plano aprovado pelo operador em 03/10/2026). A
// aula conta como concluída sozinha (vídeo a 90%, texto ao abrir); quem decide se
// a pessoa pode concluir é o servidor, que recusa o que ela não pode assistir.

/** Concluir uma aula. Ao terminar, a página da aula recarrega: a barra e o sinal mudam na hora. */
export function useConcluirAula() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, comoAdmin }: { lessonId: number; comoAdmin: boolean }) => api.concluirAula(lessonId, comoAdmin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pagina-da-aula"] }),
  });
}

/** Quanto do curso a pessoa concluiu: aulas concluídas ÷ aulas da lista que ela vê, em %. */
export function porcentagemDoCurso(curso: api.PaginaDaAula["curso"], concluidas: number[]): number {
  const aulas = curso.modulos.flatMap((m) => m.aulas.map((a) => a.id));
  if (aulas.length === 0) return 0;
  const feitas = aulas.filter((id) => concluidas.includes(id)).length;
  return Math.round((feitas / aulas.length) * 100);
}
