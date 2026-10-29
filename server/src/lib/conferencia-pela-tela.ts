import { conferirOCliente, type Sincronia } from "./assinaturas.js";

// A CONFERÊNCIA PEDIDA PELA TELA, QUANDO FALHA (C4 da revisão do grupo 1, 29/10/2026 — plano → etapa 4.9b). A tela de
// depois do pagamento pede a conferência a cada minuto, até 5 vezes por aba (E2). Com a Stripe fora do ar, cada pedido
// viraria um 500 e um alerta `[api]` — e a cota de alertas da cópia (`monitor.ts`) acabaria, calando os que importam
// (o pagante trancado, o Pix sem acesso). Aqui a falha vira registro, e alerta no máximo uma vez a cada 15 min POR
// CÓPIA: o limite protege a cota de alertas da própria cópia, como os do E3 e do E5. Quem pediu recebe a resposta de
// sempre: a pergunta "já tenho acesso?" mostra o resultado, e a próxima conferência (a da tela ou a rodada de hora em
// hora) tenta de novo.

/** O intervalo mínimo entre dois alertas da conferência pedida pela tela que falha, por cópia. */
export const INTERVALO_DO_ALERTA_DA_CONFERENCIA = 15 * 60_000;
let alertouEm: number | null = null;

/**
 * `conferirOCliente` sem nunca falhar para quem pediu: as sincronias feitas, ou `null` quando a conferência falhou
 * (no registro, com o alerta limitado). `quem` vai só para o registro, com ids nossos (a conta ou a ficha).
 */
export async function conferirPelaTela(clienteId: string, quem: string, agora: number = Date.now()): Promise<Sincronia[] | null> {
  try {
    return await conferirOCliente(clienteId);
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : `erro que não é Error (${typeof erro})`;
    // O relógio que volta atrás não cala o alerta para sempre.
    if (alertouEm === null || agora < alertouEm || agora - alertouEm >= INTERVALO_DO_ALERTA_DA_CONFERENCIA) {
      alertouEm = agora;
      console.error(`[stripe] a conferência pedida pela tela de depois do pagamento falhou (${quem}) — ${motivo}; as próximas falhas, por 15 min, ficam só no registro`);
    } else {
      console.warn(`[stripe] a conferência pedida pela tela de depois do pagamento falhou (${quem}) — ${motivo}`);
    }
    return null;
  }
}
