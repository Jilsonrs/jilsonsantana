import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { deveTentarDeNovo } from "@/lib/tentar-de-novo";

// "SALVOS" na tela (decisão do operador, 03/10/2026, "como no LinkedIn"). Uma
// consulta só para a lista inteira: o botão de cada aula e o do curso leem dela se
// estão salvos, e a tela Salvos mostra a mesma lista.

const SALVOS = "salvos";

/** A lista de quem está logado. Sem login, a consulta nem sai. */
export function useSalvos(logado: boolean) {
  return useQuery({ queryKey: [SALVOS], queryFn: api.getSalvos, enabled: logado });
}

/** Os ids salvos, para o botão saber se está ligado. */
export function useIdsSalvos(logado: boolean): { cursos: Set<number>; aulas: Set<number> } {
  const { data } = useSalvos(logado);
  return {
    cursos: new Set((data?.cursos ?? []).map((c) => c.id)),
    aulas: new Set((data?.aulas ?? []).map((a) => a.id)),
  };
}

/** Salvar ou tirar dos salvos. Ao terminar, a lista recarrega e os botões mudam. */
export function useAlternarSalvo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tipo, id, salvar }: { tipo: "cursos" | "aulas"; id: number; salvar: boolean }) => api.alternarSalvo(tipo, id, salvar),
    // Salvar (ou tirar) de novo não muda nada no servidor (06/10/2026).
    retry: deveTentarDeNovo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [SALVOS] }),
  });
}
