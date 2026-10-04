import { useRef } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { haQuantoTempo } from "@/lib/legendas";

/**
 * UMA LINHA da tela Legendas — a apresentação ou uma aula de vídeo (como a tela
 * da Udemy, decisões do operador de 04/10/2026). O estado da legenda, há quanto
 * tempo foi enviada, e as ações: Enviar (ou Substituir), Baixar e Excluir. Sem
 * vídeo, não há onde pôr legenda: a linha pede o vídeo e não tem ações.
 */
export function CaptionRow({
  titulo,
  dono,
  temVideo,
  legenda,
  ocupado,
  aoEnviar,
  aoExcluir,
}: {
  titulo: string;
  dono: api.DonoDaLegenda;
  temVideo: boolean;
  legenda: api.LegendaNaTela | null;
  ocupado: boolean;
  aoEnviar: (arquivo: File) => void;
  aoExcluir: () => void;
}) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const estado = !temVideo
    ? { texto: "Envie o vídeo primeiro", Icone: Circle, cor: "text-muted-foreground" }
    : !legenda
      ? { texto: "Sem legenda", Icone: Circle, cor: "text-muted-foreground" }
      : legenda.precisaReenviar
        ? { texto: "Envie a legenda de novo", Icone: AlertCircle, cor: "text-destructive" }
        : { texto: "Legenda enviada", Icone: CheckCircle2, cor: "text-primary" };

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/60 py-4">
      <estado.Icone className={`size-5 shrink-0 ${estado.cor}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 font-medium text-foreground">{titulo}</span>
      <span className={`w-48 text-sm ${estado.cor}`}>{estado.texto}</span>
      <span className="w-28 text-sm text-muted-foreground">{legenda ? haQuantoTempo(legenda.enviadaEm) : ""}</span>
      {temVideo && (
        <div className="flex items-center gap-2">
          <input
            ref={arquivoRef}
            type="file"
            accept=".vtt,text/vtt"
            className="hidden"
            aria-label={`Arquivo da legenda: ${titulo}`}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) aoEnviar(arquivo);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={ocupado}
            aria-label={`${legenda ? "Substituir" : "Enviar"} a legenda: ${titulo}`}
            onClick={() => arquivoRef.current?.click()}
          >
            {legenda ? "Substituir" : "Enviar"}
          </Button>
          {legenda && (
            <>
              <Button asChild size="sm" variant="ghost">
                <a href={api.enderecoDaLegenda(dono)} download aria-label={`Baixar a legenda: ${titulo}`}>
                  Baixar
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={ocupado}
                aria-label={`Excluir a legenda: ${titulo}`}
                onClick={() => {
                  if (window.confirm(`Excluir a legenda de "${titulo}"?`)) aoExcluir();
                }}
              >
                Excluir
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
