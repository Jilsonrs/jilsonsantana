import { lazy, Suspense } from "react";
import { Lock } from "lucide-react";
import { LessonKind } from "@jilson/core";
import type { PaginaDaAula } from "@/lib/api";
import { useT } from "@/lib/language";
import { BunnyPlayer } from "@/components/content/BunnyPlayer";
import { ListaDeArquivos } from "./LessonResources";

// A peça do Markdown (~37 KB) só baixa quando uma aula de TEXTO abre: direto, ela
// entraria no pacote que todo aluno baixa (CLAUDE.md → Client).
const MarkdownText = lazy(() => import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })));

// A aula de texto aceita o mesmo que a descrição do curso, mais títulos: é texto
// longo, que o operador organiza em seções.
const ELEMENTOS_DA_AULA = ["p", "strong", "em", "ul", "ol", "li", "br", "h2", "h3"] as const;

const QUADRO = "flex aspect-video w-full flex-col items-center justify-center rounded-3xl border border-border/40 bg-gradient-to-br from-surface-alt to-muted/20 p-8 text-center shadow-inner relative overflow-hidden";

/**
 * O CONTEÚDO da aula aberta: o player grande (aula de vídeo), o texto no centro
 * com os recursos embaixo (aula de texto — o print 03 do operador), ou "para
 * assinantes" quando o servidor não liberou. A tela nunca decide acesso: o que
 * não veio na resposta não existe aqui.
 */
export function LessonContent({
  aula,
  comoAdmin,
  temArquivos,
}: {
  aula: PaginaDaAula["aula"];
  comoAdmin: boolean;
  /** A aula tem arquivos (da lista do curso): na prévia grátis eles existem, mas não vêm. */
  temArquivos: boolean;
}) {
  const t = useT();

  if (!aula.liberada) {
    return (
      <div role="status" className={QUADRO}>
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur border border-border/50">
          <Lock className="size-6 text-muted-foreground/80" aria-hidden="true" />
        </div>
        <p className="text-lg font-medium tracking-tight text-foreground">
          {t.aula.paraAssinantes}
        </p>
      </div>
    );
  }

  if (aula.kind === LessonKind.VIDEO) {
    return aula.playerUrl ? (
      <div className="w-full bg-black">
        <BunnyPlayer src={aula.playerUrl} title={aula.title} />
      </div>
    ) : (
      <div className={QUADRO}>
        <p className="text-muted-foreground">{t.aula.semVideo}</p>
      </div>
    );
  }

  const arquivos = aula.arquivos ?? [];
  return (
    <article className="mx-auto max-w-[800px] space-y-12 py-6">
      <Suspense fallback={<p className="text-muted-foreground animate-pulse">{t.aula.carregando}</p>}>
        <MarkdownText texto={aula.texto ?? ""} permitidos={ELEMENTOS_DA_AULA} className="text-lg leading-relaxed text-foreground/90" />
      </Suspense>
      {(arquivos.length > 0 || (temArquivos && !aula.arquivosLiberados)) && (
        <section className="space-y-6 border-t border-border/40 pt-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t.aula.recursosDaAula}</h2>
          {aula.arquivosLiberados ? (
            <ListaDeArquivos lessonId={aula.id} arquivos={arquivos} comoAdmin={comoAdmin} />
          ) : (
            // Na prévia grátis o visitante só assiste (decisão do operador, 29/09/2026).
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">{t.aula.recursosSoAssinantes}</p>
            </div>
          )}
        </section>
      )}
    </article>
  );
}
