import * as Sentry from "@sentry/node";

// O ALERTA DE ERRO EM PRODUÇÃO (Sentry — decisão do operador, 10/10/2026; plano → Fase 7).
// Sem isto, a única forma de descobrir um erro no site era o aluno reclamar: a falha ficava
// numa linha do registro da Railway que ninguém lê. Com isto, ela vira um e-mail.
// Este é o ÚNICO arquivo que importa `@sentry/node` (trocar de fornecedor custa um arquivo; há
// um teste que reprova o import em outro lugar).
//
// O QUE VIRA ALERTA — a convenção que o servidor já usava, agora com consequência:
//   - todo `console.error` que começa com uma etiqueta NOSSA (`[stripe] …`, `[api] …`,
//     `[bunny-stream] …`): erro = precisa de gente. `console.warn` e `console.info` não alertam;
//   - o que derrubaria o processo (exceção sem tratamento). A promessa rejeitada sem tratamento
//     vira alerta e o servidor SEGUE DE PÉ — sem o monitor, ela o derrubaria (em produção isso
//     corta os pedidos de todos os alunos; é mudança de comportamento, e é de propósito).
// A linha de BIBLIOTECA de terceiro (sem etiqueta) NÃO vai: o Better Auth registra senha errada
// como erro, e um robô tentando senhas gastaria a cota do mês em minutos.
//
// O QUE SAI DO SERVIDOR: a linha (ou o erro) e a versão do app. NUNCA cabeçalho, cookie, corpo
// do pedido, usuário, IP, nem o rastro do que veio antes — nenhuma das peças do Sentry que
// juntam isso é ligada, e `limparEvento` tira de novo o que sobrar. E-mail, chave e segredo de
// pagamento que apareçam num texto são mascarados antes de sair.
//
// A COTA (5 mil erros por mês no plano grátis): um defeito que se repete a cada pedido gastaria
// tudo em horas. `criarLimite` segura o envio; o que passar do limite continua no registro.

export type Ambiente = { dsn: string | undefined; producao: boolean; versao: string | null };
type Transporte = NonNullable<Parameters<typeof Sentry.init>[0]>["transport"];
type Opcoes = { transporte?: Transporte; limite?: () => boolean };

/** Linha NOSSA: começa com uma etiqueta entre colchetes, como `[stripe] …`. */
const NOSSA = /^\[([a-z][a-z-]*)\] /;

/** O que nunca sai num texto, mesmo que alguém o escreva numa linha de erro. */
const MASCARAS: ReadonlyArray<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[e-mail]"],
  [/\b(?:sk|rk|pk)_(?:live|test)_\w+/g, "[chave]"],
  [/\bwhsec_\w+/g, "[chave]"],
  [/\b\w+_secret_\w+/g, "[segredo]"],
  // O que vem depois do "?" de um endereço (é onde mora o token de um vídeo assinado).
  [/(https?:\/\/[^\s?"'`]+)\?[^\s"'`]+/g, "$1?[…]"],
];

export function mascarar(texto: string): string {
  return MASCARAS.reduce((limpo, [padrao, troca]) => limpo.replace(padrao, troca), texto);
}

/** No máximo tantos envios por janela e por dia; o resto fica só no registro. */
export const LIMITE_DE_ENVIOS = { porJanela: 30, janelaMs: 10 * 60_000, porDia: 150 };
const UM_DIA = 24 * 60 * 60_000;

/** Devolve a pergunta "pode enviar mais um?" — que já conta o envio quando responde sim. */
export function criarLimite(limite = LIMITE_DE_ENVIOS, agora: () => number = Date.now): () => boolean {
  let enviados: number[] = [];
  return () => {
    const t = agora();
    enviados = enviados.filter((quando) => t - quando < UM_DIA);
    const naJanela = enviados.filter((quando) => t - quando < limite.janelaMs).length;
    if (naJanela >= limite.porJanela || enviados.length >= limite.porDia) return false;
    enviados.push(t);
    return true;
  };
}

/**
 * O evento como ele pode sair: só o texto (mascarado), o nível, a versão e a etiqueta. Devolve
 * `null` para o que não é nosso — a linha de erro de uma biblioteca de terceiro.
 */
export function limparEvento(evento: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  const excecoes = evento.exception?.values ?? [];
  const texto = evento.message ?? excecoes[0]?.value ?? "";
  const etiqueta = NOSSA.exec(texto)?.[1];
  if (evento.logger === "console" && !etiqueta) return null;

  delete evento.request;
  delete evento.user;
  delete evento.breadcrumbs;
  delete evento.modules;
  delete evento.extra;
  evento.server_name = "servidor";
  evento.contexts = evento.contexts?.runtime ? { runtime: evento.contexts.runtime } : {};
  if (evento.message) evento.message = mascarar(evento.message);
  for (const excecao of excecoes) if (excecao.value) excecao.value = mascarar(excecao.value);
  // Serve às regras de alerta do painel ("avise sempre que a origem for stripe").
  evento.tags = { ...evento.tags, origem: etiqueta ?? "processo" };
  return evento;
}

let ligado = false;
let avisouDoLimite = 0;

export function monitorLigado(): boolean {
  return ligado;
}

/**
 * Liga o alerta — só em produção, e só com o endereço do Sentry (`SENTRY_DSN`) configurado.
 * Em qualquer outro caso não faz nada: no computador e nos testes os erros ficam no terminal.
 */
export function ligarMonitor(ambiente: Ambiente, opcoes: Opcoes = {}): boolean {
  if (!ambiente.producao) return false;
  if (!ambiente.dsn) {
    console.warn("[monitor] desligado: SENTRY_DSN não configurado — os erros ficam só no registro");
    return false;
  }
  const podeEnviar = opcoes.limite ?? criarLimite();
  Sentry.init({
    dsn: ambiente.dsn,
    environment: "production",
    release: ambiente.versao ?? undefined,
    serverName: "servidor",
    // Só as três peças abaixo. As que o Sentry liga por padrão juntam cabeçalhos do pedido,
    // chamadas de saída, a lista de pacotes e dados da máquina: nada disso é preciso.
    defaultIntegrations: false,
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.onUncaughtExceptionIntegration(),
      Sentry.onUnhandledRejectionIntegration({ mode: "warn" }),
    ],
    // Sem medição de desempenho: nada de OpenTelemetry nem de ganchos no carregamento de módulos.
    skipOpenTelemetrySetup: true,
    registerEsmLoaderHooks: false,
    sendDefaultPii: false,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    beforeSend: (evento) => {
      const limpo = limparEvento(evento);
      if (limpo === null) return null;
      if (podeEnviar()) return limpo;
      // `warn`, que não vira alerta — e uma vez por janela, para não encher o registro.
      if (Date.now() - avisouDoLimite > LIMITE_DE_ENVIOS.janelaMs) {
        avisouDoLimite = Date.now();
        console.warn("[monitor] limite de envios atingido: o que vier agora fica só no registro");
      }
      return null;
    },
    ...(opcoes.transporte ? { transport: opcoes.transporte } : {}),
  });
  // Um endereço malformado não lança: o Sentry só fica mudo. Aqui isso é dito em voz alta.
  ligado = Sentry.getClient()?.getDsn() !== undefined;
  if (ligado) console.info("[monitor] ligado: os erros do servidor viram alerta");
  else console.warn("[monitor] desligado: SENTRY_DSN não é um endereço válido do Sentry");
  return ligado;
}

/** A prova de que a ligação funciona em produção: um aviso a cada subida do servidor. */
export function avisarQueSubiu(versao: string | null): void {
  if (ligado) Sentry.captureMessage(`[servidor] no ar${versao ? `, versão ${versao}` : ""}`, "info");
}

/** Ao desligar: espera sair o que estiver pendente (até 2 s). Nunca falha. */
export async function esvaziarMonitor(): Promise<void> {
  if (!ligado) return;
  try {
    await Sentry.flush(2000);
  } catch {
    // O desligamento não espera por isto.
  }
}
