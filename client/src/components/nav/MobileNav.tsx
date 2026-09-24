import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { secaoAtiva, secoesVisiveis } from "@/lib/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Navegação no celular — o rail é `md:block`, então abaixo disso a gaveta é a
 * ÚNICA navegação que existe.
 *
 * **Hoje é de UM nível, de propósito.** A navegação em profundidade
 * (`Comunicação ›` … `‹ Menu`, capturas 09 e 10 do operador) é a Fatia 3 do
 * Bloco S2. Esta versão existe para o celular não ficar sem navegação nenhuma
 * entre uma fatia e outra — o app tem que funcionar em todo commit.
 */
export function MobileNav({ papel, onSignOut }: { papel?: string; onSignOut: () => void }) {
  const [aberta, setAberta] = useState(false);
  const { pathname } = useLocation();
  const secoes = secoesVisiveis(papel);
  const ativa = secaoAtiva(pathname, secoes);

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetTrigger
          className="flex size-9 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Abrir o menu"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 bg-rail p-0 text-rail-foreground">
          {/* O Radix exige título e descrição no diálogo; ficam só para leitor
              de tela, porque na tela a marca logo abaixo já cumpre o papel. */}
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal do site.</SheetDescription>

          {/* A marca leva à HOME PÚBLICA, como no rail (AppRail) — e pelo mesmo
              motivo é `<a>` e não `<Link>`: a home é HTML de servidor, e o Link
              do React Router nunca sairia do app. */}
          <a
            href="/"
            className="flex h-14 items-center gap-1 px-5 font-semibold tracking-tight text-white"
          >
            <span className="text-primary text-lg">#</span>
            <span>Jilson Santana</span>
          </a>

          <nav aria-label="Principal" className="flex flex-col py-2">
            {secoes.map((secao) => {
              const Icon = secao.icon;
              const estaAtiva = secao.to === ativa?.to;
              // Planejada = a tela não existe: sai como TEXTO, nunca como link.
              // Mesma trava do rail (AppRail → ItemPlanejado); se um dos dois
              // virasse link, a gaveta do celular mandaria para rota inexistente.
              if (secao.estado === "planejado") {
                return (
                  <div
                    key={secao.to}
                    aria-disabled="true"
                    className="flex h-12 items-center gap-3 border-l-2 border-transparent pl-[18px] pr-4 text-sm text-rail-foreground/40"
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{secao.label}</span>
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.08em]">
                      EM BREVE
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={secao.to}
                  to={secao.to}
                  onClick={() => setAberta(false)}
                  aria-current={estaAtiva ? "page" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-3 border-l-2 pl-[18px] pr-4 text-sm",
                    estaAtiva
                      ? "border-primary bg-rail-ativo text-primary font-medium"
                      : "border-transparent",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span>{secao.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={onSignOut}
              className="flex h-12 items-center gap-3 border-l-2 border-transparent pl-[18px] pr-4 text-sm"
            >
              <LogOut className="size-5 shrink-0" />
              <span>Sair</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
