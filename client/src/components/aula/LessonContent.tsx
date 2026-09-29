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

const QUADRO = "flex aspect-video w-full items-center justify-center rounded-2xl border border-border/60 bg-muted p-6 text-center";

/**
 * O CONTEÚDO da aula aberta: o player grande (aula de vídeo), o texto no centro
 * com os recursos embaixo (aula de texto — o print 03 do operador), ou "para
 * assinantes" quando o servidor não liberou. A tela nunca decide acesso: o que
 * não veio na resposta não existe aqui.
 */
export function LessonContent({ aula, comoAdmin }: { aula: PaginaDaAula["aula"]; comoAdmin: boolean }) {
  const t = useT();

  if (!aula.liberada) {
    return (
      <div role="status" className={QUADRO}>
        <p className="flex items-center gap-2 font-medium">
          <Lock className="size-4" aria-hidden="true" />
          {t.aula.paraAssinantes}
        </p>
      </div>
    );
  }

  if (aula.kind === LessonKind.VIDEO) {
    return aula.playerUrl ? (
      <BunnyPlayer src={aula.playerUrl} title={aula.title} />
    ) : (
      <div className={QUADRO}>
        <p className="text-muted-foreground">{t.aula.semVideo}</p>
      </div>
    );
  }

  const arquivos = aula.arquivos ?? [];
  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <Suspense fallback={<p className="text-muted-foreground">{t.aula.carregando}</p>}>
        <MarkdownText texto={aula.texto ?? ""} permitidos={ELEMENTOS_DA_AULA} className="text-base leading-relaxed" />
      </Suspense>
      {arquivos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t.aula.recursosDaAula}</h2>
          <ListaDeArquivos lessonId={aula.id} arquivos={arquivos} comoAdmin={comoAdmin} />
        </section>
      )}
    </article>
  );
}
