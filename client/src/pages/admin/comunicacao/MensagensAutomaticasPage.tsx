import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ContentStatus } from "@jilson/core";
import * as api from "@/lib/api";
import { previaDoTexto } from "@/lib/notificacoes";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";

const STATUS: Record<ContentStatus, string> = {
  [ContentStatus.PUBLISHED]: "Publicado",
  [ContentStatus.DRAFT]: "Rascunho",
  [ContentStatus.ARCHIVED]: "Arquivado",
};

/**
 * COMUNICAÇÃO → MENSAGENS AUTOMÁTICAS (bloco C1 — 06/10/2026, a partir das
 * "mensagens automatizadas" da Udemy): a boas-vindas e os parabéns de cada curso,
 * numa lista. Quem edita é o passo Mensagens do curso; aqui o operador vê todas
 * juntas e vai até a do curso. Admin: texto em português.
 */
export function MensagensAutomaticasPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-mensagens-dos-cursos"], queryFn: api.adminGetMensagensDosCursos });

  return (
    <PageContainer>
      <PageHeader title="Mensagens automáticas" />
      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível carregar as mensagens.
        </p>
      )}
      {data && data.length === 0 && <p className="text-muted-foreground">Nenhum curso ainda.</p>}

      {data && data.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border/60 bg-card">
          {data.map((m) => (
            <li key={m.courseId} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">
                  {m.courseTitle} <span className="text-xs text-muted-foreground">({STATUS[m.status]})</span>
                </p>
                <Link to={`/admin/cursos/${m.courseId}/mensagens`} className="text-sm font-medium text-primary hover:underline" aria-label={`Editar as mensagens de ${m.courseTitle}`}>
                  Editar no curso
                </Link>
              </div>
              <Linha rotulo="Boas-vindas" texto={m.boasVindas} />
              <Linha rotulo="Parabéns" texto={m.parabens} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function Linha({ rotulo, texto }: { rotulo: string; texto: string | null }) {
  return (
    <p className="line-clamp-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{rotulo}: </span>
      {texto ? previaDoTexto(texto) : "sem mensagem (nada é enviado)"}
    </p>
  );
}
