import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as api from "@/lib/api";
import { SearchBar } from "@/components/content/SearchBar";
import { TrilhaCard } from "@/components/content/TrilhaCard";
import { CourseCard } from "@/components/content/CourseCard";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";

// Catálogo, navegável por qualquer pessoa ("onboarding aberto e livre" —
// CLAUDE.md). São DUAS telas, `/cursos` e `/trilhas` (operador, set/2026:
// "se clicou em cursos aparece só cursos, o mesmo com trilhas").
//
// Um componente com `tipo` e não dois arquivos: o que difere entre as duas é a
// lista e o título; busca, estados e layout são os mesmos, e duplicá-los faria
// as duas telas divergirem na primeira correção feita em só uma.

type Tipo = "cursos" | "trilhas";

const TEXTOS: Record<Tipo, { titulo: string; vazio: string }> = {
  cursos: { titulo: "Cursos", vazio: "Nenhum curso publicado ainda." },
  trilhas: { titulo: "Trilhas", vazio: "Nenhuma trilha publicada ainda." },
};

export function CatalogPage({ tipo }: { tipo: Tipo }) {
  const [query, setQuery] = useState("");
  const onSearch = useCallback((q: string) => setQuery(q), []);
  const buscando = query !== "";

  // Duas consultas em vez de uma que devolve os dois: estando em /cursos, não
  // há por que buscar trilhas que ninguém vai ver.
  const cursos = useQuery({
    queryKey: ["catalogo", "cursos"],
    queryFn: api.getCourses,
    enabled: !buscando && tipo === "cursos",
  });
  const trilhas = useQuery({
    queryKey: ["catalogo", "trilhas"],
    queryFn: api.getTrilhas,
    enabled: !buscando && tipo === "trilhas",
  });
  const busca = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: buscando,
  });

  const lista = tipo === "cursos" ? cursos : trilhas;
  const isLoading = buscando ? busca.isLoading : lista.isLoading;
  const isError = buscando ? busca.isError : lista.isError;
  const { titulo, vazio } = TEXTOS[tipo];

  // Na busca, cada tela mostra só o que é dela — e AULA conta como curso,
  // porque é dentro de um curso que o aluno vai parar ao clicar nela.
  const resultados = busca.data;
  const buscaVazia =
    resultados !== undefined &&
    (tipo === "cursos"
      ? resultados.courses.length === 0 && resultados.lessons.length === 0
      : resultados.trilhas.length === 0);

  return (
    <PageContainer>
      <PageHeader title={titulo} />
      
      <div className="mt-2 max-w-md">
        <SearchBar onSearch={onSearch} />
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="mt-8 text-sm text-destructive">
          Não foi possível carregar {tipo === "cursos" ? "os cursos" : "as trilhas"}.
        </p>
      )}

      {!isLoading && !isError && buscando && resultados && (
        <div className="mt-12 space-y-12">
          {tipo === "trilhas" && (
            <Section title="Trilhas">
              {resultados.trilhas.map((t) => (
                <TrilhaCard key={t.id} {...t} />
              ))}
            </Section>
          )}
          {tipo === "cursos" && (
            <div className="space-y-12">
              <Section title="Cursos">
                {resultados.courses.map((c) => (
                  <CourseCard key={c.id} {...c} />
                ))}
              </Section>
              <Section title="Aulas">
                {resultados.lessons.map((l) => (
                  <Link
                    key={l.id}
                    to={`/curso/${l.module.course.slug}`}
                    className="block rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                  >
                    <p className="text-base font-semibold text-foreground">{l.title}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {l.module.course.title} · {l.module.title}
                    </p>
                  </Link>
                ))}
              </Section>
            </div>
          )}
          {buscaVazia && (
            <p className="text-muted-foreground text-lg">Nada encontrado para "{resultados.query}".</p>
          )}
        </div>
      )}

      {!isLoading && !isError && !buscando && (
        <div className="mt-12 space-y-12">
          {tipo === "cursos" && cursos.data && (
            <Section title="Catálogo de Cursos">
              {cursos.data.map((c) => (
                <CourseCard key={c.id} {...c} />
              ))}
            </Section>
          )}
          {tipo === "trilhas" && trilhas.data && (
            <Section title="Catálogo de Trilhas">
              {trilhas.data.map((t) => (
                <TrilhaCard key={t.id} {...t} />
              ))}
            </Section>
          )}
          {lista.data?.length === 0 && <p className="text-muted-foreground text-lg">{vazio}</p>}
        </div>
      )}
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  if (items.length === 0 || items.every((c) => c === null || c === undefined)) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  );
}
