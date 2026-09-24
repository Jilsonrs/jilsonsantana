import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { SiteTextField as Campo } from "@/lib/api";
import { SiteTextField } from "@/components/admin/SiteTextField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";

// Texto das páginas públicas, editável sem deploy (docs/content.md § 16).
//
// A lista sai do DICIONÁRIO, não do banco: campo nunca editado também aparece,
// senão a tela só mostraria o que já foi mexido — inútil para editar a primeira
// vez. O banco só diz o que você mudou.

/** Nome amigável por seção. Sem entrada aqui, mostra a própria chave. */
const NOMES: Record<string, string> = {
  "common.nav": "Toda página · Menu do topo",
  "common.a11y": "Toda página · Leitor de tela",
  "common.footer": "Toda página · Rodapé",
  "home.a11y": "Home · Leitor de tela",
  "home.hero": "Home · Topo",
  "home.catalog": "Home · Catálogo de cursos",
  "home.target": "Home · Para quem é",
  "home.trilhas": "Home · Trilhas",
  "home.ai": "Home · JilsonAI",
  "home.author": "Home · Autor",
  "home.testimonials": "Home · Depoimentos",
  "home.pricing": "Home · Preço",
  "home.faq": "Home · Perguntas frequentes",
  "home.cta": "Home · Chamada final",
};

// UMA ABA POR PÁGINA (decisão do operador, 23/09/2026). A página é o 1º pedaço
// da chave (`home.hero.title` → `home`): página nova ganha aba sozinha, sem mexer
// aqui. As conhecidas vêm primeiro, nesta ordem.
const PAGINAS: Record<string, string> = { common: "Toda página", home: "Home" };
const ORDEM_PAGINAS = Object.keys(PAGINAS);
const paginaDe = (secao: string) => secao.split(".")[0];
const nomeCompleto = (secao: string) => NOMES[secao] ?? secao;
/** Dentro da aba, "Home · Topo" vira "Topo" — o nome da página já está na aba. */
const nomeCurto = (secao: string) => NOMES[secao]?.split(" · ")[1] ?? secao;

/** Seções na ordem do dicionário (a ordem da página), com "Leitor de tela" por
 *  ÚLTIMO: é texto que ninguém vê, e abrir a aba por ele escondia o que importa. */
function agrupar(campos: Campo[]): [string, Campo[]][] {
  const grupos = new Map<string, Campo[]>();
  for (const campo of campos) {
    const atual = grupos.get(campo.section);
    if (atual) atual.push(campo);
    else grupos.set(campo.section, [campo]);
  }
  const leitorDeTela = (secao: string) => (secao.endsWith(".a11y") ? 1 : 0);
  return [...grupos].sort(([a], [b]) => leitorDeTela(a) - leitorDeTela(b));
}

function paginasDe(campos: Campo[]): string[] {
  const presentes = [...new Set(campos.map((c) => paginaDe(c.section)))];
  const posicao = (p: string) => (ORDEM_PAGINAS.includes(p) ? ORDEM_PAGINAS.indexOf(p) : ORDEM_PAGINAS.length);
  return presentes.sort((a, b) => posicao(a) - posicao(b));
}

export function AdminSiteTextPage() {
  const [busca, setBusca] = useState("");
  const [abaEscolhida, setAbaEscolhida] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-site-text"],
    queryFn: api.adminGetSiteText,
  });

  const termo = busca.trim().toLowerCase();
  const paginas = useMemo(() => paginasDe(data ?? []), [data]);
  // Derivada, não sincronizada: a aba escolhida só vale se ainda existir nos dados.
  const aba = abaEscolhida && paginas.includes(abaEscolhida) ? abaEscolhida : paginas[0];

  // A BUSCA ATRAVESSA AS ABAS: procurar só na aba aberta esconderia o texto que
  // está em outra página, e o operador concluiria que ele não existe.
  const grupos = useMemo(() => {
    if (!data) return [];
    const filtrados = termo
      ? data.filter(
          (c) =>
            c.key.toLowerCase().includes(termo) ||
            (c.pt.override ?? c.pt.factory).toLowerCase().includes(termo) ||
            (c.en.override ?? c.en.factory).toLowerCase().includes(termo),
        )
      : data.filter((c) => paginaDe(c.section) === aba);
    return agrupar(filtrados);
  }, [data, termo, aba]);

  return (
    <PageContainer>
      <PageHeader
        title="Textos do Site"
        description="O texto das páginas públicas. O que você deixar em branco volta ao padrão."
      />

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      {isError && (
        <p role="alert" className="text-destructive">
          Não foi possível carregar os textos. Recarregue a página.
        </p>
      )}

      {data && (
        <div className="space-y-12">
          {/* Busca e abas: a primeira seção da página */}
          <PageSection
            title="Navegação e Busca"
            description="Escolha a página que deseja editar ou busque por um termo específico em todo o site."
          >
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="busca">Buscar</Label>
                  <Input
                    id="busca"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Parte do texto ou da chave"
                  />
                </div>
                {!termo && paginas.length > 0 && (
                  <div className="space-y-2">
                    <Label>Página</Label>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Página">
                      {paginas.map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={p === aba ? "default" : "outline"}
                          aria-pressed={p === aba}
                          onClick={() => setAbaEscolhida(p)}
                        >
                          {PAGINAS[p] ?? p}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>

          {grupos.length === 0 ? (
            <p className="text-muted-foreground">
              {busca.trim()
                ? `Nenhum texto encontrado para “${busca.trim()}”.`
                : "Nenhum texto cadastrado."}
            </p>
          ) : (
            <div className="space-y-8">
              {grupos.map(([secao, campos]) => (
                <PageSection
                  key={secao}
                  title={termo ? nomeCompleto(secao) : nomeCurto(secao)}
                  description={`${campos.length} ${campos.length === 1 ? 'campo' : 'campos'}`}
                  className="border-t border-border/40 pt-12"
                >
                  <Card>
                    <CardContent className="space-y-8 pt-8">
                      {campos.map((campo) => (
                        <SiteTextField key={campo.key} campo={campo} />
                      ))}
                    </CardContent>
                  </Card>
                </PageSection>
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
