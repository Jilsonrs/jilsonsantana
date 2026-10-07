import { useEffect, useRef, useState } from "react";
import { PONTO_COMECO, pontoUtil } from "@jilson/core";
import { ouvirPlayer } from "@/lib/player-do-bunny";

/**
 * O player do Bunny Stream, num quadro 16:9. O endereço vem SEMPRE do servidor
 * (derivado lá, nunca montado aqui), então este componente não conhece chave,
 * biblioteca nem token. A tela só acrescenta ONDE COMEÇAR (`t`, parâmetro de embed
 * do Stream, fora do token). Tocar sozinho ou não também vem do servidor: a aula
 * toca, a apresentação abre pausada (03/10/2026) — aqui nunca se muda isso.
 *
 * `referrerPolicy="strict-origin-when-cross-origin"` é exigência do Bunny: com
 * "Block Direct URL File Access" ligado na biblioteca, uma política mais estrita
 * no site faz o Bunny ler o acesso como direto e recusar o vídeo (bunny.md §7).
 */
/** O vídeo do endereço, sem o token e a validade, que mudam a cada resposta do servidor. */
function videoDoEndereco(src: string): string {
  return src.split("?")[0];
}

/**
 * O endereço do player abrindo no ponto: `t=<segundos>s` (formato da doc do Bunny
 * Stream). Antes do começo útil, ou sem ponto, o endereço como veio do servidor.
 */
function enderecoNoPonto(src: string, segundos: number | null): string {
  if (segundos === null || segundos < PONTO_COMECO) return src;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  url.searchParams.set("t", `${Math.floor(segundos)}s`);
  return url.toString();
}

/**
 * O ENDEREÇO VENCIDO (decisão do operador, 06/10/2026: "se expirar, recarrega a
 * aula"). O endereço assinado vale 24 h (`expires`, em segundos); a doc do Bunny diz
 * que abrir o player com ele vencido dá 403. Uma aba aberta de um dia para o outro
 * ficaria com ele: então, um pouco antes de vencer — ou se a pessoa der play num
 * vencido —, a aula pede um endereço novo ao servidor e o player recarrega no
 * mesmo ponto.
 */
const FOLGA_DO_VENCIMENTO = 10 * 60;

/** Quando o endereço vence (segundos), ou `null` se ele não disser. */
function vencimento(endereco: string): number | null {
  try {
    const expira = Number(new URL(endereco).searchParams.get("expires"));
    return Number.isFinite(expira) && expira > 0 ? expira : null;
  } catch {
    return null;
  }
}

/** O endereço já venceu (ou vence nos próximos minutos)? Sem `expires`, nunca. */
function venceu(endereco: string, agora = Date.now()): boolean {
  const expira = vencimento(endereco);
  return expira !== null && agora / 1000 >= expira - FOLGA_DO_VENCIMENTO;
}

/** Depois de pedir um endereço novo, quanto esperar antes de pedir outra vez (se o primeiro pedido falhou). */
const INTERVALO_ENTRE_PEDIDOS = 30_000;

export function BunnyPlayer({
  src,
  title,
  comecarEm = null,
  aoConcluir,
  aoTerminar,
  aoAndar,
  aoPausar,
  aoTocar,
  aoVencer,
}: {
  src: string;
  title: string;
  /**
   * De que segundo o vídeo abre: o ponto de quem assiste, guardado na conta (Bloco
   * AULA, 06/10/2026). Vazio, do começo. O vídeo de apresentação não tem.
   */
  comecarEm?: number | null;
  /**
   * Chamado UMA vez quando o aluno chega a 90% do vídeo (Fase 5, decisão do
   * operador de 03/10/2026).
   */
  aoConcluir?: () => void;
  /** O vídeo terminou: a página da aula grava "viu até o fim" e abre a próxima (05/10/2026). */
  aoTerminar?: () => void;
  /** O vídeo andou: a página da aula grava o ponto (Bloco AULA). */
  aoAndar?: (segundos: number, duracao: number) => void;
  /** Pausou: a página da aula grava o ponto na hora. */
  aoPausar?: (segundos: number) => void;
  /** Começou ou voltou a tocar. */
  aoTocar?: () => void;
  /**
   * O endereço está vencendo: peça um novo ao servidor (06/10/2026). Quando ele
   * chegar no `src`, o player troca, no mesmo ponto. Sem ele, nada é renovado.
   */
  aoVencer?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // O último ponto que o player avisou, do vídeo em que avisou: é nele que o player
  // recarrega quando o endereço vence.
  const ultimoPonto = useRef<{ video: string; segundos: number; duracao: number } | null>(null);
  /** Onde recomeçar ESTE vídeo: o ponto que ele já andou aqui, ou o que veio da conta. */
  const pontoAtual = (endereco: string): number | null => {
    const ultimo = ultimoPonto.current;
    return ultimo && ultimo.video === videoDoEndereco(endereco) ? pontoUtil(ultimo.segundos, ultimo.duracao) : comecarEm;
  };
  // O ENDEREÇO FICA enquanto o vídeo for o mesmo (operador, 03/10/2026: trocar de
  // aba não pode recomeçar o vídeo). O servidor assina de novo a cada busca, com
  // token e validade novos; trocar o `src` recarregaria o player do zero. Só um
  // vídeo DIFERENTE troca o endereço — começando no ponto que veio com ele.
  const [endereco, setEndereco] = useState(() => enderecoNoPonto(src, comecarEm));
  if (videoDoEndereco(src) !== videoDoEndereco(endereco)) setEndereco(enderecoNoPonto(src, comecarEm));
  // O MESMO vídeo só troca de endereço quando o que está no player venceu e o
  // servidor mandou um que vale: recarrega no ponto em que estava.
  else if (venceu(endereco) && !venceu(src)) setEndereco(enderecoNoPonto(src, pontoAtual(src)));
  // As funções mais recentes, sem voltar a ouvir o player a cada desenho da tela.
  const aoConcluirRef = useRef(aoConcluir);
  aoConcluirRef.current = aoConcluir;
  const aoTerminarRef = useRef(aoTerminar);
  aoTerminarRef.current = aoTerminar;
  const aoAndarRef = useRef(aoAndar);
  aoAndarRef.current = aoAndar;
  const aoPausarRef = useRef(aoPausar);
  aoPausarRef.current = aoPausar;
  const aoTocarRef = useRef(aoTocar);
  aoTocarRef.current = aoTocar;
  const aoVencerRef = useRef(aoVencer);
  aoVencerRef.current = aoVencer;
  const renova = aoVencer !== undefined;
  // Um pedido por vez: o play avisa várias vezes por segundo, e cada pedido novo
  // cancelaria o anterior antes de ele chegar.
  const ultimoPedido = useRef(0);
  const pedirEnderecoNovo = () => {
    if (Date.now() - ultimoPedido.current < INTERVALO_ENTRE_PEDIDOS) return;
    ultimoPedido.current = Date.now();
    aoVencerRef.current?.();
  };
  const pedirRef = useRef(pedirEnderecoNovo);
  pedirRef.current = pedirEnderecoNovo;

  // Efeito: o relógio até o endereço vencer é do navegador, fora do React.
  useEffect(() => {
    const expira = vencimento(endereco);
    if (!renova || expira === null) return;
    const espera = Math.max(0, (expira - FOLGA_DO_VENCIMENTO) * 1000 - Date.now());
    // O `setTimeout` não aceita mais que ~24,8 dias; o endereço vale 24 h.
    const relogio = window.setTimeout(() => pedirRef.current(), Math.min(espera, 2 ** 31 - 1));
    return () => window.clearTimeout(relogio);
  }, [endereco, renova]);
  const ouvir = aoConcluir !== undefined || aoTerminar !== undefined || aoAndar !== undefined || aoPausar !== undefined || renova;

  // Efeito: ouvir o player é conversar com o iframe do Bunny, fora do React.
  useEffect(() => {
    if (!ouvir || !iframeRef.current) return;
    const video = videoDoEndereco(endereco);
    // Depois do fim, nenhum ponto volta a ser avisado (um último aviso de tempo
    // chegando atrasado gravaria o fim, e a aula reabriria no fim) — até a pessoa
    // dar play de novo, para rever.
    let terminou = false;
    // Play (ou o vídeo andando) num endereço vencido: o relógio pode atrasar com a aba em segundo plano.
    const conferirVencimento = () => {
      if (venceu(endereco)) pedirRef.current();
    };
    return ouvirPlayer(iframeRef.current, {
      aoConcluir: () => aoConcluirRef.current?.(),
      aoTerminar: () => {
        terminou = true;
        aoTerminarRef.current?.();
      },
      aoAndar: (segundos, duracao) => {
        conferirVencimento();
        if (terminou) return;
        ultimoPonto.current = { video, segundos, duracao };
        aoAndarRef.current?.(segundos, duracao);
      },
      aoPausar: (segundos) => {
        if (!terminou) aoPausarRef.current?.(segundos);
      },
      aoTocar: () => {
        conferirVencimento();
        terminou = false;
        aoTocarRef.current?.();
      },
    });
  }, [endereco, ouvir]);

  return (
    <div className="aspect-video w-full overflow-hidden bg-muted">
      {/* Uma moldura NOVA a cada endereço (`key` — Bloco AULA, 07/10/2026): trocar o
          `src` de uma moldura já carregada cria uma entrada no histórico do navegador,
          e o Voltar trocaria só o vídeo, deixando o título da aula (medido no Chrome). */}
      <iframe
        key={endereco}
        ref={iframeRef}
        src={endereco}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="h-full w-full border-0"
      />
    </div>
  );
}
