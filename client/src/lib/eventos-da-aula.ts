import { useEffect, useRef } from "react";
import type { TipoDeEvento } from "@jilson/core";
import * as api from "@/lib/api";
import { deveTentarDeNovo } from "@/lib/tentar-de-novo";
import { enviarJa } from "@/lib/envio-na-saida";

// OS EVENTOS DO VÍDEO, na tela (Fase 5, Bloco MEDIR, etapa 1 — pedido do operador,
// 09/10/2026). Só GUARDA, para as horas assistidas do cartão do admin (a conta é a etapa
// 2): o tempo entre um "tocou" e o evento seguinte. Por isso o que se guarda descreve o
// tempo em que a pessoa ESTAVA VENDO:
//   - tocou, pausou, terminou: como o player avisa;
//   - a página ESCONDEU com o vídeo tocando (outra aba, outro app, fechou a aba):
//     "pausou" na hora, pelo envio que sobrevive a fechar a aba — a aba escondida não
//     conta como hora assistida; voltou com ele ainda tocando: "tocou";
//   - saiu da aula com o vídeo tocando: "pausou".
// Em FILA, na ordem em que aconteceram (a hora do evento é a do servidor). Insiste como
// as outras gravações do aluno: um evento repetido não muda a conta, porque cada trecho
// vai do "tocou" até o evento SEGUINTE, seja ele qual for.

/** O que o player avisa e os eventos ouvem. */
export type OuvintesDosEventos = {
  aoAndar: (segundos: number) => void;
  aoTocar: () => void;
  aoPausar: (segundos: number) => void;
  aoTerminar: () => void;
};

type GravacaoDosEventos = {
  andou: (segundos: number) => void;
  tocou: () => void;
  pausou: (segundos: number) => void;
  terminou: () => void;
};

const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function guardarInsistindo(lessonId: number, tipo: TipoDeEvento, segundos: number): Promise<void> {
  for (let falhas = 0; ; falhas++) {
    try {
      await api.gravarEvento(lessonId, tipo, segundos);
      return;
    } catch (erro) {
      if (!deveTentarDeNovo(falhas, erro)) return;
      await espera(1000 * 2 ** falhas);
    }
  }
}

/**
 * Guarda os eventos do vídeo da aula aberta. `ativo`: aluno logado (o admin não grava),
 * aula liberada e de VÍDEO — fora disso, nada é guardado.
 */
export function useEventosDaAula({ lessonId, ativo }: { lessonId: number | null; ativo: boolean }): OuvintesDosEventos {
  const gravacao = useRef<GravacaoDosEventos | null>(null);
  const ouvintes = useRef<OuvintesDosEventos>({
    aoAndar: (segundos) => gravacao.current?.andou(segundos),
    aoTocar: () => gravacao.current?.tocou(),
    aoPausar: (segundos) => gravacao.current?.pausou(segundos),
    aoTerminar: () => gravacao.current?.terminou(),
  });

  // Efeito: guardar é conversar com o servidor, e saber que a página escondeu é ouvir o
  // navegador. Recomeça a cada aula aberta.
  useEffect(() => {
    if (!ativo || lessonId === null) return;
    const endereco = api.enderecoDosEventos(lessonId);
    let ultimo = 0;
    // O player está tocando (mesmo com a página escondida).
    let tocando = false;
    // Há um "tocou" guardado sem o evento que fecha o trecho.
    let contando = false;
    let fila: Promise<void> = Promise.resolve();
    const guardar = (tipo: TipoDeEvento, segundos: number) => {
      fila = fila.then(() => guardarInsistindo(lessonId, tipo, segundos));
    };
    const abrir = () => {
      if (contando || document.visibilityState === "hidden") return;
      contando = true;
      guardar("PLAY", ultimo);
    };

    const aoMudarDeVisibilidade = () => {
      if (document.visibilityState === "hidden") {
        if (!contando) return;
        contando = false;
        enviarJa(endereco, { tipo: "PAUSE", segundos: ultimo });
      } else if (tocando) {
        abrir();
      }
    };
    document.addEventListener("visibilitychange", aoMudarDeVisibilidade);

    gravacao.current = {
      andou: (segundos) => {
        ultimo = segundos;
      },
      tocou: () => {
        tocando = true;
        abrir();
      },
      pausou: (segundos) => {
        ultimo = segundos;
        tocando = false;
        if (!contando) return;
        contando = false;
        guardar("PAUSE", segundos);
      },
      terminou: () => {
        tocando = false;
        contando = false;
        guardar("ENDED", ultimo);
      },
    };

    return () => {
      document.removeEventListener("visibilitychange", aoMudarDeVisibilidade);
      gravacao.current = null;
      // Saiu da aula com o vídeo tocando: o trecho fecha aqui.
      if (contando) guardar("PAUSE", ultimo);
    };
  }, [lessonId, ativo]);

  return ouvintes.current;
}
