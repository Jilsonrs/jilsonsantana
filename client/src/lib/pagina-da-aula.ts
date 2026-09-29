import { useQuery } from "@tanstack/react-query";
import { Role } from "@jilson/core";
import * as api from "@/lib/api";
import { useSession } from "@/lib/auth-client";

/**
 * Os dados da PÁGINA DA AULA (etapa 4 do Bloco U, 29/09/2026). O admin lê pela
 * rota de admin, que traz rascunho (decisão do operador); todo o resto, pela rota
 * da trava. A tela não decide acesso: mostra o que o servidor liberou.
 * `lessonId` nulo desliga a consulta (ex.: a lista de recursos ainda fechada).
 */
export function usePaginaDaAula(lessonId: number | null) {
  const { data: session, isPending } = useSession();
  const comoAdmin = session?.user.role === Role.ADMIN;
  const consulta = useQuery({
    queryKey: ["pagina-da-aula", lessonId, comoAdmin],
    // Seguro: `enabled` abaixo só liga a consulta com um id de verdade.
    queryFn: () => api.getLessonPage(lessonId as number, comoAdmin),
    enabled: lessonId !== null && !isPending,
  });
  return { ...consulta, comoAdmin, carregandoSessao: isPending };
}
