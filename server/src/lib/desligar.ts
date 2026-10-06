import type { Server } from "node:http";

// A TROCA DE SERVIDOR NA PUBLICAÇÃO (06/10/2026). A cada publicação a Railway liga
// o servidor novo e manda ao antigo o aviso de desligar (SIGTERM); o tempo até
// desligá-lo à força é o `drainingSeconds` do `railway.json` (o padrão dela é 0).
// Sem isto, um pedido que estava no meio — marcar a aula como concluída, salvar o
// curso — era cortado no instante da troca.

/**
 * Para de aceitar conexões novas, deixa terminar os pedidos em andamento e só
 * então chama `aoTerminar`. (Desde o Node 19, o `close()` também fecha as
 * conexões paradas, então elas não seguram o desligamento.)
 */
export function desligarComCalma(servidor: Server, aoTerminar: () => void): void {
  servidor.close(() => aoTerminar());
}
