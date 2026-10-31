import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CodigoDaLista } from "@jilson/core";
import * as api from "@/lib/api";
import { dataCurta } from "@/lib/cobranca-admin";
import { mensagemDoCodigoQueFalhou, SITUACAO_DO_CODIGO, textoDoDesconto, textoDosUsos } from "@/lib/cobranca-codigos";
import { Button } from "@/components/ui/button";
import { CriarCodigo } from "@/components/admin/cobranca/CriarCodigo";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

const CHAVE = ["admin", "cobranca", "codigos"] as const;

/** Um código da lista: o texto, o desconto, quantos usaram, a validade — e pausar ou reativar. */
function LinhaDoCodigo({ codigo }: { codigo: CodigoDaLista }) {
  const queryClient = useQueryClient();
  const mudar = useMutation({
    mutationFn: (ativo: boolean) => api.adminMudarCodigo(codigo.id, ativo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });
  const validade = codigo.validoAte ? `vale até ${dataCurta(codigo.validoAte)}` : "sem data para vencer";
  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono font-medium text-foreground">{codigo.codigo}</p>
        <p className="text-sm text-muted-foreground">{SITUACAO_DO_CODIGO[codigo.situacao]}</p>
      </div>
      <p className="text-sm text-foreground">{[textoDoDesconto(codigo), textoDosUsos(codigo), validade].join(" · ")}</p>
      {codigo.situacao === "ativo" || codigo.situacao === "pausado" ? (
        <Button type="button" size="sm" variant="outline" disabled={mudar.isPending} onClick={() => mudar.mutate(codigo.situacao === "pausado")}>
          {codigo.situacao === "ativo" ? (mudar.isPending ? "Pausando…" : "Pausar") : mudar.isPending ? "Reativando…" : "Reativar"}
        </Button>
      ) : null}
      {mudar.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDoCodigoQueFalhou(mudar.error)}
        </p>
      ) : null}
    </li>
  );
}

/**
 * ADMIN → COBRANÇA → CÓDIGOS PROMOCIONAIS (Fase 4, etapa 4.7b, passo 6d — decisão do operador, 31/10/2026, P142): criar,
 * pausar, reativar e ver quantos usaram, sem ir à Stripe. Cada ação fica em "O que aconteceu", com quem fez.
 */
export function CobrancaCodigosPage() {
  const lista = useQuery({ queryKey: CHAVE, queryFn: () => api.adminListarCodigos() });
  let conteudo;
  if (lista.isPending) conteudo = <p className="text-muted-foreground">Carregando…</p>;
  else if (lista.isError)
    conteudo = (
      <div role="alert" className="space-y-3">
        <p className="font-medium text-destructive">Não foi possível carregar os códigos.</p>
        <Button type="button" variant="outline" onClick={() => void lista.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  else if (lista.data.length === 0) conteudo = <p className="text-muted-foreground">Nenhum código ainda.</p>;
  else
    conteudo = (
      <ul aria-label="Códigos" className="divide-y divide-border rounded-2xl border border-border/60">
        {lista.data.map((codigo) => (
          <LinhaDoCodigo key={codigo.id} codigo={codigo} />
        ))}
      </ul>
    );
  return (
    <PageContainer>
      <PageHeader title="Códigos promocionais" description="Crie, pause e acompanhe os códigos. Pausar faz o código parar de valer na hora; reativar o faz voltar." />
      <PageSection title="Criar um código">
        <CriarCodigo />
      </PageSection>
      <PageSection title="Os códigos">{conteudo}</PageSection>
    </PageContainer>
  );
}
