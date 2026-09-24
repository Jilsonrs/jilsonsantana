import { Link, useLocation } from "react-router-dom";
import { LogOut, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@jilson/core";
import { secoesVisiveis, secaoAtiva, itensSecundarios, type ItemSecundario } from "@/lib/navigation";
import { useT } from "@/lib/language";

/**
 * As iniciais do aluno, para o avatar de quem ainda não subiu foto.
 *
 * Desenhadas AQUI, e não buscadas de um serviço de avatar: a versão anterior
 * chamava `api.dicebear.com` passando o **e-mail do aluno na URL**, o que
 * mandava dado pessoal para um terceiro a cada carregamento — contra a
 * minimização que o resto do produto pratica (o `birthday` guarda só dia e mês
 * pelo mesmo motivo) — e colocava uma requisição externa no caminho crítico,
 * que é justamente o que a trava de leveza do design.md §1 combate.
 *
 * `name` é OPCIONAL no modelo (um gestor corporativo pode ser convidado só com
 * e-mail), por isso o e-mail é o segundo caminho e o "?" é o último.
 */
export function iniciais(nome?: string | null, email?: string | null): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  const local = (email ?? "").trim();
  return local ? local.slice(0, 2).toUpperCase() : "?";
}

export function SecondaryNav({
  papel,
  usuario,
  onSignOut
}: {
  papel?: string;
  usuario?: { name?: string | null; email?: string | null; image?: string | null; role?: string };
  onSignOut: () => void
}) {
  const { pathname } = useLocation();
  const t = useT();
  const secoes = secoesVisiveis(papel, t);
  const ativa = secaoAtiva(pathname, secoes);
  const itens = itensSecundarios(pathname, secoes);

  if (itens.length === 0) return null;

  // Group items by `grupo` property
  const grouped = itens.reduce((acc, item) => {
    // Seção de admin fica em português (decisão do operador): o "Geral" dela também.
    const groupName = item.grupo || (ativa?.papel === Role.ADMIN ? "Geral" : t.nav.geral);
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, ItemSecundario[]>);

  const groupKeys = Object.keys(grouped);

  return (
    <aside
      aria-label={t.nav.menuDaSecao}
      className={cn(
        "hidden md:flex flex-col shrink-0 w-[280px] bg-surface-alt",
        "border-r border-border py-8 px-6",
        "shadow-[inset_-10px_0_20px_rgba(0,0,0,0.01)]"
      )}
    >
      {ativa?.to === "/conta" && usuario ? (
        <div className="mb-8 flex flex-col items-center gap-3 px-2 text-center">
          <div className="size-16 overflow-hidden rounded-full border border-border bg-surface-alt">
            {usuario.image ? (
              // `alt` VAZIO de propósito: o nome do aluno está logo abaixo, e
              // repeti-lo faria o leitor de tela anunciar a mesma coisa duas
              // vezes. Imagem que duplica texto adjacente é decorativa.
              <img src={usuario.image} alt="" className="size-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-full items-center justify-center font-display text-xl font-semibold text-muted-foreground"
              >
                {iniciais(usuario.name, usuario.email)}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-lg leading-tight">
              {usuario.name}
            </span>
            <span className="text-sm text-muted-foreground mt-0.5">
              {usuario.role === Role.ADMIN ? "Administrador" : t.nav.contaPessoal}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-8 px-2 border-b border-border/50 pb-4">
          <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            {ativa?.label || t.nav.navegacao}
          </h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {ativa?.to === "/conta" ? (
          <>
            <ul className="flex flex-col gap-1 mt-2">
              {itens.map((item) => {
                const isItemActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center px-4 py-2.5 rounded-md text-[0.95rem] transition-colors font-medium",
                        isItemActive
                          ? "bg-black/5 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={onSignOut}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[0.95rem] font-medium transition-colors",
                  "text-destructive hover:bg-destructive/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                )}
              >
                <LogOut className="size-5 shrink-0" strokeWidth={1.5} />
                {t.nav.sair}
              </button>
            </div>
          </>
        ) : (
          groupKeys.map((grupo, index) => (
            <details key={grupo} className="group" open={index === 0}>
              <summary
                className={cn(
                  "flex items-center justify-between cursor-pointer list-none",
                  "px-2 py-3.5 font-semibold text-foreground transition-colors",
                  "border-b border-border/50 hover:text-primary",
                  "[&::-webkit-details-marker]:hidden"
                )}
              >
                {grupo}
                {/* O `details[open]` do HTML aplica o estilo ao `.group[open]` do Tailwind */}
                <Plus className="size-4 text-muted-foreground transition-transform group-open:hidden" />
                <X className="hidden size-4 text-muted-foreground transition-transform group-open:block" />
              </summary>
              
              <ul className="flex flex-col pb-2">
                {grouped[grupo].map((item) => {
                  const isItemActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center px-4 py-3 ml-2 text-[0.95rem] transition-all",
                          "border-l border-border/50",
                          isItemActive
                            ? "font-semibold text-primary border-l-2 border-primary -ml-[1px]" // O ml compensa a borda pra ficar alinhado
                            : "text-muted-foreground hover:text-foreground hover:border-black/20 focus-visible:text-foreground focus-visible:border-black/20"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))
        )}
      </div>

    </aside>
  );
}
