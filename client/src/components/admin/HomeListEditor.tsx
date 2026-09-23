import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContentStatus, LANGUAGES, type LanguageCode } from "@jilson/core";
import type { ConfigDaLista, ItemDaLista, ValoresDoItem } from "@/lib/home-lists";
import { ROTULO_IDIOMA, proximaOrdem } from "@/lib/home-lists";
import { HomeListItem } from "@/components/admin/HomeListItem";
import { HomeListItemForm } from "@/components/admin/HomeListItemForm";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{config.titulo}</h1>
        <p className="text-sm text-muted-foreground">{config.descricao}</p>
      </div>

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

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      {isError && (
        <p role="alert" className="text-destructive">
          Não foi possível carregar a lista. Recarregue a página.
        </p>
      )}

      {data && (
        <>
          {criando ? (
            <HomeListItemForm
              idBase="novo"
              principal={config.principal}
              secundario={config.secundario}
              inicial={{
                principal: "",
                secundario: "",
                displayOrder: proximaOrdem(doIdioma),
                // Nasce RASCUNHO: nada vai para a home por acidente — publicar é
                // uma escolha, feita no próprio formulário.
                status: ContentStatus.DRAFT,
              }}
              salvando={criar.isPending}
              erro={criar.isError}
              onSalvar={(valores) => criar.mutate(valores)}
              onCancelar={() => setCriando(false)}
            />
          ) : (
            <Button onClick={() => setCriando(true)}>{config.rotuloNovo}</Button>
          )}

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
        </>
      )}
    </div>
  );
}
