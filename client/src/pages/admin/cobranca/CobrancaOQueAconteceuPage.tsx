import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { textoDoMotivoDeCancelamento } from "@/lib/cobranca-registro";
import { LinhasDoRegistro } from "@/components/admin/cobranca/LinhasDoRegistro";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/**
 * ADMIN → COBRANÇA → O QUE ACONTECEU (Fase 4, etapa 4.7b, passo 1f — o mapa aprovado pelo operador, 31/10/2026): a
 * linha do tempo da cobrança da escola inteira — quem fez (a Stripe, o aluno, a rodada, você), quando e o quê — e os
 * motivos que os alunos escolheram ao cancelar. Só leitura. Admin: texto na tela.
 */
export function CobrancaOQueAconteceuPage() {
  const [pagina, setPagina] = useState(1);
  const dados = useQuery({ queryKey: ["admin", "cobranca", "o-que-aconteceu", pagina], queryFn: () => api.adminOQueAconteceu(pagina), placeholderData: keepPreviousData });
  return (
    <PageContainer>
      <PageHeader title="O que aconteceu" description="Tudo o que aconteceu na cobrança, do mais novo para o mais velho: quem fez, quando e o quê." />
      {dados.isPending ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : dados.isError ? (
        <div role="alert" className="space-y-3">
          <p className="font-medium text-destructive">Não foi possível carregar o que aconteceu.</p>
          <Button type="button" variant="outline" onClick={() => void dados.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          <PageSection title="Por que cancelaram" description="Os motivos que os alunos escolheram ao cancelar. Escolher é opcional.">
            <ul aria-label="Motivos de cancelamento" className="space-y-1">
              {dados.data.motivos.map((m) => (
                <li key={m.motivo} className="text-foreground">
                  {textoDoMotivoDeCancelamento(m.motivo)}: {m.total}
                </li>
              ))}
            </ul>
          </PageSection>
          <PageSection title="Linha do tempo">
            <div className="space-y-4">
              <LinhasDoRegistro linhas={dados.data.linhas} comAluno />
              {pagina > 1 || dados.data.temMais ? (
                <nav aria-label="Páginas" className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {pagina}</span>
                  <Button type="button" variant="outline" size="sm" disabled={!dados.data.temMais} onClick={() => setPagina(pagina + 1)}>
                    Próxima
                  </Button>
                </nav>
              ) : null}
            </div>
          </PageSection>
        </div>
      )}
    </PageContainer>
  );
}
