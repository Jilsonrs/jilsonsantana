import "../ambiente.js";
import { esvaziarMonitor, ligarMonitor } from "../lib/monitor.js";

// A RODADA DE HORA EM HORA DOS E-MAILS DA COBRANÇA (Fase 4, etapa 4.7, passo 7b — decisão do
// operador, 28/10/2026: "2 e-mails, com agendador"). É o que o Cloud Run Job `jilson-prod-avisos`
// executa, com a MESMA imagem e a mesma conta do site, quando o Cloud Scheduler manda — sem porta na
// internet, sem senha nova: quem pode executar o job é só a conta do agendador (CLAUDE.md →
// *Background Jobs*). Roda `rodadaDosAvisos()` (`lib/avisos-da-assinatura.ts`) e SAI.
// O alerta liga ANTES de carregar o resto (por isso o `import()` depois): uma falha ao carregar — o
// banco sem endereço, por exemplo — já o encontra ligado. Termina com `process.exit`: as ligações com
// o banco e o Sentry seguram o processo aberto, e o job pagaria o tempo parado.
// Comando: `node server/dist/tarefas/avisos-da-cobranca.js` (na raiz da imagem).

const producao = process.env.NODE_ENV === "production";
ligarMonitor({ dsn: process.env.SENTRY_DSN, producao, versao: null });

let codigo = 0;
try {
  const { rodadaDosAvisos } = await import("../lib/avisos-da-assinatura.js");
  const { prisma } = await import("../lib/prisma.js");
  try {
    const rodada = await rodadaDosAvisos();
    console.info(`[avisos] a rodada terminou: ${rodada.conferidas} conferida(s) na Stripe, ${rodada.ocupadas} ocupada(s), ${rodada.desconhecidas} que a Stripe não conhece, ${rodada.adiadas} adiada(s) para a próxima, ${rodada.falhas} com falha`);
    if (rodada.falhas > 0) codigo = 1;
  } finally {
    await prisma.$disconnect();
  }
} catch (erro) {
  console.error(`[avisos] a rodada dos e-mails da cobrança falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
  codigo = 1;
}
await esvaziarMonitor();
process.exit(codigo);
