import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Role } from "@jilson/core";
import * as api from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { NOTIFICACOES } from "@/lib/notificacoes";

/** A chave da página de UMA aula na memória da tela (o ponto gravado entra nela — Bloco AULA). */
export function chaveDaPaginaDaAula(lessonId: number | null, comoAdmin: boolean) {
  return ["pagina-da-aula", lessonId, comoAdmin] as const;
}

/**
 * Os dados da PÁGINA DA AULA (etapa 4 do Bloco U, 29/09/2026). O admin lê pela
 * rota de admin, que traz rascunho (decisão do operador); todo o resto, pela rota
 * da trava. A tela não decide acesso: mostra o que o servidor liberou.
 * `lessonId` nulo desliga a consulta (ex.: a lista de recursos ainda fechada).
 */
export function usePaginaDaAula(lessonId: number | null) {
  const { data: session, isPending } = useSession();
  const comoAdmin = session?.user.role === Role.ADMIN;
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: chaveDaPaginaDaAula(lessonId, comoAdmin),
    // Seguro: `enabled` abaixo só liga a consulta com um id de verdade.
    queryFn: async () => {
      const pagina = await api.getLessonPage(lessonId as number, comoAdmin);
      // Abrir a aula pode ter mandado a boas-vindas do curso: o sino confere.
      void queryClient.invalidateQueries({ queryKey: [NOTIFICACOES] });
      return pagina;
    },
    enabled: lessonId !== null && !isPending,
  });
  return { ...consulta, comoAdmin, carregandoSessao: isPending };
}
