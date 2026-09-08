import { Link } from "react-router-dom";
import { BookOpen, Compass, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Home do aluno — o destino de quem acaba de entrar.
 *
 * **Continua magra de propósito, e a beleza não pode disfarçar isso.** O
 * conteúdo real depende da Fase 5 (captura de progresso): sem `LessonProgress`
 * não existe "o que você estava vendo" nem "o que falta concluir". Encher a
 * tela com número inventado a deixaria bonita e MENTIROSA — e esconderia a
 * dependência de quem for planejar a próxima fase.
 *
 * O que a passada de design trouxe foi a linguagem visual (§4, §7): título com
 * ênfase serifada, lista com travessão, cartões com ícone em círculo, luz de
 * IA no fundo. Nenhum dado novo.
 *
 * Não busca dados — por isso não tem estado de carregando nem de erro. Quando
 * passar a buscar, os três entram junto com os testes deles.
 */

const PORTAS = [
  {
    to: "/cursos",
    icon: Compass,
    titulo: "Catálogo",
    legenda: "CURSOS E TRILHAS",
  },
  {
    to: "/minhas-trilhas",
    icon: BookOpen,
    titulo: "Minhas trilhas",
    legenda: "O QUE VOCÊ SALVOU",
  },
];

export function StudentHomePage() {
  const { data: session } = useSession();
  const primeiroNome = session?.user.name?.split(" ")[0];

  return (
    <div className="relative overflow-hidden">
      {/* "Luz de IA" (§6): gradiente radial azul quase invisível no canto, que
          dá volume e assinatura sem custar leitura. Decorativo, então
          `pointer-events-none` para não interceptar clique. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 size-[600px] bg-[radial-gradient(circle,hsl(var(--primary)/0.06)_0%,transparent_70%)]"
      />

      {/* Densidade da área logada (§5): py-12, não o py-24 da landing — o aluno
          volta aqui todo dia, então o painel trabalha em vez de impressionar. */}
      <div className="relative mx-auto max-w-[1000px] px-8 py-12">
        {/* A ênfase serifada (§4) cai no NOME — é a palavra que importa aqui, e
            a regra é uma por título. A copy não mudou: só ganhou o destaque. */}
        <h1 className="text-[2.5rem] font-semibold leading-tight">
          {primeiroNome ? (
            <>
              Olá, <span className="font-emphasis italic text-primary">{primeiroNome}</span>
            </>
          ) : (
            "Olá"
          )}
        </h1>

        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
          Aqui é o seu ponto de partida. O que você começar a estudar aparece
          nesta tela, para você continuar de onde parou.
        </p>

        <section aria-labelledby="continue" className="mt-12">
          <h2 id="continue" className="text-xl font-semibold">
            Continue estudando
          </h2>

          {/* Estado vazio HONESTO: diz o que vai aparecer e o que fazer agora,
              e tem SAÍDA. "Nenhum curso" sozinho parece defeito; isto parece
              começo. */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex size-12 items-center justify-center rounded-full bg-surface-alt">
              <Sparkles className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <p className="mt-6 max-w-[52ch] leading-relaxed text-muted-foreground">
              Suas aulas em andamento aparecem aqui assim que você começar um
              curso. Escolha um no catálogo e o progresso passa a te esperar
              nesta tela.
            </p>
            <Button asChild className="mt-8 rounded-full">
              <Link to="/cursos">Ver catálogo</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="portas" className="mt-14">
          <h2 id="portas" className="text-xl font-semibold">
            Por onde começar
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {PORTAS.map(({ to, icon: Icon, titulo, legenda }) => (
              <Link
                key={to}
                to={to}
                className={
                  "group flex flex-col items-center rounded-2xl border border-border/60 bg-card p-8 text-center " +
                  "shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-[transform,box-shadow,border-color] " +
                  "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_hsl(var(--primary)/0.08),0_1px_3px_hsl(var(--primary)/0.05)] " +
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                }
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-surface-alt">
                  <Icon className="size-5 text-primary" strokeWidth={1.5} />
                </span>
                <span className="mt-6 font-display text-lg font-semibold">{titulo}</span>
                {/* Piso de 0,75rem (§9): etiqueta pequena continua legível. */}
                <span className="mt-2 font-mono text-[0.75rem] tracking-[0.05em] uppercase text-muted-foreground">
                  {legenda}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
