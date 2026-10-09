// O ENVIO NA SAÍDA DA PÁGINA (Bloco AULA, etapa 2 — plano aprovado pelo operador em
// 06/10/2026). O ponto do vídeo tem que chegar ao servidor também quando a pessoa
// FECHA a aba, recarrega a página ou troca de app no celular — e aí não sobra página
// para esperar resposta. É o padrão do guia modern-web-guidance
// (`full-session-analytics`, consultado em 06/10/2026):
//   - `fetchLater()` (Chrome e Edge 135+): o pedido fica AGENDADO e o próprio
//     navegador o envia quando a página sai — inclusive se ela for descartada em
//     segundo plano;
//   - onde ele não existe (Safari, Firefox): o envio sai quando a página fica
//     ESCONDIDA (`visibilitychange`), com `fetch` + `keepalive`, que sobrevive ao
//     fechamento.
// Nunca `unload`/`beforeunload`: falham no celular e tiram a página do cache de
// "voltar" do navegador.
// É a EXCEÇÃO ao "Axios para HTTP" (CLAUDE.md → Client): o Axios não faz nenhum dos dois.

export type EnvioAgendado = {
  /** Desiste do envio (o ponto mudou, ou já foi gravado por outro caminho). */
  cancelar: () => void;
  /** O navegador já enviou: para o próximo ponto, é preciso agendar de novo. */
  enviado: () => boolean;
};

type FetchLater = (endereco: string, init: RequestInit) => { readonly activated: boolean };

/** Agenda um POST com JSON para sair quando a página sair (ou for escondida). */
export function agendarNaSaida(endereco: string, corpo: unknown): EnvioAgendado {
  const controle = new AbortController();
  const pedido: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    credentials: "same-origin",
  };

  // Seguro: `fetchLater` ainda não está nos tipos do TypeScript; a linha seguinte
  // confere que é uma função antes de chamar.
  const nativo = (globalThis as { fetchLater?: unknown }).fetchLater;
  if (typeof nativo === "function") {
    try {
      const agendado = (nativo as FetchLater)(endereco, { ...pedido, signal: controle.signal });
      return { cancelar: () => controle.abort(), enviado: () => agendado.activated };
    } catch {
      // Cota cheia (o navegador limita o que fica agendado): segue pelo caminho de reserva.
    }
  }

  let enviou = false;
  const aoMudarDeVisibilidade = () => {
    // Só quando a página ESCONDE: agendado com ela já escondida (vídeo tocando em
    // outra aba), espera a próxima vez que ela esconder.
    if (document.visibilityState !== "hidden" || controle.signal.aborted) return;
    parar();
    enviou = true;
    // Sem o sinal de cancelar: o que já saiu termina, mesmo se a pessoa voltar à aba.
    fetch(endereco, { ...pedido, keepalive: true }).catch(() => {
      // Sem rede na saída: o último ponto gravado pelo caminho normal fica valendo.
    });
  };
  const parar = () => document.removeEventListener("visibilitychange", aoMudarDeVisibilidade);
  document.addEventListener("visibilitychange", aoMudarDeVisibilidade);
  return {
    cancelar: () => {
      controle.abort();
      parar();
    },
    enviado: () => enviou,
  };
}

/**
 * Envia JÁ um POST com JSON que sobrevive a fechar a página (`keepalive`), sem esperar
 * resposta. Para o que tem de sair NO MOMENTO em que a página esconde: o "pausou" dos
 * eventos do vídeo (Fase 5, Bloco MEDIR, 09/10/2026), que fecha as horas assistidas quando
 * a aba some com o vídeo tocando — agendar para a saída (como o ponto) contaria a aba
 * escondida. Falhou: fica sem o evento.
 */
export function enviarJa(endereco: string, corpo: unknown): void {
  fetch(endereco, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Sem rede na saída: as horas daquele trecho ficam de fora.
  });
}
