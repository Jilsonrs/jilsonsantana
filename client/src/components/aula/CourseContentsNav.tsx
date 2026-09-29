import { Link } from "react-router-dom";
import { FileText, PlayCircle } from "lucide-react";
import { ContentStatus, LessonKind } from "@jilson/core";
import type { AulaNaLista } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/language";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { RecursosNaLista } from "./LessonResources";

/** "Rascunho" / "Arquivado": só o admin recebe o que não está publicado. */
function EtiquetaDeStatus({ status }: { status: ContentStatus }) {
  const t = useT();
  if (status === ContentStatus.PUBLISHED) return null;
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] text-muted-foreground">
      {status === ContentStatus.ARCHIVED ? t.aula.arquivado : t.aula.rascunho}
    </span>
  );
}

function AulaDaLista({ aula, atual }: { aula: AulaNaLista; atual: boolean }) {
  const t = useT();
  const Icone = aula.kind === LessonKind.TEXT ? FileText : PlayCircle;
  return (
    <>
      <Link
        to={`/aluno/aula/${aula.id}`}
        aria-current={atual ? "page" : undefined}
        className={cn(
          "flex items-start gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors",
          atual ? "border-primary bg-black/5 font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{aula.kind === LessonKind.TEXT ? t.aula.aulaDeTexto : t.aula.aulaDeVideo}:</span>
        <span className="flex-1">{aula.title}</span>
        <EtiquetaDeStatus status={aula.status} />
      </Link>
      {aula.temArquivos && <RecursosNaLista lessonId={aula.id} />}
    </>
  );
}

/**
 * O CONTEÚDO DO CURSO da aula aberta — o nível 2 da página da aula, como no
 * LinkedIn Learning (decisão do operador, 28–29/09/2026). Os módulos abrem e
 * recolhem (`<details>` nativo, como o resto do nível 2); o da aula atual começa
 * aberto. Desenhado pela coluna secundária no computador e, no celular e para
 * o visitante, pela própria página.
 */
export function CourseContentsNav({ lessonId }: { lessonId: number }) {
  const t = useT();
  const { data } = usePaginaDaAula(lessonId);
  if (!data) return null;
  const { curso } = data;

  return (
    <nav aria-label={t.aula.conteudoDoCurso} className="space-y-2">
      <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.aula.conteudoDoCurso}</p>
      {curso.modulos.map((modulo) => (
        <details key={modulo.id} open={modulo.aulas.some((a) => a.id === lessonId)} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-border/50 px-2 py-3 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{modulo.title}</span>
            <EtiquetaDeStatus status={modulo.status} />
          </summary>
          <ul className="flex flex-col py-1">
            {modulo.aulas.map((aula) => (
              <li key={aula.id}>
                <AulaDaLista aula={aula} atual={aula.id === lessonId} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}
