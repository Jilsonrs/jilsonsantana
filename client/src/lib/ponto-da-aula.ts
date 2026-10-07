import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pontoUtil } from "@jilson/core";
import * as api from "@/lib/api";
import { deveTentarDeNovo } from "@/lib/tentar-de-novo";
import { agendarNaSaida, type EnvioAgendado } from "@/lib/envio-na-saida";
import { chaveDaPaginaDaAula } from "@/lib/pagina-da-aula";

// ONDE A PESSOA PAROU, na tela (Bloco AULA, etapa 2 — plano aprovado pelo operador em
// 06/10/2026). O ponto do vídeo e a aula em que a pessoa está vão para a CONTA — não
// mais para o navegador —, e é por eles que ela volta, no mesmo aparelho ou em outro,
// amanhã ou daqui a um ano, à mesma aula, no mesmo segundo, TOCANDO (o "pausou, volta
// pausado" de 05/10 foi revogado pelo operador em 06/10). Quando grava:
//   - ao ABRIR a aula (vídeo ou texto): é o que diz em que aula a pessoa entra quando
//     volta ao curso;
//   - a cada 15 s de vídeo andando, e na PAUSA, na hora;
//   - ao SAIR da aula para outra tela do site: o último ponto;
//   - ao FECHAR a aba ou trocar de app: o envio agendado (`envio-na-saida.ts`);
//   - no FIM do vídeo: vazio (viu até o fim).
// Os envios vão em FILA, um depois do outro, e o servidor os recebe na ordem em que o
// vídeo andou — a pausa que o player avisa logo antes do fim não pode chegar depois
// do "viu até o fim".

/** De quantos em quantos segundos de vídeo o ponto é gravado enquanto toca. */
export const PASSO_DA_GRAVACAO = 15;
/** O envio da saída é refeito com o ponto novo a cada tanto de vídeo andado. */
const PASSO_DO_AGENDAMENTO = 2;

const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/** Grava insistindo, como as outras gravações do aluno: só queda de rede ou 5xx (06/10/2026). */
async function gravarInsistindo(lessonId: number, segundos: number | null, comoAdmin: boolean): Promise<void> {
  for (let falhas = 0; ; falhas++) {
    try {
      await api.gravarPonto(lessonId, segundos, comoAdmin);
      return;
    } catch (erro) {
      if (!deveTentarDeNovo(falhas, erro)) return;
      await espera(1000 * 2 ** falhas);
    }
  }
}

const PREFIXO_ANTIGO = "jilson:ponto-da-aula:";
let limpouOAntigo = false;
/** O ponto que morava no navegador (05/10/2026) não serve mais: sai, uma vez por visita. */
function limparPontosAntigos(): void {
  if (limpouOAntigo) return;
  limpouOAntigo = true;
  try {
    const antigas = Object.keys(window.localStorage).filter((chave) => chave.startsWith(PREFIXO_ANTIGO));
    antigas.forEach((chave) => window.localStorage.removeItem(chave));
  } catch {
    // Sem armazenamento: não há o que limpar.
  }
}

/** O que o player avisa e a gravação do ponto ouve. */
export type OuvintesDoPonto = {
  aoAndar: (segundos: number, duracao: number) => void;
  aoPausar: (segundos: number) => void;
  aoTocar: () => void;
  aoTerminar: () => void;
};

type GravacaoDaAula = {
  andou: (segundos: number, duracao: number) => void;
  pausou: (segundos: number) => void;
  tocou: () => void;
  terminou: () => void;
};

/**
 * Grava o ponto da aula aberta. `ativo`: logado e com a aula liberada — o visitante e
 * a aula trancada não gravam nada. `comecarEm`: o ponto com que a aula abriu (o do
 * servidor), lido uma vez, ao abrir.
 */
export function usePontoDaAula({
  lessonId,
  comoAdmin,
  ativo,
  video,
  comecarEm,
}: {
  lessonId: number | null;
  comoAdmin: boolean;
  ativo: boolean;
  /** A aula é de vídeo (texto e quiz não têm ponto). */
  video: boolean;
  comecarEm: number | null;
}): OuvintesDoPonto {
  const queryClient = useQueryClient();
  const gravacao = useRef<GravacaoDaAula | null>(null);
  const ouvintes = useRef<OuvintesDoPonto>({
    aoAndar: (segundos, duracao) => gravacao.current?.andou(segundos, duracao),
    aoPausar: (segundos) => gravacao.current?.pausou(segundos),
    aoTocar: () => gravacao.current?.tocou(),
    aoTerminar: () => gravacao.current?.terminou(),
  });

  // Efeito: gravar é conversar com o servidor, e saber que a página escondeu é ouvir o
  // navegador. Recomeça a cada aula aberta; o `comecarEm` é lido só ao abrir.
  useEffect(() => {
    if (!ativo || lessonId === null) return;
    limparPontosAntigos();
    const endereco = api.enderecoDoPonto(lessonId, comoAdmin);
    let ultimo: number | null = video ? (comecarEm ?? 0) : null;
    let duracao: number | null = null;
    let gravado: number | null = ultimo;
    let terminou = false;
    let fila: Promise<void> = Promise.resolve();
    let saida: EnvioAgendado | null = null;
    let agendadoCom: number | null = null;

    const gravar = (segundos: number | null) => {
      gravado = segundos;
      fila = fila.then(() => gravarInsistindo(lessonId, segundos, comoAdmin));
    };
    // O envio da saída sempre com o último ponto: o anterior é desfeito.
    const agendar = (segundos: number | null) => {
      saida?.cancelar();
      saida = agendarNaSaida(endereco, { segundos });
      agendadoCom = segundos;
    };

    // Abrir a aula: "estou aqui" — o vídeo no ponto em que abre; o texto, sem ponto.
    gravar(ultimo);
    if (video) agendar(ultimo);

    // Voltou para a página depois de escondê-la: no Safari e no Firefox o envio da
    // saída já saiu, e precisa ser agendado de novo.
    const aoMudarDeVisibilidade = () => {
      if (document.visibilityState === "visible" && video && !terminou && saida?.enviado()) agendar(ultimo);
    };
    document.addEventListener("visibilitychange", aoMudarDeVisibilidade);

    gravacao.current = {
      // O player avisa o tempo com casas decimais (17,43 s); o ponto vai em segundos
      // inteiros (defeito achado no teste do operador, 07/10/2026).
      andou: (tempo, d) => {
        if (!video || terminou) return;
        const segundos = Math.floor(tempo);
        ultimo = segundos;
        duracao = d;
        if (gravado === null || Math.abs(segundos - gravado) >= PASSO_DA_GRAVACAO) {
          gravar(segundos);
          agendar(segundos);
        } else if (agendadoCom === null || Math.abs(segundos - agendadoCom) >= PASSO_DO_AGENDAMENTO || saida?.enviado()) {
          agendar(segundos);
        }
      },
      pausou: (tempo) => {
        if (!video || terminou) return;
        const segundos = Math.floor(tempo);
        ultimo = segundos;
        gravar(segundos);
        agendar(segundos);
      },
      // Tocou de novo depois do fim (rever a última aula): o ponto volta a valer.
      tocou: () => {
        terminou = false;
      },
      terminou: () => {
        if (!video || terminou) return;
        terminou = true;
        ultimo = null;
        gravar(null);
        agendar(null);
      },
    };

    return () => {
      document.removeEventListener("visibilitychange", aoMudarDeVisibilidade);
      gravacao.current = null;
      if (!video) return;
      // Saiu da aula para outra tela do site: o último ponto, se mudou.
      const final = ultimo;
      if (final !== gravado) gravar(final);
      // Gravado pelo caminho normal, o envio da saída não precisa mais sair.
      const ultimaSaida = saida;
      void fila.then(() => ultimaSaida?.cancelar());
      // E a memória da tela recebe o ponto: quem volta a esta aula na mesma visita
      // abre nele, e não no que a página tinha quando abriu.
      queryClient.setQueryData<api.PaginaDaAula>(chaveDaPaginaDaAula(lessonId, comoAdmin), (pagina) =>
        pagina && pagina.aula.id === lessonId ? { ...pagina, aula: { ...pagina.aula, ponto: pontoUtil(final, duracao) } } : pagina,
      );
    };
    // `comecarEm` fica de fora de propósito: o ponto do servidor vale só ao ABRIR;
    // uma busca nova da página (trocar de aba) não pode reabrir a gravação.
  }, [lessonId, comoAdmin, ativo, video, queryClient]);

  return ouvintes.current;
}
