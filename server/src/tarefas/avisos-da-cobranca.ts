import "../ambiente.js";
import { esvaziarMonitor, ligarMonitor } from "../lib/monitor.js";

// A RODADA DE HORA EM HORA DOS E-MAILS DA COBRANÇA (Fase 4, etapa 4.7, passo 7b — decisão do
// operador, 28/10/2026: "2 e-mails, com agendador"). É o que o Cloud Run Job `jilson-prod-avisos`
// executa, com a MESMA imagem e a mesma conta do site, quando o Cloud Scheduler manda — sem porta na
// internet, sem senha nova: quem pode executar o job é só a conta do agendador (CLAUDE.md →
// *Background Jobs*). Roda a conferência dos avisos da Stripe (`lib/avisos-perdidos.ts`, E1 da 4.9b), depois
// `rodadaDosAvisos()` (`lib/avisos-da-assinatura.ts`) e, por último, a de quem não terminou de assinar — o lembrete e a
// limpeza dos 7 dias (`lib/quem-nao-terminou.ts`, etapa 4.7, passo 9) —, e SAI.
// O alerta liga ANTES de carregar o resto (por isso o `import()` depois): uma falha ao carregar — o
// banco sem endereço, por exemplo — já o encontra ligado. Termina com `process.exit`: as ligações com
// o banco e o Sentry seguram o processo aberto, e o job pagaria o tempo parado.
// Comando: `node server/dist/tarefas/avisos-da-cobranca.js` (na raiz da imagem).

const producao = process.env.NODE_ENV === "production";
ligarMonitor({ dsn: process.env.SENTRY_DSN, producao, versao: null });

let codigo = 0;
try {
  const { PRAZO_DA_RODADA_EM_MS, rodadaDosAvisos } = await import("../lib/avisos-da-assinatura.js");
  const { conferirAvisosPerdidos } = await import("../lib/avisos-perdidos.js");
  const { conferirAtivasVencidas, ehHoraDaConferenciaDasAtivas } = await import("../lib/ativas-vencidas.js");
  const { MARGEM_DA_ULTIMA_FICHA_EM_MS, rodadaDeQuemNaoTerminou } = await import("../lib/quem-nao-terminou.js");
  const { prisma } = await import("../lib/prisma.js");
  try {
    // Primeiro, os avisos da Stripe que o site não processou (E1 da revisão ampla da cobrança, 29/10/2026 —
    // `lib/avisos-perdidos.ts`): é deles que saem o espelho certo e os próprios e-mails da cobrança.
    const inicio = Date.now();
    const conferencia = await conferirAvisosPerdidos();
    console.info(`[avisos] a conferência dos avisos da Stripe terminou: ${conferencia.conferidos} conferido(s), ${conferencia.perdidos} sem registro, ${conferencia.processados} processado(s) agora, ${conferencia.falhas} com falha, ${conferencia.adiados} adiado(s) para a próxima, ${conferencia.formatoAntigo} de fatura relida(s) pela API (formato antigo)`);
    if (conferencia.falhas > 0) codigo = 1;
    // Uma vez por dia, as assinaturas ativas com o período vencido (E6 — `lib/ativas-vencidas.ts`).
    if (ehHoraDaConferenciaDasAtivas(new Date())) {
      const ativas = await conferirAtivasVencidas();
      console.info(`[avisos] a conferência das assinaturas ativas vencidas terminou: ${ativas.conferidas} conferida(s), ${ativas.semPeriodoPago} sem período pago, ${ativas.encerradas} encerrada(s) na Stripe, ${ativas.renovadas} renovada(s), ${ativas.ocupadas} ocupada(s), ${ativas.desconhecidas} que a Stripe não conhece, ${ativas.falhas} com falha, ${ativas.adiadas} adiada(s) para amanhã`);
      if (ativas.falhas > 0) codigo = 1;
    }
    // A rodada dos e-mails fica com o resto do prazo: o job tem 5 minutos ao todo (`--task-timeout=300s`).
    const rodada = await rodadaDosAvisos(new Date(), Math.max(PRAZO_DA_RODADA_EM_MS - (Date.now() - inicio), 0));
    console.info(`[avisos] a rodada terminou: ${rodada.conferidas} conferida(s) na Stripe, ${rodada.ocupadas} ocupada(s), ${rodada.desconhecidas} que a Stripe não conhece, ${rodada.adiadas} adiada(s) para a próxima, ${rodada.falhas} com falha`);
    if (rodada.falhas > 0) codigo = 1;
    // Por último, quem não terminou de assinar (etapa 4.7, passo 9): com o que sobrou do prazo, menos a margem da última
    // ficha (a limpeza de uma ficha vai à Stripe algumas vezes, e o job tem 5 minutos ao todo).
    const fichas = await rodadaDeQuemNaoTerminou(new Date(), Math.max(PRAZO_DA_RODADA_EM_MS - MARGEM_DA_ULTIMA_FICHA_EM_MS - (Date.now() - inicio), 0));
    console.info(`[avisos] quem não terminou de assinar: ${fichas.lembretes} lembrete(s), ${fichas.semLembrete} sem lembrete, ${fichas.apagadas} ficha(s) apagada(s), ${fichas.comPagamento} com pagamento (não apagada), ${fichas.outroModo} de outro modo, ${fichas.ocupadas} ocupada(s), ${fichas.falhas} com falha, ${fichas.adiadas} adiada(s) para a próxima`);
    if (fichas.falhas > 0) codigo = 1;
  } finally {
    await prisma.$disconnect();
  }
} catch (erro) {
  console.error(`[avisos] a rodada dos e-mails da cobrança falhou: ${erro instanceof Error ? erro.message : String(erro)}`);
  codigo = 1;
}
await esvaziarMonitor();
process.exit(codigo);
