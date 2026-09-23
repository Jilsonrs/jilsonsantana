import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { SiteTextField as Campo } from "@/lib/api";
import { SiteTextField } from "@/components/admin/SiteTextField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function agrupar(campos: Campo[]): [string, Campo[]][] {
  const grupos = new Map<string, Campo[]>();
  for (const campo of campos) {
    const atual = grupos.get(campo.section);
    if (atual) atual.push(campo);
    else grupos.set(campo.section, [campo]);
  }
  return [...grupos];
}

export function AdminSiteTextPage() {
  const [busca, setBusca] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-site-text"],
    queryFn: api.adminGetSiteText,
  });

  const grupos = useMemo(() => {
    if (!data) return [];
    const termo = busca.trim().toLowerCase();
    const filtrados = termo
      ? data.filter(
          (c) =>
            c.key.toLowerCase().includes(termo) ||
            (c.pt.override ?? c.pt.factory).toLowerCase().includes(termo) ||
            (c.en.override ?? c.en.factory).toLowerCase().includes(termo),
        )
      : data;
    return agrupar(filtrados);
  }, [data, busca]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site</h1>
        <p className="text-sm text-muted-foreground">
          O texto das páginas públicas. O que você deixar em branco volta ao padrão.
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}

      {isError && (
        <p role="alert" className="text-destructive">
          Não foi possível carregar os textos. Recarregue a página.
        </p>
      )}

      {data && (
        <>
          <div className="space-y-1">
            <Label htmlFor="busca">Buscar</Label>
            <Input
              id="busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Parte do texto ou da chave"
            />
          </div>

          {grupos.length === 0 ? (
            <p className="text-muted-foreground">
              {busca.trim()
                ? `Nenhum texto encontrado para “${busca.trim()}”.`
                : "Nenhum texto cadastrado."}
            </p>
          ) : (
            grupos.map(([secao, campos]) => (
              <details key={secao} className="rounded-lg border px-4 py-3">
                <summary className="cursor-pointer font-medium">
                  {NOMES[secao] ?? secao}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({campos.length})
                  </span>
                </summary>
                {campos.map((campo) => (
                  <SiteTextField key={campo.key} campo={campo} />
                ))}
              </details>
            ))
          )}
        </>
      )}
    </div>
  );
}
