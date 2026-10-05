import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { NOTIFICACOES } from "@/lib/notificacoes";

// O PROGRESSO na tela (Fase 5 — plano aprovado pelo operador em 03/10/2026). A
// aula conta como concluída sozinha (vídeo a 90%, texto ao abrir); quem decide se
// a pessoa pode concluir é o servidor, que recusa o que ela não pode assistir.

const PROGRESSO_DOS_CURSOS = "progresso-dos-cursos";

/** Concluir uma aula. Ao terminar, a página da aula recarrega: a barra e o sinal mudam na hora. */
export function useConcluirAula() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, comoAdmin }: { lessonId: number; comoAdmin: boolean }) => api.concluirAula(lessonId, comoAdmin),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pagina-da-aula"] }),
        queryClient.invalidateQueries({ queryKey: [PROGRESSO_DOS_CURSOS] }),
        // A última aula concluída pode ter mandado os parabéns do curso.
        queryClient.invalidateQueries({ queryKey: [NOTIFICACOES] }),
      ]);
    },
  });
}

/** Quanto do curso a pessoa concluiu: aulas concluídas ÷ aulas da lista que ela vê, em %. */
export function porcentagemDoCurso(curso: api.PaginaDaAula["curso"], concluidas: number[]): number {
  const aulas = curso.modulos.flatMap((m) => m.aulas.map((a) => a.id));
  if (aulas.length === 0) return 0;
  const feitas = aulas.filter((id) => concluidas.includes(id)).length;
  return Math.round((feitas / aulas.length) * 100);
}

/**
 * A porcentagem de quem está logado em cada curso COMEÇADO, por id do curso (a
 * barra no cartão do curso — pedido do operador de 30/09/2026). Sem login, a
 * consulta nem sai e o mapa fica vazio.
 */
export function useProgressoDosCursos(logado: boolean): Map<number, number> {
  const { data } = useQuery({
    queryKey: [PROGRESSO_DOS_CURSOS],
    queryFn: api.getProgressoDosCursos,
    enabled: logado,
  });
  return new Map((logado ? (data ?? []) : []).filter((p) => p.total > 0).map((p) => [p.courseId, Math.round((p.concluidas / p.total) * 100)]));
}
