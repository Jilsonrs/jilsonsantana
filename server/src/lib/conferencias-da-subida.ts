import { conferirFusoDoBanco } from "./prisma.js";
import { conferirCobrancaNaSubida } from "./conferencia-da-cobranca.js";

// AS CONFERÊNCIAS DA SUBIDA RODAM ANTES DE ABRIR A PORTA (P128 — decisão do operador, 30/10/2026; `index.ts`). No Cloud
// Run o processador é dado durante a subida (até a porta abrir) e durante cada pedido; entre pedidos, quase nada.
// Rodando logo depois de abrir, sem pedido nenhum, a conferência do fuso do banco esgotava o tempo da conexão em 7 de 11
// subidas (de 27 a 30/10/2026), e cada falha virava um alerta à toa — e a da cobrança roda do mesmo jeito. Cada
// conferência tem um TETO: um banco ou uma Stripe lenta atrasa a subida em no máximo isso (a espera do Google na subida
// é de 240 s), e o site sobe do mesmo jeito. Nunca lança.

/** O teto de cada conferência da subida. */
export const TETO_DA_CONFERENCIA_NA_SUBIDA_EM_MS = 15_000;

/** Uma conferência: o que ela faz e a linha de alerta da falha (com a etiqueta). */
export type ConferenciaDaSubida = { nome: string; rodar: () => Promise<unknown>; falhou: string };

/** Roda a conferência com o teto: passou dele, fica no registro, e a subida segue. Nunca lança. */
export async function comTeto({ nome, rodar, falhou }: ConferenciaDaSubida, tetoEmMs: number = TETO_DA_CONFERENCIA_NA_SUBIDA_EM_MS): Promise<void> {
  // A tarefa nunca rejeita (a falha vira o valor): assim a que terminar depois do teto não escapa sem tratamento.
  const tarefa = rodar().then(
    () => ({ erro: null }),
    (erro: unknown) => ({ erro: erro instanceof Error ? erro.message : String(erro) }),
  );
  let relogio: NodeJS.Timeout | undefined;
  const teto = new Promise<"teto">((acabou) => {
    relogio = setTimeout(() => acabou("teto"), tetoEmMs);
  });
  const fim = await Promise.race([tarefa, teto]);
  clearTimeout(relogio);
  if (fim === "teto") {
    console.warn(`[api] subida: a conferência ${nome} passou de ${tetoEmMs / 1000} s — o site sobe sem esperar por ela`);
    tarefa.then(
      (tarde) => {
        if (tarde.erro !== null) console.warn(`[api] subida: a conferência ${nome} falhou depois do teto: ${tarde.erro}`);
      },
      () => {},
    );
    return;
  }
  if (fim.erro !== null) console.error(`${falhou}: ${fim.erro}`);
}

/** As conferências da subida, uma depois da outra, cada uma com o teto; a da cobrança, só em produção. */
export async function conferirNaSubida(emProducao: boolean, tetoEmMs: number = TETO_DA_CONFERENCIA_NA_SUBIDA_EM_MS): Promise<void> {
  // O fuso do banco (Prisma 7: o adaptador do `pg` lê as datas como UTC — `lib/prisma.ts`). O motivo vai DENTRO do
  // texto: com o erro como segundo argumento, o Sentry guardaria só o erro, sem a etiqueta, e o alerta seria descartado.
  await comTeto({ nome: "do fuso do banco", rodar: () => conferirFusoDoBanco(), falhou: "[api] não consegui conferir o fuso do banco" }, tetoEmMs);
  // A cobrança (E4 da revisão ampla, 29/10/2026 — `lib/conferencia-da-cobranca.ts`): as chaves da Stripe no mesmo modo,
  // e o endereço de avisos ligado com todos os avisos que o site trata. Só em produção: em dev os avisos chegam pelo
  // `stripe listen`, sem endereço cadastrado.
  if (emProducao) await comTeto({ nome: "da cobrança", rodar: () => conferirCobrancaNaSubida(), falhou: "[stripe] subida: a conferência da cobrança falhou" }, tetoEmMs);
}
