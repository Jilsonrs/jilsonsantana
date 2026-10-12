import { useQuery } from "@tanstack/react-query";
import { pt } from "@jilson/core";
import { getCommonTexts, COMMON_TEXTS_QUERY, type CommonTexts } from "@/lib/api";

/**
 * Os textos COMUNS (`common.*`), já com as edições do operador em Admin →
 * Textos: o rodapé do app e o selo das 3 camadas saem daqui. É a mesma leitura
 * que a home faz no servidor (`getDict()`), então editar uma vez muda nos dois
 * lugares.
 *
 * Enquanto a busca não volta, ou se ela falhar, vale o texto de FÁBRICA do
 * dicionário: a tela nunca fica em branco.
 */
export function useTextosComuns(): CommonTexts {
  const { data } = useQuery({
    queryKey: [COMMON_TEXTS_QUERY],
    queryFn: () => getCommonTexts(),
  });
  return data ?? pt.common;
}
