import { useQuery } from "@tanstack/react-query";
import { Youtube } from "lucide-react";
import { pt, en, LANGUAGES } from "@jilson/core";
import { getCommonTexts, COMMON_TEXTS_QUERY } from "@/lib/api";
import { itensDoRodape } from "@/lib/footer";
import { useAppLanguage } from "@/lib/language";

// O texto de FÁBRICA de cada idioma — vale enquanto a busca não volta ou se ela
// falhar, para o rodapé nunca sumir nem ficar em branco.
const FABRICA = { pt: pt.common, en: en.common };

/**
 * Rodapé do app logado — aluno e admin (decisão do operador, 24/09/2026).
 *
 * Os textos são os do rodapé da HOME, com as edições do operador em
 * Admin → Textos (a rota devolve o `getDict()` do servidor). Enquanto a busca
 * não volta, ou se ela falhar, vale o texto de FÁBRICA do dicionário: o rodapé
 * nunca some nem fica em branco.
 *
 * Segue o IDIOMA DO APP (`useAppLanguage`, gravado na conta): textos, destinos
 * dos links e canal do YouTube mudam juntos quando o aluno troca no seletor.
 *
 * Os links são `<a href>`, não `<Link>`: o destino é página do servidor, e o
 * roteador do React não a conhece.
 */
export function AppFooter() {
  const { idioma, trocarIdioma, trocando } = useAppLanguage();
  const { data } = useQuery({
    queryKey: [COMMON_TEXTS_QUERY, idioma],
    queryFn: () => getCommonTexts(idioma),
  });
  const textos = data ?? FABRICA[idioma];

  return (
    <footer className="mt-auto pb-10">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 md:pr-[50px]">
        
        {/* Barra estilo "Menu da Home" (footer-top) */}
        <div className="flex flex-col gap-4 bg-gradient-to-r from-background/95 to-surface-vitrine/95 px-4 py-4 backdrop-blur-xl md:h-[55px] md:flex-row md:items-center md:justify-between md:rounded-r-[24px] md:py-0 md:pl-[50px] md:pr-6">
          <p className="font-brand text-2xl font-bold tracking-tighter">
            <span className="text-primary">#</span>Jilson Santana
          </p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[15px] font-medium text-foreground">
            {itensDoRodape(idioma).map((item) => (
              <li key={item.href}>
                {item.tipo === "youtube" ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="block rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Youtube className="size-5" aria-hidden="true" />
                  </a>
                ) : (
                  <a
                    href={item.href}
                    className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.texto(textos)}
                  </a>
                )}
              </li>
            ))}
            <li className="text-border" aria-hidden="true">|</li>
            {/* Seletor PT | EN (decisão do operador, 24/09/2026): troca o idioma do
                PRÓPRIO app, sem sair da tela, e grava na conta. São BOTÕES, não
                links: nada navega. `aria-pressed` diz qual é o idioma atual. */}
            <li className="flex items-center gap-4">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={idioma === l}
                  disabled={trocando}
                  onClick={() => {
                    if (l !== idioma) trocarIdioma(l);
                  }}
                  className={
                    idioma === l
                      ? "border-b-2 border-primary pb-[2px] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      : "border-b-2 border-transparent pb-[2px] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  }
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-2 px-4 text-[0.85rem] text-muted-foreground md:flex-row md:items-center md:justify-between md:gap-4 md:pl-[50px] md:pr-0">
          <p>{textos.footer.tagline}</p>
          <p>{textos.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
