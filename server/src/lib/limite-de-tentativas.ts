import { isIP } from "node:net";
import type { Request, RequestHandler, Response } from "express";
import { MemoryStore, ipKeyGenerator, rateLimit } from "express-rate-limit";

// O LIMITE DE TENTATIVAS NAS ROTAS DE COBRANÇA (Fase 4, etapa 4.7, passo 1 — billing.md →
// *Limite de tentativas*; plano e frase aprovados pelo operador em 19/10/2026). Toda rota de
// `/billing` que vai à Stripe tem um teto por CONTA e outro, o dobro, por ENDEREÇO de internet
// (quem divide o endereço — a rede do trabalho, a operadora do celular — não paga pelo vizinho).
// Sem ele, uma conta testaria cartão roubado pelo site — a Stripe aponta "guardar cartão" e
// "fazer um pagamento" como as rotas que esse ataque procura —, adivinharia código promocional,
// ou gastaria o limite de pedidos da escola na Stripe, que é um só para todo mundo.
//
// - **Cada rota conta separado** (a chave leva a rota): bloquear o "trocar o cartão" não tranca o
//   "cancelar".
// - **A janela é de cada pessoa** e começa no primeiro pedido dela: quem passou do teto espera no
//   máximo 15 minutos — é o que a frase da tela promete ("espere alguns minutos").
// - **Recusado aqui, o pedido nem chega à Stripe** — o limite vem antes da rota.
// - **Contagem em memória**: há um servidor só; cada publicação zera as contagens.
// - **Quem fica de fora:** `GET /billing/assinatura` ("já tenho acesso?"), que a tela de depois do
//   pagamento repete a cada 2 s — lê só o banco.
// - **A conta é a da sessão** (o `requireAuth` vem antes); o endereço, o `x-real-ip`.

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;
const JANELA = 15 * MINUTO;

/** Um teto: a cada 15 minutos e, nas rotas de cartão e de cobrança, também por dia. */
type Teto = { porJanela: number; porDia?: number };

/** Os tetos de cada grupo de rotas — por conta e por endereço. */
export const LIMITES = {
  /** Guardar cartão ou cobrar: assinar, trocar o cartão (os dois pedidos), mudar de plano. */
  cobranca: { conta: { porJanela: 5, porDia: 20 }, endereco: { porJanela: 10, porDia: 40 } },
  /** As outras ações: aplicar o código promocional, cancelar, manter, reembolso, desistir da troca. */
  acao: { conta: { porJanela: 10 }, endereco: { porJanela: 20 } },
  /** As leituras que vão à Stripe: os planos, a minha assinatura, a troca de plano. */
  leitura: { conta: { porJanela: 60 }, endereco: { porJanela: 120 } },
} as const satisfies Record<string, { conta: Teto; endereco: Teto }>;

/** Já avisamos que a contagem por endereço parou? Uma vez por processo basta (zera nos testes). */
let avisouSemEndereco = false;

/**
 * O endereço de quem pediu: o `x-real-ip`, que a borda da Railway reescreve (medido em produção
 * em 23/09/2026 — o mesmo do limite do login, `lib/auth.ts`). O IPv6 vira a faixa /56: quem recebe
 * uma faixa inteira da operadora trocaria de endereço a cada pedido e nunca passaria do teto.
 * **Em produção ele tem que ser um IP** (achado da revisão de segurança, 19/10/2026): ausente ou
 * estranho, a borda deixou de reescrevê-lo — contar pela conexão juntaria a escola inteira numa
 * contagem só (a do proxy da Railway), e um texto qualquer viraria chave. Então o pedido NÃO
 * conta por endereço (o teto da conta continua), e vai UM alerta. Fora de produção, a conexão.
 */
export function enderecoDoPedido(req: Request, emProducao = process.env.NODE_ENV === "production"): string | null {
  const cabecalho = req.get("x-real-ip")?.trim();
  if (cabecalho && isIP(cabecalho)) return ipKeyGenerator(cabecalho, 56);
  if (emProducao) {
    if (!avisouSemEndereco) {
      avisouSemEndereco = true;
      console.error("[api] limite de tentativas: pedido sem um x-real-ip válido — a contagem por endereço está parada (a borda da Railway deixou de reescrever o cabeçalho?)");
    }
    return null;
  }
  const conexao = req.socket.remoteAddress;
  return conexao ? ipKeyGenerator(conexao, 56) : null;
}

/**
 * A rota pelo DESENHO dela (`/billing/cartao`), como foi declarada — nunca pelo endereço digitado
 * (achado da revisão de segurança, 19/10/2026: o Express aceita `/API/…` e `/Api/…`, e cada grafia
 * abriria uma contagem). Sem o método: o `HEAD` que o Express responde pela rota de `GET` conta
 * junto com ele (cada grupo tem só `GET` ou só `POST`, e cada grupo conta à parte).
 */
function rotaDoPedido(req: Request): string {
  // `req.route` é a rota que casou (o Express o põe antes de chamar os passos dela).
  const desenho: unknown = req.route?.path;
  if (typeof desenho !== "string") throw new Error("[api] limite de tentativas montado fora de uma rota");
  return desenho;
}

/**
 * A conta da sessão. Sem sessão, todo mundo cairia numa contagem só, e um robô trancaria a escola
 * inteira (achado da revisão de segurança, 19/10/2026): o limite por conta só existe DEPOIS do
 * `requireAuth`, e montado fora disso é erro — que alerta da primeira vez. Rota pública ganha
 * grupo próprio, por endereço.
 */
function contaDoPedido(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new Error("[api] limite de tentativas por conta sem sessão: falta o requireAuth antes");
  return `conta:${id}`;
}

type Quem = "conta" | "endereco";

/** O que o pacote anota no pedido (`req.rateLimit`): a contagem e quando ela zera. */
type Contagem = { used: number; limit: number; resetTime?: Date };

/**
 * A recusa: 429 `MuitasTentativas`, com o `Retry-After` dizendo em quantos segundos a contagem
 * zera. Uma linha de AVISO, e só na primeira recusa da janela (quem insiste não enche o
 * registro): é o que alguém causa sozinho — não alerta ninguém (CLAUDE.md → Server). Nunca o
 * endereço no registro.
 */
function recusar(req: Request, res: Response, quem: Quem, janelaMs: number): void {
  // Seguro: o pacote sempre anota a contagem antes de chamar a recusa (`requestPropertyName`).
  const contagem = (req as Request & { rateLimit?: Contagem }).rateLimit;
  const restam = contagem?.resetTime ? contagem.resetTime.getTime() - Date.now() : janelaMs;
  res.set("Retry-After", String(Math.max(1, Math.ceil(restam / 1000))));
  if (contagem && contagem.used === contagem.limit + 1) {
    console.warn(`[api] ${req.method} ${req.baseUrl.toLowerCase()}${rotaDoPedido(req)} passou do limite de tentativas (${quem === "conta" ? `conta ${req.user?.id ?? "?"}` : "endereço"})`);
  }
  res.status(429).json({ error: "MuitasTentativas" });
}

/** As contagens, para os testes zerarem (cada teste começa como quem chega agora). */
const contagens: MemoryStore[] = [];

function limitador(quem: Quem, janelaMs: number, limite: number): RequestHandler {
  const loja = new MemoryStore();
  contagens.push(loja);
  return rateLimit({
    windowMs: janelaMs,
    limit: limite,
    store: loja,
    // Nada de cabeçalho de contagem em toda resposta: só o `Retry-After`, na recusa.
    legacyHeaders: false,
    standardHeaders: false,
    // Sem endereço válido em produção, o pedido não conta por endereço (o teto da conta continua).
    skip: (req) => quem === "endereco" && enderecoDoPedido(req) === null,
    keyGenerator: (req) => `${rotaDoPedido(req)} ${quem === "conta" ? contaDoPedido(req) : `endereco:${enderecoDoPedido(req) ?? "-"}`}`,
    handler: (req, res) => recusar(req, res, quem, janelaMs),
  });
}

/**
 * Os passos de cada grupo, na ordem: os da CONTA (a janela e o dia) antes dos do endereço — quem
 * já passou de um teto da própria conta não gasta mais a cota do endereço, que outras pessoas
 * podem dividir (a ordem do dia: achado da revisão de segurança, 19/10/2026).
 */
function tetos(grupo: { conta: Teto; endereco: Teto }): RequestHandler[] {
  const passos = [limitador("conta", JANELA, grupo.conta.porJanela)];
  if (grupo.conta.porDia) passos.push(limitador("conta", DIA, grupo.conta.porDia));
  passos.push(limitador("endereco", JANELA, grupo.endereco.porJanela));
  if (grupo.endereco.porDia) passos.push(limitador("endereco", DIA, grupo.endereco.porDia));
  return passos;
}

/** O limite de cada grupo, para pôr na rota DEPOIS do `requireAuth`. */
export const limiteDeTentativas = {
  cobranca: tetos(LIMITES.cobranca),
  acao: tetos(LIMITES.acao),
  leitura: tetos(LIMITES.leitura),
};

/**
 * Zera todas as contagens (e o aviso de endereço). SÓ os testes chamam — numa rota, destravaria
 * todo mundo: `limite-de-tentativas.test.ts` reprova se algum arquivo fora de `src/test/` a usar.
 */
export async function zerarLimitesDeTentativas(): Promise<void> {
  avisouSemEndereco = false;
  await Promise.all(contagens.map((loja) => loja.resetAll()));
}
