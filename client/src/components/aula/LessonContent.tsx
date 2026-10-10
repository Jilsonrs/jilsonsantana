import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { LessonKind } from "@jilson/core";
import type { PaginaDaAula } from "@/lib/api";
import { useT } from "@/lib/language";
import { TELA_DE_ASSINAR } from "@/lib/assinar";
import { BunnyPlayer } from "@/components/content/BunnyPlayer";
import { Button } from "@/components/ui/button";
import type { OuvintesDoPonto } from "@/lib/ponto-da-aula";
import { ListaDeArquivos } from "./LessonResources";

// A peça do Markdown (~37 KB) só baixa quando uma aula de TEXTO abre: direto, ela
// entraria no pacote que todo aluno baixa (CLAUDE.md → Client).
const MarkdownText = lazy(() => import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })));

// A aula de texto aceita o mesmo que a descrição do curso, mais títulos: é texto
// longo, que o operador organiza em seções.
const ELEMENTOS_DA_AULA = ["p", "strong", "em", "ul", "ol", "li", "br", "h2", "h3"] as const;

const QUADRO = "flex aspect-video w-full flex-col items-center justify-center bg-muted p-8 text-center";

/**
 * O lugar do conteúdo enquanto a aula seguinte carrega (Bloco AULA, 07/10/2026): o
 * topo e a lista do curso ficam na tela, e só aqui aparece o "Carregando…" — no
 * quadro do player (vídeo) ou na largura do texto (texto).
 */
export function LessonContentCarregando({ video }: { video: boolean }) {
  const t = useT();
  return video ? (
    <div aria-busy="true" className={QUADRO}>
      <p className="text-muted-foreground">{t.aula.carregando}</p>
    </div>
  ) : (
    <div aria-busy="true" className="mx-auto max-w-[800px] py-6">
      <p className="text-muted-foreground">{t.aula.carregando}</p>
    </div>
  );
}

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
  aoConcluir,
  aoTerminar,
  ouvintes,
  proximaAulaId,
  legenda,
  renovarVideo,
  podeAssinar,
  reativar,
}: {
  aula: PaginaDaAula["aula"];
  comoAdmin: boolean;
  /** A aula tem arquivos (da lista do curso): na prévia grátis eles existem, mas não vêm. */
  temArquivos: boolean;
  /** Concluir a aula de vídeo ao chegar a 90%. */
  aoConcluir?: () => void;
  /** O vídeo terminou: gravar "viu até o fim" e abrir a próxima aula (05 e 06/10/2026). */
  aoTerminar?: () => void;
  /**
   * Quem ouve o vídeo andar, pausar e tocar: o ponto na conta (Bloco AULA, 06/10/2026) e os
   * eventos do vídeo (Bloco MEDIR, 09/10/2026).
   */
  ouvintes?: Pick<OuvintesDoPonto, "aoAndar" | "aoPausar" | "aoTocar">;
  /** A próxima aula da lista: na aula de texto, o botão "Próxima aula" leva a ela (06/10/2026). Na última, nenhum. */
  proximaAulaId?: number;
  /**
   * A legenda lembrada (Bloco AULA, etapa 6, 07/10/2026): como ela abre — o idioma do
   * curso (ligada) ou `off` (desligada) —, e o que grava quando o aluno muda no CC do player.
   */
  legenda?: { abrirCom: string; aoMudar: (ligada: boolean) => void };
  /** O endereço do vídeo está vencendo: buscar a aula de novo, com um endereço novo (06/10/2026). */
  renovarVideo?: () => void;
  /**
   * Na aula trancada, o botão Assinar (decisão do operador, 09/10/2026) — só para quem está
   * logado: a tela de assinar exige a conta, e o visitante sem login é a etapa 4.7.
   */
  podeAssinar?: boolean;
  /** Quem já foi assinante lê "Reativar assinatura" no botão (decisão do operador, 10/10/2026). */
  reativar?: boolean;
}) {
  const t = useT();

  if (!aula.liberada) {
    return (
      <div role="status" className={QUADRO}>
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-background shadow-sm border border-border/60">
          <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-lg font-medium tracking-tight text-foreground">
          {t.aula.paraAssinantes}
        </p>
        {podeAssinar && (
          <Button asChild className="mt-4">
            <Link to={TELA_DE_ASSINAR}>{reativar ? t.aula.reativar : t.aula.assinar}</Link>
          </Button>
        )}
      </div>
    );
  }

  if (aula.kind === LessonKind.VIDEO) {
    return aula.playerUrl ? (
      <div className="w-full">
        {/* Abre no ponto guardado na conta e sempre tocando (Bloco AULA, 06/10/2026).
            Um player por AULA (`key`): o ponto e os avisos de uma não passam para a outra. */}
        <BunnyPlayer
          key={aula.id}
          src={aula.playerUrl}
          title={aula.title}
          comecarEm={aula.ponto ?? null}
          legenda={legenda?.abrirCom ?? null}
          aoMudarLegenda={legenda?.aoMudar}
          aoConcluir={aoConcluir}
          aoTerminar={aoTerminar}
          aoAndar={ouvintes?.aoAndar}
          aoPausar={ouvintes?.aoPausar}
          aoTocar={ouvintes?.aoTocar}
          aoVencer={renovarVideo}
        />
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
      {/* Aula de texto ainda sem texto: o aviso, como a de vídeo sem vídeo (05/10/2026). */}
      {aula.texto?.trim() ? (
        <Suspense fallback={<p className="text-muted-foreground animate-pulse">{t.aula.carregando}</p>}>
          <MarkdownText texto={aula.texto} permitidos={ELEMENTOS_DA_AULA} className="text-lg leading-relaxed text-foreground/90" />
        </Suspense>
      ) : (
        <p className="text-muted-foreground">{t.aula.semTexto}</p>
      )}
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
      {/* A aula de texto não passa sozinha: a próxima abre no clique — na lista ou
          aqui, no fim do texto (decisão do operador, 06/10/2026: no celular a lista
          fica numa gaveta). Um link de verdade: a versão nova do site entra nele. */}
      {proximaAulaId !== undefined && (
        <div className="flex justify-end">
          <Button asChild>
            <Link to={`/aluno/aula/${proximaAulaId}`}>
              {t.aula.proximaAula}
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}
