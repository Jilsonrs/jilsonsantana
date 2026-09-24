import { useQuery } from "@tanstack/react-query";
import { Youtube } from "lucide-react";
import { pt } from "@jilson/core";
import { getCommonTexts, COMMON_TEXTS_QUERY } from "@/lib/api";
import { ITENS_DO_RODAPE } from "@/lib/footer";

/**
 * Rodapé do app logado — aluno e admin (decisão do operador, 24/09/2026).
 *
 * Os textos são os do rodapé da HOME, com as edições do operador em
 * Admin → Textos (a rota devolve o `getDict()` do servidor). Enquanto a busca
 * não volta, ou se ela falhar, vale o texto de FÁBRICA do dicionário: o rodapé
 * nunca some nem fica em branco.
 *
 * Hoje só em português — o app do aluno em inglês é bloco próprio
 * (implementation-plan → Bloco I, decisões de 23/09).
 *
 * Os links são `<a href>`, não `<Link>`: o destino é página do servidor, e o
 * roteador do React não a conhece.
 */
export function AppFooter() {
  const { data } = useQuery({
    queryKey: [COMMON_TEXTS_QUERY, "pt"],
    queryFn: () => getCommonTexts("pt"),
  });
  const textos = data ?? pt.common;

  return (
    <footer className="border-t border-border px-4 py-6 sm:px-6 md:px-[50px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold tracking-tight">
          <span className="text-primary">#</span>Jilson Santana
        </p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {ITENS_DO_RODAPE.map((item) => (
            <li key={item.href}>
              {item.tipo === "youtube" ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="block rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Youtube className="size-5" aria-hidden="true" />
                </a>
              ) : (
                <a
                  href={item.href}
                  className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.texto(textos)}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{textos.footer.copyright}</p>
    </footer>
  );
}
