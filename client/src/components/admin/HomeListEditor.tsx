import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentStatus } from "@jilson/core";
import type { ConfigDaLista, ItemDaLista, ValoresDoItem } from "@/lib/home-lists";
import { proximaOrdem } from "@/lib/home-lists";
import { HomeListItem } from "@/components/admin/HomeListItem";
import { HomeListItemForm } from "@/components/admin/HomeListItemForm";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

// A tela de uma lista da home (depoimentos ou perguntas frequentes), inteira:
// lista e item novo. A página só diz QUAL lista é (ConfigDaLista).
//
// A escola é só em português (decisão do operador, 12/10/2026 — etapa 4.6c): as
// abas de idioma saíram. As linhas em inglês que ainda estão no banco (até o
// passo 4 da etapa) não aparecem aqui — nem na home.

export function HomeListEditor<T extends ItemDaLista>({ config }: { config: ConfigDaLista<T> }) {
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);

  const { data, isLoading, isError } = useQuery({ queryKey: [config.queryKey], queryFn: config.listar });
  const itens = useMemo(() => (data ?? []).filter((i) => i.language === "pt"), [data]);

  const criar = useMutation({
    mutationFn: (valores: ValoresDoItem) => config.criar(valores),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setCriando(false);
    },
  });

  return (
    <PageContainer>
      <PageHeader title={config.titulo} description={config.descricao} />

      {isLoading && <p className="text-muted-foreground mt-8">Carregando…</p>}

      {isError && (
        <p role="alert" className="text-destructive mt-8">
          Não foi possível carregar a lista. Recarregue a página.
        </p>
      )}

      {data && (
        <div className="space-y-12">
          <PageSection title="Cadastro">
            {criando ? (
              <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
                <HomeListItemForm
                  idBase="novo"
                  principal={config.principal}
                  secundario={config.secundario}
                  comOrdem={config.comOrdem}
                  inicial={{
                    principal: "",
                    secundario: "",
                    // Sem ordem (depoimentos), o valor nem é enviado — o banco usa o default.
                    displayOrder: config.comOrdem ? proximaOrdem(itens) : 0,
                    // Nasce RASCUNHO: nada vai para a home por acidente — publicar é
                    // uma escolha, feita no próprio formulário.
                    status: ContentStatus.DRAFT,
                  }}
                  salvando={criar.isPending}
                  erro={criar.isError}
                  onSalvar={(valores) => criar.mutate(valores)}
                  onCancelar={() => setCriando(false)}
                />
              </div>
            ) : (
              <Button onClick={() => setCriando(true)}>{config.rotuloNovo}</Button>
            )}
          </PageSection>

          <PageSection title="Itens Cadastrados" className="border-t border-border/40 pt-12">
            {itens.length === 0 ? (
              <p className="text-muted-foreground">{config.vazio}</p>
            ) : (
              <ul className="space-y-3" aria-label={config.titulo}>
                {itens.map((item) => (
                  <li key={item.id}>
                    <HomeListItem item={item} config={config} />
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>
      )}
    </PageContainer>
  );
}
