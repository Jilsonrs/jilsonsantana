import { lazy, Suspense, type LazyExoticComponent } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";
import { ICONS } from "./icon-registry";

// Um componente preguiçoso por nome, criado uma vez só: recriar a cada render
// faria o React desmontar e recarregar o ícone.
const carregados = new Map<string, LazyExoticComponent<LucideIcon>>();

function iconePreguicoso(token: string): LazyExoticComponent<LucideIcon> {
  let Icone = carregados.get(token);
  if (!Icone) {
    Icone = lazy(async () => {
      // Os desenhos chegam num pacote só, na primeira vez que um curso usa um
      // ícone fora dos 55; depois ficam no cache do navegador.
      const { desenhoDoLucide } = await import("./todos-os-icones");
      return { default: desenhoDoLucide(token) ?? Sparkles };
    });
    carregados.set(token, Icone);
  }
  return Icone;
}

/**
 * O ícone de um Destaque (Course.highlights[].icon). Desde 05/10/2026 o operador
 * escolhe entre TODOS os ícones do Lucide. Os 55 nomes antigos (o registro) saem
 * na hora, como sempre; os outros chegam sob demanda, e só para a página que os
 * usa; um nome desconhecido vira o Brilho, como antes.
 */
export function HighlightIcon({ token, className }: { token: string; className?: string }) {
  const Fixo = Object.prototype.hasOwnProperty.call(ICONS, token) ? ICONS[token] : null;
  if (Fixo) return <Fixo className={className} aria-hidden="true" />;

  const Icone = iconePreguicoso(token);
  return (
    <Suspense fallback={<span className={className} aria-hidden="true" />}>
      <Icone className={className} aria-hidden="true" />
    </Suspense>
  );
}
