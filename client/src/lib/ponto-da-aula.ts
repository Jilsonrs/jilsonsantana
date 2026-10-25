import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { deveTentarDeNovo } from "@/lib/tentar-de-novo";
import { agendarNaSaida, type EnvioAgendado } from "@/lib/envio-na-saida";

// ONDE A PESSOA PAROU, na tela (Bloco AULA, etapa 2 — plano aprovado pelo operador em
// 06/10/2026). O ponto do vídeo e a aula em que a pessoa está vão para a CONTA — não
// mais para o navegador —, e é por eles que ela volta, no mesmo aparelho ou em outro,
// amanhã ou daqui a um ano, à mesma aula, no mesmo segundo, TOCANDO (o "pausou, volta
// pausado" de 05/10 foi revogado pelo operador em 06/10). Quando grava:
//   - ao ABRIR a aula (vídeo ou texto): é o que diz em que aula a pessoa entra quando
//     volta ao curso;
//   - a cada 5 s de vídeo andando, e na PAUSA, na hora;
//   - ao SAIR da aula para outra tela do site: o último ponto;
//   - ao FECHAR a aba ou trocar de app: o envio agendado (`envio-na-saida.ts`);
//   - no FIM do vídeo: vazio (viu até o fim).
// Os envios vão em FILA, um depois do outro, e o servidor os recebe na ordem em que o
// vídeo andou — a pausa que o player avisa logo antes do fim não pode chegar depois
// do "viu até o fim".
// O SEGUNDO MAIS NOVO VENCE, entre aparelhos (25/10/2026 — achado do operador: o iPhone
// abria no segundo que a aba dele lembrava e apagava o do computador). A aula abre no
// ponto do SERVIDOR, buscado na hora e depois de a gravação anterior deste aparelho chegar
// (`gravacaoPendente`); a aba não guarda mais o ponto na memória. E a aba que ficou parada
// na aula, quando volta a ser vista, pula para o ponto de outro aparelho se o vídeo estiver
// pausado (`salto`).

/** De quantos em quantos segundos de vídeo o ponto é gravado enquanto toca (15 até 25/10/2026: no iPhone, a pausa às vezes não chega). */
export const PASSO_DA_GRAVACAO = 5;
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

/** A última gravação de cada aula, DESTE aparelho: quem vai buscar a aula espera ela chegar. */
const ultimaGravacao = new Map<number, Promise<void>>();
/** O máximo que a busca da aula espera pela gravação anterior (sem rede, ela insiste por mais tempo). */
const ESPERA_MAXIMA_DA_GRAVACAO = 3000;

/**
 * A gravação desta aula que ESTE aparelho ainda está enviando — esperar por ela leva no
 * máximo 3 s —, ou nada: sem gravação a caminho, a busca da aula sai na hora.
 */
export function gravacaoPendente(lessonId: number): Promise<unknown> | null {
  const pendente = ultimaGravacao.get(lessonId);
  return pendente ? Promise.race([pendente, espera(ESPERA_MAXIMA_DA_GRAVACAO)]) : null;
}

/** A diferença, em segundos, a partir da qual o ponto do servidor é de OUTRO aparelho. */
const DIFERENCA_DE_OUTRO_APARELHO = 2;

/** O pulo pedido ao player: `vez` muda a cada busca da página, para o mesmo segundo pular de novo. */
export type SaltoDoPonto = { lessonId: number; segundos: number; vez: number };

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
  andou: (segundos: number) => void;
  pausou: (segundos: number) => void;
  tocou: () => void;
  terminou: () => void;
  /** O servidor tem um ponto diferente do que este aparelho gravou por último (e nada está a caminho)? */
  difereDoServidor: (segundos: number) => boolean;
};

/**
 * Grava o ponto da aula aberta. `ativo`: logado e com a aula liberada — o visitante e
 * a aula trancada não gravam nada. `comecarEm`: o ponto com que a aula abriu (o do
 * servidor, buscado na hora), lido uma vez, ao abrir. `pontoDoServidor` e `atualizadoEm`:
 * o ponto de cada busca da página — se mudou por OUTRO aparelho, o `salto` pede ao player
 * para ir até ele (o player só pula se estiver pausado).
 */
export function usePontoDaAula({
  lessonId,
  comoAdmin,
  ativo,
  video,
  comecarEm,
  pontoDoServidor,
  atualizadoEm,
}: {
  lessonId: number | null;
  comoAdmin: boolean;
  ativo: boolean;
  /** A aula é de vídeo (texto e quiz não têm ponto). */
  video: boolean;
  comecarEm: number | null;
  pontoDoServidor: number | null;
  atualizadoEm: number;
}): { ouvintes: OuvintesDoPonto; salto: SaltoDoPonto | null } {
  const gravacao = useRef<GravacaoDaAula | null>(null);
  const [salto, setSalto] = useState<SaltoDoPonto | null>(null);
  const ouvintes = useRef<OuvintesDoPonto>({
    aoAndar: (segundos) => gravacao.current?.andou(segundos),
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
    let gravado: number | null = ultimo;
    let terminou = false;
    let pendentes = 0;
    let fila: Promise<void> = ultimaGravacao.get(lessonId) ?? Promise.resolve();
    let saida: EnvioAgendado | null = null;
    let agendadoCom: number | null = null;

    const gravar = (segundos: number | null) => {
      gravado = segundos;
      pendentes += 1;
      const esta = fila.then(() => gravarInsistindo(lessonId, segundos, comoAdmin)).then(() => {
        pendentes -= 1;
        // Chegou, e nada veio depois: não há mais o que esperar.
        if (ultimaGravacao.get(lessonId) === esta) ultimaGravacao.delete(lessonId);
      });
      fila = esta;
      ultimaGravacao.set(lessonId, esta);
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
      andou: (tempo) => {
        if (!video || terminou) return;
        const segundos = Math.floor(tempo);
        ultimo = segundos;
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
      difereDoServidor: (segundos) =>
        video && !terminou && pendentes === 0 && (gravado === null || Math.abs(segundos - gravado) >= DIFERENCA_DE_OUTRO_APARELHO),
    };

    return () => {
      document.removeEventListener("visibilitychange", aoMudarDeVisibilidade);
      gravacao.current = null;
      if (!video) return;
      // Saiu da aula para outra tela do site: o último ponto, se mudou. Quem voltar a esta
      // aula espera esta gravação chegar antes de buscar o ponto (`gravacaoPendente`).
      const final = ultimo;
      if (final !== gravado) gravar(final);
      // Gravado pelo caminho normal, o envio da saída não precisa mais sair.
      const ultimaSaida = saida;
      void fila.then(() => ultimaSaida?.cancelar());
    };
    // `comecarEm` fica de fora de propósito: o ponto do servidor vale só ao ABRIR;
    // uma busca nova da página (trocar de aba) não pode reabrir a gravação.
  }, [lessonId, comoAdmin, ativo, video]);

  // Efeito: cada busca nova da página traz o ponto do servidor; se ele veio de OUTRO
  // aparelho, o player é avisado. Quem sabe o que ESTE aparelho gravou é a gravação,
  // que vive fora do React.
  useEffect(() => {
    if (lessonId === null || pontoDoServidor === null) return;
    if (gravacao.current?.difereDoServidor(pontoDoServidor)) setSalto({ lessonId, segundos: pontoDoServidor, vez: atualizadoEm });
  }, [lessonId, pontoDoServidor, atualizadoEm]);

  return { ouvintes: ouvintes.current, salto: salto?.lessonId === lessonId ? salto : null };
}
