import { useMutation } from "@tanstack/react-query";
import type { LanguageCode } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { updateMyLanguage } from "@/lib/api";

/**
 * O idioma do app logado (decisão do operador, 24/09/2026).
 *
 * A fonte é a CONTA — `User.preferredLanguage`, lido da sessão —, e não um
 * estado da tela: por isso a escolha sobrevive a recarregar a página e a entrar
 * de novo, em qualquer aparelho. Visitante sem login não passa por aqui (o
 * idioma dele é o do endereço — CLAUDE.md → Idiomas).
 *
 * Trocar grava na conta e ATUALIZA A SESSÃO antes de terminar: o `onSuccess`
 * espera o `refetch()`, então tudo que lê o idioma muda junto, sem recarregar a
 * página e sem um instante com metade da tela em cada idioma.
 */
export function useAppLanguage() {
  const { data: session, refetch } = useSession();
  const trocar = useMutation({
    mutationFn: updateMyLanguage,
    onSuccess: async () => {
      await refetch();
    },
  });

  return {
    idioma: paraIdioma(session?.user.preferredLanguage),
    trocarIdioma: (idioma: LanguageCode) => trocar.mutate(idioma),
    trocando: trocar.isPending,
  };
}

// Qualquer valor fora dos dois idiomas da escola (inclusive conta antiga sem o
// campo) vale português, que é o padrão da coluna.
function paraIdioma(valor: unknown): LanguageCode {
  return valor === "en" ? "en" : "pt";
}
