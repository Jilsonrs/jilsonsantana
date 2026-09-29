import { Link } from "react-router-dom";
import { Award, Bot, Route } from "lucide-react";
import { MockGrid } from "@/components/nav/MockIcons";
import { EmBreve } from "@/components/content/EmBreve";
import { useT } from "@/lib/language";

type Atalho = {
  titulo: string;
  icon: React.ElementType;
  /** Sem `to` = a tela ainda não existe: sai como texto com EM BREVE, nunca link. */
  to?: string;
};

// A mesma forma do card antigo de "Por onde começar", desenhado pelo parceiro
// de design; só perdeu a legenda.
const CARTAO =
  "flex flex-col items-center rounded-2xl border border-border/60 bg-card p-8 text-center " +
  "shadow-[0_4px_20px_rgba(0,0,0,0.02)]";

/**
 * Os atalhos do painel do Início (operador, 29/09/2026): o que o aluno tem a um
 * clique. JilsonAI (Fase 6) e Certificados (Fase 6.5) aparecem como EM BREVE.
 */
export function Atalhos() {
  const t = useT();
  const atalhos: Atalho[] = [
    { titulo: t.nav.cursos, icon: MockGrid, to: "/cursos" },
    { titulo: t.nav.trilhas, icon: Route, to: "/trilhas" },
    { titulo: t.nav.jilsonai, icon: Bot },
    { titulo: t.nav.certificados, icon: Award },
  ];

  return (
    <section aria-labelledby="atalhos" className="mt-14">
      <h2 id="atalhos" className="text-xl font-semibold">
        {t.inicio.atalhos}
      </h2>

      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {atalhos.map(({ titulo, icon: Icon, to }) => {
          const conteudo = (
            <>
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-alt">
                <Icon className={to ? "size-5 text-primary" : "size-5 text-muted-foreground"} strokeWidth={1.5} />
              </span>
              <span className="mt-6 font-display text-lg font-semibold">{titulo}</span>
            </>
          );
          return (
            <li key={titulo}>
              {to ? (
                <Link
                  to={to}
                  className={
                    `group h-full ${CARTAO} transition-[transform,box-shadow,border-color] ` +
                    "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_hsl(var(--primary)/0.08),0_1px_3px_hsl(var(--primary)/0.05)] " +
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                    "motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  }
                >
                  {conteudo}
                </Link>
              ) : (
                <div aria-disabled="true" className={`h-full ${CARTAO} text-muted-foreground`}>
                  {conteudo}
                  <span className="mt-3">
                    <EmBreve />
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
