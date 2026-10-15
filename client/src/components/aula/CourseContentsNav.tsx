import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, FileText, PlayCircle } from "lucide-react";
import { ContentStatus, LessonKind } from "@jilson/core";
import type { AulaNaLista } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/language";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { useSession } from "@/lib/auth-client";
import { useIdsSalvos } from "@/lib/salvos";
import { BotaoSalvar } from "@/components/content/BotaoSalvar";
import { RecursosNaLista } from "./LessonResources";
import { minutosESegundos } from "@/lib/duracao-do-curso";

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

function AulaDaLista({
  aula,
  atual,
  concluida,
  salvar,
}: {
  aula: AulaNaLista;
  atual: boolean;
  concluida: boolean;
  /** O botão de salvar (só logado e só aula publicada); ausente, não aparece. */
  salvar?: { salvo: boolean };
}) {
  const t = useT();
  const Icone = aula.kind === LessonKind.TEXT ? FileText : PlayCircle;
  return (
    <>
      <div className="flex items-start gap-1">
        <Link
          to={`/aluno/aula/${aula.id}`}
          aria-current={atual ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-sm transition-all duration-200 border-l-[3px]",
            atual
              ? "border-primary bg-primary/5 font-semibold text-foreground rounded-r-xl"
              : "border-transparent rounded-xl text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
              atual
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/40 bg-muted/40 text-muted-foreground",
            )}
            aria-hidden="true"
          >
            <Icone className="size-3.5" />
          </div>
          <span className="sr-only">{aula.kind === LessonKind.TEXT ? t.aula.aulaDeTexto : t.aula.aulaDeVideo}:</span>
          <span className="flex-1 leading-snug">
            {aula.title}
            {/* A duração do vídeo ao lado do título com exatamente 1 espaço antes do hífen */}
            {typeof aula.duracaoSegundos === "number" && (
              <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                {" "}- {minutosESegundos(aula.duracaoSegundos)}
              </span>
            )}
          </span>
          {/* A aula concluída (Fase 5, 03/10/2026); o leitor de tela ouve "Concluída". */}
          {concluida && (
            <span className="flex items-center shrink-0 pt-0.5">
              <CheckCircle2 className="size-4 text-primary fill-primary/15" aria-hidden="true" />
              <span className="sr-only">{t.aula.concluida}</span>
            </span>
          )}
          <EtiquetaDeStatus status={aula.status} />
        </Link>
        {/* Salvar para depois, ao lado da aula (decisão do operador, 03/10/2026). */}
        {salvar && <BotaoSalvar tipo="aulas" id={aula.id} salvo={salvar.salvo} nome={`${t.aula.salvarParaDepois}: ${aula.title}`} />}
      </div>
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
  const { data: session } = useSession();
  const salvos = useIdsSalvos(Boolean(session));
  if (!data) return null;
  const { curso } = data;
  // Só o que está publicado na cadeia inteira pode ser salvo (o servidor recusa o resto).
  const podeSalvar = (aula: AulaNaLista, moduloPublicado: boolean) =>
    Boolean(session) && curso.status === ContentStatus.PUBLISHED && moduloPublicado && aula.status === ContentStatus.PUBLISHED;

  return (
    <nav aria-label={t.aula.conteudoDoCurso} className="space-y-4">
      <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{t.aula.conteudoDoCurso}</p>
      <div className="space-y-3">
        {curso.modulos.map((modulo) => (
          <details key={modulo.id} open={modulo.aulas.some((a) => a.id === lessonId)} className="group rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm transition-all hover:border-border">
            <summary className="flex cursor-pointer list-none items-center gap-3 bg-muted/20 px-5 py-4 font-semibold text-foreground transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
              <span className="flex-1 font-display tracking-tight text-[1.05rem]">{modulo.title}</span>
              <EtiquetaDeStatus status={modulo.status} />
            </summary>
            <ul className="flex flex-col space-y-1 p-2 pt-1 border-t border-border/30">
              {modulo.aulas.map((aula) => (
                <li key={aula.id}>
                  <AulaDaLista
                    aula={aula}
                    atual={aula.id === lessonId}
                    concluida={data.concluidas.includes(aula.id)}
                    salvar={podeSalvar(aula, modulo.status === ContentStatus.PUBLISHED) ? { salvo: salvos.aulas.has(aula.id) } : undefined}
                  />
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </nav>
  );
}
