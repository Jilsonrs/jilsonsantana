import { createContext, useContext, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { pt, en, type Dict, type LanguageCode } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { updateMyLanguage } from "@/lib/api";

/**
 * O idioma do app (decisão do operador, 24/09/2026: tudo depois do login existe
 * em inglês, por causa dos alunos internacionais — menos o Admin).
 *
 * É decidido UMA vez, no shell (`Layout`), e desce por contexto: toda tela lê o
 * mesmo valor, então não existe um instante com metade da tela em cada idioma.
 *
 * - **logado** → o idioma da CONTA (`User.preferredLanguage`, lido da sessão).
 *   Sobrevive a recarregar e a entrar de novo, em qualquer aparelho.
 * - **sem login** (a tela de login) → o do ENDEREÇO, `?lang=en`. É por aí que o
 *   estrangeiro que escolheu inglês na home chega ao login já em inglês.
 *
 * Fora do shell (os testes de cada tela) o padrão é português.
 */

/** Os textos do app — a parte `app` do dicionário único do `core`. */
export type AppTexts = Dict["app"];

const IdiomaContext = createContext<LanguageCode>("pt");

export function IdiomaProvider({ idioma, children }: { idioma: LanguageCode; children: ReactNode }) {
  return <IdiomaContext.Provider value={idioma}>{children}</IdiomaContext.Provider>;
}

/** Usado SÓ pelo shell, para decidir o idioma que desce para as telas. */
export function useIdiomaDoShell(): LanguageCode {
  const { data: session } = useSession();
  const [params] = useSearchParams();
  return session ? paraIdioma(session.user.preferredLanguage) : paraIdioma(params.get("lang"));
}

/** O idioma atual do app. */
export function useIdioma(): LanguageCode {
  return useContext(IdiomaContext);
}

/** Os textos do app no idioma atual. O texto de tela do aluno sai daqui. */
export function useT(): AppTexts {
  return useIdioma() === "en" ? en.app : pt.app;
}

/**
 * Troca o idioma da CONTA. Espera o `refetch()` da sessão antes de terminar: o
 * shell relê o idioma e todas as telas mudam juntas, sem recarregar a página.
 */
export function useTrocarIdioma() {
  const { refetch } = useSession();
  const trocar = useMutation({
    mutationFn: updateMyLanguage,
    onSuccess: async () => {
      await refetch();
    },
  });
  return {
    trocarIdioma: (idioma: LanguageCode) => trocar.mutate(idioma),
    trocarIdiomaAntes: (idioma: LanguageCode) => trocar.mutateAsync(idioma),
    trocando: trocar.isPending,
    falhou: trocar.isError,
  };
}

/** Só `pt` ou `en`; qualquer outro valor (ou nenhum) vale português, o padrão da conta. */
export function paraIdioma(valor: unknown): LanguageCode {
  return valor === "en" ? "en" : "pt";
}
