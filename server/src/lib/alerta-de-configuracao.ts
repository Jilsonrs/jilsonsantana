// A COBRANÇA SEM CONFIGURAÇÃO, NUM PEDIDO QUE NÃO PEDE LOGIN (revisão do grupo 2 da 4.9b, 30/10/2026): com uma variável da
// Stripe faltando, a rota responde 503 e alerta — mas o pedido é anônimo (as rotas sem login, o endereço de avisos), e um
// robô repetiria o alerta à vontade, gastando a reserva da cobrança da cópia (`monitor.ts`) e calando o "pagante
// trancado" do dia. A mesma linha alerta no máximo uma vez a cada 15 min por cópia; o resto fica no registro. Por cópia,
// de propósito (CLAUDE.md → Server): protege a cota de alertas, que também é por cópia.

/** O intervalo mínimo entre dois alertas da mesma linha de configuração ausente, por cópia. */
export const INTERVALO_DO_ALERTA_DE_CONFIGURACAO = 15 * 60_000;
const alertadaEm = new Map<string, number>();

/** Alerta a linha (com a etiqueta), ou só a registra se ela já alertou há menos de 15 min. O relógio que volta não cala. */
export function alertarConfiguracaoAusente(linha: string, agora: number = Date.now()): void {
  const antes = alertadaEm.get(linha);
  if (antes === undefined || agora < antes || agora - antes >= INTERVALO_DO_ALERTA_DE_CONFIGURACAO) {
    alertadaEm.set(linha, agora);
    console.error(linha);
    return;
  }
  console.warn(linha);
}
