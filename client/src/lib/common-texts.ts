import { useQuery } from "@tanstack/react-query";
import { pt, en } from "@jilson/core";
import { getCommonTexts, COMMON_TEXTS_QUERY, type CommonTexts } from "@/lib/api";
import { useIdioma } from "@/lib/language";

// O texto de FÁBRICA de cada idioma — vale enquanto a busca não volta ou se ela
// falhar, para a tela nunca ficar em branco.
const FABRICA = { pt: pt.common, en: en.common };

/**
 * Os textos COMUNS (`common.*`) no idioma do app, já com as edições do operador
 * em Admin → Textos: o rodapé do app e o selo das 3 camadas saem daqui. É a
 * mesma leitura que a home faz no servidor (`getDict()`), então editar uma vez
 * muda nos dois lugares.
 */
export function useTextosComuns(): CommonTexts {
  const idioma = useIdioma();
  const { data } = useQuery({
    queryKey: [COMMON_TEXTS_QUERY, idioma],
    queryFn: () => getCommonTexts(idioma),
  });
  return data ?? FABRICA[idioma];
}
