import { Youtube } from "lucide-react";
import { itensDoRodape } from "@/lib/footer";
import { useTextosComuns } from "@/lib/common-texts";

/**
 * Rodapé do app logado — aluno e admin (decisão do operador, 24/09/2026).
 *
 * Os textos são os do rodapé da HOME, com as edições do operador em
 * Admin → Textos (a rota devolve o `getDict()` do servidor). Enquanto a busca
 * não volta, ou se ela falhar, vale o texto de FÁBRICA do dicionário: o rodapé
 * nunca some nem fica em branco.
 *
 * Só em português (decisão do operador, 12/10/2026): o seletor PT | EN saiu.
 *
 * Os links são `<a href>`, não `<Link>`: o destino é página do servidor, e o
 * roteador do React não a conhece.
 */
export function AppFooter() {
  const textos = useTextosComuns();

  return (
    <footer className="mt-auto pb-10">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 md:pr-[50px]">
        
        {/* Barra estilo "Menu da Home" (footer-top) */}
        <div className="flex flex-col gap-4 bg-gradient-to-r from-background/95 to-surface-vitrine/95 px-4 py-4 backdrop-blur-xl md:h-[55px] md:flex-row md:items-center md:justify-between md:rounded-r-[24px] md:py-0 md:pl-[50px] md:pr-6">
          <p className="font-brand text-2xl font-bold tracking-tighter">
            <span className="text-primary">#</span>Jilson Santana
          </p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[15px] font-medium text-foreground">
            {itensDoRodape().map((item) => (
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
