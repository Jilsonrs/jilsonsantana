import * as Sentry from "@sentry/node";

// O ALERTA DE ERRO EM PRODUÇÃO (Sentry — decisão do operador, 10/10/2026; plano → Fase 7).
// Sem isto, a única forma de descobrir um erro no site era o aluno reclamar: a falha ficava
// numa linha do registro do servidor que ninguém lê. Com isto, ela vira um e-mail.
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
type Opcoes = { transporte?: Transporte; limite?: (etiqueta: string) => boolean };

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

/**
 * A RESERVA (E9 da revisão ampla da cobrança, 29/10/2026): parte da cota fica só para as etiquetas da cobrança, dos
 * e-mails e da rodada — e para o aviso de que o limite começou a descartar. Sem ela, um apagão com centenas de `[api]`
 * gastava o dia, e o alerta seguinte de pagante trancado não saía. As outras etiquetas param antes: em 20 por janela
 * e 100 por dia. **Alerta novo de cobrança usa uma destas etiquetas**, senão fica sem a reserva.
 */
export const RESERVA_DE_ENVIOS = { porJanela: 10, porDia: 50 };
export const ETIQUETAS_COM_RESERVA: ReadonlySet<string> = new Set(["stripe", "email", "avisos", "monitor"]);

/** Devolve a pergunta "pode enviar mais um desta etiqueta?" — que já conta o envio quando responde sim. */
export function criarLimite(limite = LIMITE_DE_ENVIOS, agora: () => number = Date.now): (etiqueta?: string) => boolean {
  let enviados: number[] = [];
  return (etiqueta) => {
    const t = agora();
    enviados = enviados.filter((quando) => t - quando < UM_DIA);
    const naJanela = enviados.filter((quando) => t - quando < limite.janelaMs).length;
    const guardado = etiqueta !== undefined && ETIQUETAS_COM_RESERVA.has(etiqueta) ? { porJanela: 0, porDia: 0 } : RESERVA_DE_ENVIOS;
    if (naJanela >= limite.porJanela - guardado.porJanela || enviados.length >= limite.porDia - guardado.porDia) return false;
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

/** O começo do aviso diário de que o limite de alertas começou a descartar. */
const AVISO_DO_DESCARTE = "[monitor] o limite de alertas começou a descartar";

let ligado = false;
let avisouDoLimite = 0;
let alertouDoDescarte = 0;

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
  avisouDoLimite = 0;
  alertouDoDescarte = 0;
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
    // Sem medição de desempenho: sem `tracesSampleRate`, e o OpenTelemetry fica desligado (o
    // padrão da versão 11, escrito para ninguém o ligar sem perceber).
    enableOpenTelemetrySetup: false,
    // Sem ganchos no carregamento: na versão 11 o Sentry, por padrão, passa a REESCREVER as
    // bibliotecas (Express, banco…) quando elas carregam, para medir desempenho. Nada disso é
    // preciso para o alerta de erro (era o `registerEsmLoaderHooks: false` da versão 10).
    enableRuntimeChannelInjection: false,
    // TUDO DESLIGADO, uma categoria por vez. Na versão 11, deixar isto em branco passou a
    // COLETAR cabeçalhos, cookies, corpo dos pedidos, usuário e consultas ao banco — o oposto da
    // versão 10 (era o `sendDefaultPii: false`). As peças que juntariam isso nem são ligadas
    // (acima), e `limparEvento` ainda tira o que sobrar: são três travas para a mesma coisa.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    // Na versão 11 o padrão virou `true`: a linha de erro passaria a levar um rastro de código, e
    // o Sentry a agruparia pelo LUGAR do código, não pelo texto — erros diferentes que saem da
    // mesma linha (o `[email]` de qualquer conta) virariam um alerta só. Fica como era.
    attachStacktrace: false,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    beforeSend: (evento) => {
      const limpo = limparEvento(evento);
      if (limpo === null) return null;
      // O aviso de que o limite começou a descartar tem vaga PRÓPRIA, acima do teto (revisão do grupo 2 da 4.9b): quando
      // é a cobrança que enche a janela, é justamente ele que precisa sair. Uma vez por dia (a marca, abaixo).
      if (limpo.message?.startsWith(AVISO_DO_DESCARTE)) return limpo;
      if (podeEnviar(String(limpo.tags?.origem ?? "processo"))) return limpo;
      // `warn`, que não vira alerta — e uma vez por janela, para não encher o registro.
      if (Date.now() - avisouDoLimite > LIMITE_DE_ENVIOS.janelaMs) {
        avisouDoLimite = Date.now();
        console.warn("[monitor] limite de envios atingido: o que vier agora fica só no registro");
      }
      // E UM alerta por dia de que o limite começou a descartar (E9): sem ele, ninguém sabe que há alertas calados.
      // Vai pela reserva (`[monitor]`), e nunca entra em laço: a marca é posta antes de pedir o envio.
      if (Date.now() - alertouDoDescarte > UM_DIA) {
        alertouDoDescarte = Date.now();
        Sentry.captureMessage(`${AVISO_DO_DESCARTE}: o que passa dele fica só no registro do servidor (Cloud Run → Registros); a cobrança, os e-mails e a rodada têm uma reserva da cota`, "error");
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
