import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { SearchBar } from "@/components/content/SearchBar";
import { TrilhaCard } from "@/components/content/TrilhaCard";
import { CourseCard } from "@/components/content/CourseCard";
import { Link } from "react-router-dom";

// Catalog: trilhas + courses, browsable by anyone ("onboarding aberto e
// livre" — CLAUDE.md). A query (2+ chars) swaps the default catalog for the
// keyword-search result (trilhas/courses/lessons), reusing GET /api/search
// instead of adding a dedicated search route/page.
export function CatalogPage() {
  const [query, setQuery] = useState("");
  const onSearch = useCallback((q: string) => setQuery(q), []);

  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => ({
      trilhas: await api.getTrilhas(),
      courses: await api.getCourses(),
    }),
    enabled: query === "",
  });

  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: query !== "",
  });

  const isSearching = query !== "";
  const isLoading = isSearching ? search.isLoading : catalog.isLoading;
  const isError = isSearching ? search.isError : catalog.isError;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Catálogo</h1>
      <div className="mt-6 max-w-md">
        <SearchBar onSearch={onSearch} />
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Carregando…</p>}
      {isError && <p className="mt-8 text-sm text-destructive">Não foi possível carregar o catálogo.</p>}

      {!isLoading && !isError && isSearching && search.data && (
        <div className="mt-10 space-y-10">
          <Section title="Trilhas">
            {search.data.trilhas.map((t) => (
              <TrilhaCard key={t.id} {...t} />
            ))}
          </Section>
          <Section title="Cursos">
            {search.data.courses.map((c) => (
              <CourseCard key={c.id} {...c} />
            ))}
          </Section>
          <Section title="Aulas">
            {search.data.lessons.map((l) => (
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
          {search.data.trilhas.length === 0 &&
            search.data.courses.length === 0 &&
            search.data.lessons.length === 0 && (
              <p className="text-muted-foreground">Nada encontrado para "{search.data.query}".</p>
            )}
        </div>
      )}

      {!isLoading && !isError && !isSearching && catalog.data && (
        <div className="mt-10 space-y-10">
          <Section title="Trilhas">
            {catalog.data.trilhas.map((t) => (
              <TrilhaCard key={t.id} {...t} />
            ))}
          </Section>
          <Section title="Cursos">
            {catalog.data.courses.map((c) => (
              <CourseCard key={c.id} {...c} />
            ))}
          </Section>
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
