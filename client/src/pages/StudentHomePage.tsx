import { useSession } from "@/lib/auth-client";
import { PageContainer } from "@/components/layout/PageLayout";
import { ContinueEstudando } from "@/components/inicio/ContinueEstudando";
import { MinhasTrilhasNoInicio } from "@/components/inicio/MinhasTrilhasNoInicio";
import { Atalhos } from "@/components/inicio/Atalhos";
import { useT } from "@/lib/language";

/**
 * O INÍCIO — o painel do aluno, destino de quem acaba de entrar (decisão do
 * operador, 28–29/09/2026: rico, com o que ele tem a um clique, e preparado
 * para ganhar itens).
 *
 * É uma COMPOSIÇÃO de blocos, cada um em `components/inicio/` com os estados
 * dele: bloco novo entra aqui como mais uma linha, sem esta tela crescer.
 * Hoje: a saudação, Continue estudando (EM BREVE — depende do progresso, Fase
 * 5), Minhas trilhas (o único com dado real) e os Atalhos.
 *
 * **Sem número inventado:** o que ainda não existe diz EM BREVE, em vez de
 * encher a tela com dado que esconderia a dependência da Fase 5.
 */
export function StudentHomePage() {
  const t = useT();
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

      {/* Densidade da área logada (§5): usa o PageContainer padronizado (o mesmo
          de todas as telas do app e do admin). */}
      <PageContainer className="relative pt-10 pb-12 sm:pt-14 md:pt-16">
        {/* A ênfase serifada (§4) cai no NOME — é a palavra que importa aqui, e
            a regra é uma por título. */}
        <h1 className="text-[2.5rem] font-semibold leading-tight">
          {primeiroNome ? (
            <>
              {t.inicio.ola}, <span className="font-emphasis italic text-primary">{primeiroNome}</span>
            </>
          ) : (
            t.inicio.ola
          )}
        </h1>

        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
          {t.inicio.intro}
        </p>

        <ContinueEstudando />
        <MinhasTrilhasNoInicio />
        <Atalhos />
      </PageContainer>
    </div>
  );
}
