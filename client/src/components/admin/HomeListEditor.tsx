import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentStatus, LANGUAGES, type LanguageCode } from "@jilson/core";
import type { ConfigDaLista, ItemDaLista, ValoresDoItem } from "@/lib/home-lists";
import { ROTULO_IDIOMA, proximaOrdem } from "@/lib/home-lists";
import { HomeListItem } from "@/components/admin/HomeListItem";
import { HomeListItemForm } from "@/components/admin/HomeListItemForm";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

// A tela de uma lista da home (depoimentos ou perguntas frequentes), inteira:
// idioma, lista, item novo. A página só diz QUAL lista é (ConfigDaLista).
//
// Um idioma de cada vez: cada idioma tem as SUAS linhas (o depoimento em inglês
// é outra linha, não tradução desta), e é assim que a home as mostra.

export function HomeListEditor<T extends ItemDaLista>({ config }: { config: ConfigDaLista<T> }) {
  const queryClient = useQueryClient();
  const [idioma, setIdioma] = useState<LanguageCode>("pt");
  const [criando, setCriando] = useState(false);

  const { data, isLoading, isError } = useQuery({ queryKey: [config.queryKey], queryFn: config.listar });
  const doIdioma = useMemo(() => (data ?? []).filter((i) => i.language === idioma), [data, idioma]);

  const criar = useMutation({
    mutationFn: (valores: ValoresDoItem) => config.criar(idioma, valores),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      setCriando(false);
    },
  });

  const trocarIdioma = (novo: LanguageCode) => {
    setIdioma(novo);
    setCriando(false); // o item novo nasce no idioma da aba; trocar de aba descarta o rascunho
  };

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
          <PageSection
            title="Idioma e Cadastro"
            description="Escolha o idioma para visualizar ou cadastrar itens."
          >
            <div className="space-y-6">
              <div className="flex gap-2" role="group" aria-label="Idioma">
                {LANGUAGES.map((l) => (
                  <Button
                    key={l}
                    size="sm"
                    variant={idioma === l ? "default" : "outline"}
                    aria-pressed={idioma === l}
                    onClick={() => trocarIdioma(l)}
                  >
                    {ROTULO_IDIOMA[l]}
                  </Button>
                ))}
              </div>

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
                      displayOrder: config.comOrdem ? proximaOrdem(doIdioma) : 0,
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
            </div>
          </PageSection>

          <PageSection
            title="Itens Cadastrados"
            description={`Lista de itens em ${ROTULO_IDIOMA[idioma].toLowerCase()}`}
            className="border-t border-border/40 pt-12"
          >
            {doIdioma.length === 0 ? (
              <p className="text-muted-foreground">{config.vazio}</p>
            ) : (
              <ul className="space-y-3" aria-label={`${config.titulo} em ${ROTULO_IDIOMA[idioma].toLowerCase()}`}>
                {doIdioma.map((item) => (
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
