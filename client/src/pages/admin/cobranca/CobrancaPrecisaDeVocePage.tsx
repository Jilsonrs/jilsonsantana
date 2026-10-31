import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { CartaoDoCaso } from "@/components/admin/cobranca/CartaoDoCaso";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/**
 * ADMIN → COBRANÇA → PRECISA DE VOCÊ (Fase 4, etapa 4.7b, passo 2c — o mapa aprovado pelo operador, 31/10/2026): a
 * primeira tela da Cobrança. Cada situação que precisa do operador é um caso — os urgentes primeiro —, com quem é o
 * aluno, o que resolve e o "Fechar" com uma nota. O que a escola resolve sozinha não aparece aqui. Admin: texto na tela.
 */
export function CobrancaPrecisaDeVocePage() {
  const [situacao, setSituacao] = useState<"abertos" | "fechados">("abertos");
  const [pagina, setPagina] = useState(1);
  const casos = useQuery({ queryKey: ["admin", "cobranca", "casos", situacao, pagina], queryFn: () => api.adminListarCasos({ situacao, pagina }), placeholderData: keepPreviousData });
  const escolher = (nova: "abertos" | "fechados") => {
    setSituacao(nova);
    setPagina(1);
  };
  let conteudo;
  if (casos.isPending) conteudo = <p className="text-muted-foreground">Carregando…</p>;
  else if (casos.isError)
    conteudo = (
      <div role="alert" className="space-y-3">
        <p className="font-medium text-destructive">Não foi possível carregar os casos.</p>
        <Button type="button" variant="outline" onClick={() => void casos.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  else if (casos.data.casos.length === 0) conteudo = <p className="text-muted-foreground">{situacao === "abertos" ? "Nada precisa de você agora." : "Nenhum caso fechado ainda."}</p>;
  else
    conteudo = (
      <div className="space-y-4">
        <ul aria-label="Casos" className="divide-y divide-border rounded-2xl border border-border/60">
          {casos.data.casos.map((caso) => (
            <CartaoDoCaso key={caso.id} caso={caso} />
          ))}
        </ul>
        {pagina > 1 || casos.data.temMais ? (
          <nav aria-label="Páginas" className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {pagina}</span>
            <Button type="button" variant="outline" size="sm" disabled={!casos.data.temMais} onClick={() => setPagina(pagina + 1)}>
              Próxima
            </Button>
          </nav>
        ) : null}
      </div>
    );
  const abertos = casos.data?.abertos;
  const urgentes = casos.data?.urgentes;
  return (
    <PageContainer>
      <PageHeader title="Precisa de você" description="O que precisa de você na cobrança. O que a escola resolve sozinha não aparece aqui." />
      <PageSection title={abertos === undefined ? "Casos" : `${abertos} ${abertos === 1 ? "caso aberto" : "casos abertos"}${urgentes ? ` · ${urgentes} ${urgentes === 1 ? "urgente" : "urgentes"}` : ""}`}>
        <div className="space-y-6">
          <div role="group" aria-label="Abertos ou fechados" className="flex gap-2">
            <Button type="button" size="sm" variant={situacao === "abertos" ? "default" : "outline"} aria-pressed={situacao === "abertos"} onClick={() => escolher("abertos")}>
              Abertos
            </Button>
            <Button type="button" size="sm" variant={situacao === "fechados" ? "default" : "outline"} aria-pressed={situacao === "fechados"} onClick={() => escolher("fechados")}>
              Fechados
            </Button>
          </div>
          {conteudo}
        </div>
      </PageSection>
    </PageContainer>
  );
}
