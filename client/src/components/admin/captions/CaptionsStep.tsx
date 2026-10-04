import { CheckCircle2 } from "lucide-react";
import type * as api from "@/lib/api";
import { PageSection } from "@/components/layout/PageLayout";
import { mensagemDoErroDaLegenda, useAlterarLegenda, useLegendas } from "@/lib/legendas";
import type { Aviso } from "@/lib/aviso-flutuante";
import { CaptionRow } from "./CaptionRow";

const NOME_DO_IDIOMA = { pt: "Português", en: "English" } as const;

/**
 * O PASSO LEGENDAS do editor do curso (decisões do operador, 28/09 e 04/10/2026,
 * a partir da tela da Udemy): a apresentação e cada módulo com as suas aulas de
 * vídeo; uma legenda `.vtt` por linha, no idioma do curso; "x de y aulas
 * publicadas com legenda". Enviou ou falhou: a mensagem flutuante do editor.
 */
export function CaptionsStep({ courseId, avisar }: { courseId: number; avisar: (tipo: Aviso["tipo"], texto: string) => void }) {
  const { data, isLoading, isError } = useLegendas(courseId);
  const { enviar, excluir } = useAlterarLegenda(courseId);
  const ocupado = enviar.isPending || excluir.isPending;

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (isError || !data) {
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        Não foi possível carregar as legendas.
      </p>
    );
  }

  // Sem limpar o cache do Bunny, o player pode mostrar a legenda anterior por um
  // tempo (teste no ar, 04/10/2026): a mensagem avisa, em vez de parecer que falhou.
  const comAviso = (frase: string, r: api.ResultadoDaLegenda) =>
    r.cacheLimpo ? frase : `${frase} O player pode mostrar a anterior por algumas horas.`;
  const aoEnviar = (dono: api.DonoDaLegenda) => (arquivo: File) =>
    enviar.mutate(
      { dono, arquivo },
      { onSuccess: (r) => avisar("sucesso", comAviso("Legenda enviada.", r)), onError: (e) => avisar("erro", mensagemDoErroDaLegenda(e)) },
    );
  const aoExcluir = (dono: api.DonoDaLegenda) => () =>
    excluir.mutate(dono, {
      onSuccess: (r) => avisar("sucesso", comAviso("Legenda excluída.", r)),
      onError: (e) => avisar("erro", mensagemDoErroDaLegenda(e)),
    });
  const linha = (titulo: string, dono: api.DonoDaLegenda, temVideo: boolean, legenda: api.LegendaNaTela | null) => (
    <CaptionRow
      key={dono.tipo === "aula" ? dono.id : "apresentacao"}
      titulo={titulo}
      dono={dono}
      temVideo={temVideo}
      legenda={legenda}
      ocupado={ocupado}
      aoEnviar={aoEnviar(dono)}
      aoExcluir={aoExcluir(dono)}
    />
  );

  const { comLegenda, total } = data.contagem;
  const modulos = data.modulos.filter((m) => m.aulas.length > 0);
  const apresentacao = { tipo: "apresentacao", cursoId: courseId } as const;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Legendas em {NOME_DO_IDIOMA[data.idioma]} · {comLegenda} de {total} aulas publicadas com legenda
      </p>
      {total > 0 && comLegenda === total && (
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
          Todas as aulas publicadas têm legenda.
        </p>
      )}

      <PageSection title="Vídeo de apresentação">
        <ul>{linha("Vídeo de apresentação", apresentacao, data.apresentacao.temVideo, data.apresentacao.legenda)}</ul>
      </PageSection>

      {modulos.length === 0 ? (
        <p className="pt-8 text-muted-foreground">Este curso ainda não tem aula de vídeo. Os vídeos entram no passo Conteúdo.</p>
      ) : (
        modulos.map((m) => (
          <PageSection key={m.id} title={m.title}>
            <ul>{m.aulas.map((a) => linha(a.title, { tipo: "aula", id: a.id }, a.temVideo, a.legenda))}</ul>
          </PageSection>
        ))
      )}
    </div>
  );
}
