import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { pt } from "@jilson/core";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";
import { EmBreve } from "@/components/content/EmBreve";

/**
 * O INÍCIO DO ADMIN — o painel da escola (decisão do operador, 29/09/2026: logado
 * como admin, o Início é o painel dele; o aluno vai para o painel do aluno).
 *
 * RELATÓRIOS: os blocos que o operador mapeou para a seção "Dados" (28/09), que
 * virou este Início. Todos EM BREVE por decisão dele — nenhum número inventado:
 * cada bloco diz o que vai mostrar e quando os dados existem.
 *
 * ATALHOS: os que já existiam nesta tela, embaixo (decisão dele). O de Trilhas
 * é EM BREVE, sem link, porque a tela ainda não existe (mesma regra do menu).
 *
 * Texto do Admin fica em português, escrito aqui (decisão do operador, 23/09).
 */

const EM_BREVE = pt.app.nav.emBreve;

const RELATORIOS = [
  {
    titulo: "Assinantes",
    texto: "Ativos, novos e cancelados no mês.",
    quando: "Chega com a assinatura pela Stripe (Fase 4).",
  },
  {
    titulo: "Aprendizado",
    texto: "Horas assistidas, cursos mais vistos e conclusões.",
    quando: "Chega com o progresso das aulas (Fase 5).",
  },
  {
    titulo: "De onde vieram os alunos",
    texto: "A campanha do link por onde cada aluno chegou.",
    quando: "Chega com o cadastro pela assinatura (Fase 4).",
  },
  {
    titulo: "Uso do JilsonAI",
    texto: "Quanto os alunos usam a IA.",
    quando: "Chega com o JilsonAI (Fase 6).",
  },
];

const ATALHOS: { titulo: string; texto: string; to?: string }[] = [
  {
    titulo: "Cursos",
    texto: "Criar e editar cursos, módulos e aulas. Configure o conteúdo que os alunos irão acessar.",
    to: "/admin/cursos",
  },
  {
    titulo: "Trilhas",
    texto: "Montar trilhas curadas combinando diversos cursos (Bloco 6b).",
  },
  {
    titulo: "Site",
    texto: "Gerencie textos institucionais, depoimentos de alunos e perguntas frequentes.",
    to: "/admin/site",
  },
];

export function AdminPage() {
  return (
    <PageContainer>
      <PageHeader title="Início" description="Os relatórios da escola e o acesso rápido às ferramentas." />

      <div className="space-y-12">
        <PageSection title="Relatórios" description="Cada bloco acende quando os dados dele existirem.">
          <div className="grid gap-6 sm:grid-cols-2">
            {RELATORIOS.map(({ titulo, texto, quando }) => (
              <Cartao key={titulo} titulo={<>{titulo} <EmBreve texto={EM_BREVE} /></>}>
                <p>{texto}</p>
                <p className="mt-2 text-xs">{quando}</p>
              </Cartao>
            ))}
          </div>
        </PageSection>

        <PageSection title="Atalhos">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ATALHOS.map(({ titulo, texto, to }) => (
              <Cartao
                key={titulo}
                comLink={!!to}
                titulo={
                  to ? (
                    <Link to={to} className="hover:underline">
                      {titulo}
                    </Link>
                  ) : (
                    <>
                      {titulo} <EmBreve texto={EM_BREVE} />
                    </>
                  )
                }
              >
                <p>{texto}</p>
              </Cartao>
            ))}
          </div>
        </PageSection>
      </div>
    </PageContainer>
  );
}

function Cartao({ titulo, comLink, children }: { titulo: ReactNode; comLink?: boolean; children: ReactNode }) {
  // O destaque ao passar o mouse só onde há para onde ir: no EM BREVE ele
  // sugeriria um clique que não leva a lugar nenhum.
  const id = useId();
  return (
    // Grupo com nome: o leitor de tela anuncia o cartão pelo título dele.
    <Card
      role="group"
      aria-labelledby={id}
      className={comLink ? "transition-all hover:shadow-md hover:border-primary/50" : undefined}
    >
      <CardHeader>
        {/* `h3` de verdade (o `CardTitle` é uma div): abaixo do `h2` da seção. */}
        <h3 id={id} className="flex items-center gap-2 text-lg font-semibold">
          {titulo}
        </h3>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
