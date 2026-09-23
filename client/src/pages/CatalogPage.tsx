import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as api from "@/lib/api";
import { SearchBar } from "@/components/content/SearchBar";
import { TrilhaCard } from "@/components/content/TrilhaCard";
import { CourseCard } from "@/components/content/CourseCard";

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
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
      <div className="mt-6 max-w-md">
        <SearchBar onSearch={onSearch} />
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Carregando…</p>}
      {isError && (
        <p className="mt-8 text-sm text-destructive">
          Não foi possível carregar {tipo === "cursos" ? "os cursos" : "as trilhas"}.
        </p>
      )}

      {!isLoading && !isError && buscando && resultados && (
        <div className="mt-10 space-y-10">
          {tipo === "trilhas" && (
            <Section title="Trilhas">
              {resultados.trilhas.map((t) => (
                <TrilhaCard key={t.id} {...t} />
              ))}
            </Section>
          )}
          {tipo === "cursos" && (
            <>
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
                    className="block rounded-lg border border-border p-4 hover:border-primary"
                  >
                    <p className="text-sm font-medium">{l.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.module.course.title} · {l.module.title}
                    </p>
                  </Link>
                ))}
              </Section>
            </>
          )}
          {buscaVazia && (
            <p className="text-muted-foreground">Nada encontrado para "{resultados.query}".</p>
          )}
        </div>
      )}

      {!isLoading && !isError && !buscando && (
        <div className="mt-10 space-y-10">
          {tipo === "cursos" && cursos.data && (
            <Section title="Cursos">
              {cursos.data.map((c) => (
                <CourseCard key={c.id} {...c} />
              ))}
            </Section>
          )}
          {tipo === "trilhas" && trilhas.data && (
            <Section title="Trilhas">
              {trilhas.data.map((t) => (
                <TrilhaCard key={t.id} {...t} />
              ))}
            </Section>
          )}
          {lista.data?.length === 0 && <p className="text-muted-foreground">{vazio}</p>}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  if (items.length === 0 || items.every((c) => c === null || c === undefined)) return null;
  return (
    <section>
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
