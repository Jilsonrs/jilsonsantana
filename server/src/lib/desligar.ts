import type { Server } from "node:http";

// A TROCA DE SERVIDOR NA PUBLICAÇÃO (06/10/2026; adaptado ao Cloud Run em 22/10/2026).
// A cada publicação o Cloud Run direciona o tráfego para a instância nova e envia à
// antiga o aviso de desligar (SIGTERM); há 10 segundos de tolerância até o desligamento
// à força. Sem isto, um pedido que estava no meio — marcar a aula como concluída,
// salvar o curso — era cortado no instante da troca.

/**
 * Para de aceitar conexões novas, deixa terminar os pedidos em andamento e só
 * então chama `aoTerminar`. (Desde o Node 19, o `close()` também fecha as
 * conexões paradas, então elas não seguram o desligamento.)
 */
export function desligarComCalma(servidor: Server, aoTerminar: () => void): void {
  servidor.close(() => aoTerminar());
}
