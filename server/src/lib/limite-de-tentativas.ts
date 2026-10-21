import { isIP } from "node:net";
import type { Request, RequestHandler, Response } from "express";
import { MemoryStore, ipKeyGenerator, rateLimit, type Options } from "express-rate-limit";

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
const HORA = 60 * MINUTO;
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

/**
 * Os tetos SEM LOGIN (etapa 4.7, passo 4 — billing.md → *Limite de tentativas*; no plano aprovado
 * pelo operador em 21/10/2026). Não há conta: conta-se por ENDEREÇO e, ao assinar, também por
 * E-MAIL (o mesmo teto da conta) — é o que impede de encher a tentativa de alguém, que a pessoa
 * dona do e-mail sentiria. E a Stripe recomenda limitar quantos CLIENTES novos um mesmo endereço
 * cria por dia: cada e-mail novo é um cliente novo lá.
 */
export const LIMITES_DO_VISITANTE = {
  /** Assinar: guardar cartão ou cobrar. */
  assinar: { email: { porJanela: 5, porDia: 20 }, endereco: { porJanela: 10, porDia: 40 } },
  /** Os clientes novos na Stripe (um por e-mail novo) que um mesmo endereço pode criar por dia. */
  emailsNovosPorDia: 10,
  /** A conferência do código promocional — com teto por dia (decisão do operador, 21/10/2026). */
  previa: { endereco: { porJanela: 20, porDia: 40 } },
  /** Os planos, que vão à Stripe. */
  leitura: { endereco: { porJanela: 120 } },
  /** "O pagamento já valeu?" — só lê o banco, e a tela repete a cada 2 s (duas abas cabem). */
  confirmacao: { endereco: { porJanela: 900 } },
  /** Criar a senha logo depois de pagar (passo 5): uma vez por conta; o teto segura quem insiste. */
  senha: { endereco: { porJanela: 10 } },
} as const satisfies Record<string, { endereco: Teto; email?: Teto } | number>;

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

/**
 * O e-mail do pedido SEM LOGIN, como a conta o guarda (aparado, em minúsculas). O limite vem antes
 * da validação: sem um texto de tamanho de e-mail, o pedido não conta por e-mail — e a validação o
 * recusa logo depois. Nunca vai para o registro.
 */
function emailDoPedido(req: Request): string | null {
  const bruto: unknown = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof bruto !== "string") return null;
  const email = bruto.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 ? email : null;
}

type Quem = "conta" | "endereco" | "email";

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
    const deQuem = quem === "conta" ? `conta ${req.user?.id ?? "?"}` : quem === "email" ? "e-mail" : "endereço";
    console.warn(`[api] ${req.method} ${req.baseUrl.toLowerCase()}${rotaDoPedido(req)} passou do limite de tentativas (${deQuem})`);
  }
  res.status(429).json({ error: "MuitasTentativas" });
}

/** As contagens, para os testes zerarem (cada teste começa como quem chega agora). */
const contagens: MemoryStore[] = [];

/**
 * O endereço para contar. SEM LOGIN e sem um endereço válido em produção, todos contam JUNTOS numa
 * contagem só (achado da revisão de segurança do passo 4, 21/10/2026): ali não há o teto da conta
 * para segurar, e não contar deixaria as rotas sem limite nenhum. Com login, não conta (o da conta
 * continua — decisão do passo 1).
 */
function enderecoParaContar(req: Request, semLogin: boolean): string | null {
  return enderecoDoPedido(req) ?? (semLogin ? "sem-endereco" : null);
}

/**
 * A parte da chave de QUEM pediu: a conta da sessão, o endereço, ou — sem login — o e-mail JUNTO com
 * o endereço (achado da revisão de segurança do passo 4): contado só pelo e-mail, quem soubesse o de
 * alguém o trancaria de qualquer lugar com pedidos de propósito; assim, trancar exige estar no
 * endereço da pessoa. O teto do endereço continua valendo para todos os e-mails dele.
 */
function chaveDeQuem(req: Request, quem: Quem, semLogin: boolean): string {
  if (quem === "conta") return contaDoPedido(req);
  if (quem === "email") return `email:${emailDoPedido(req) ?? "-"} endereco:${enderecoParaContar(req, true) ?? "-"}`;
  return `endereco:${enderecoParaContar(req, semLogin) ?? "-"}`;
}

/**
 * Este pedido NÃO conta? Com login e sem endereço válido em produção, não conta por endereço (o teto
 * da conta continua); sem um e-mail no corpo, não conta por e-mail (a validação o recusa em seguida).
 */
function semContagem(req: Request, quem: Quem, semLogin: boolean): boolean {
  if (quem === "endereco") return enderecoParaContar(req, semLogin) === null;
  if (quem === "email") return emailDoPedido(req) === null;
  return false;
}

/** O que muda num limitador: sem login (o endereço que falta conta junto), outra chave, ou um pedido que não conta. */
type OpcoesDoLimitador = { semLogin?: boolean; chave?: (req: Request) => string; naoConta?: (req: Request) => boolean };

function limitador(quem: Quem, janelaMs: number, limite: number, opcoes: OpcoesDoLimitador = {}): RequestHandler {
  const semLogin = opcoes.semLogin ?? false;
  const loja = new MemoryStore();
  contagens.push(loja);
  return rateLimit({
    windowMs: janelaMs,
    limit: limite,
    store: loja,
    // Nada de cabeçalho de contagem em toda resposta: só o `Retry-After`, na recusa.
    legacyHeaders: false,
    standardHeaders: false,
    skip: (req) => semContagem(req, quem, semLogin) || (opcoes.naoConta?.(req) ?? false),
    keyGenerator: (req) => (opcoes.chave ? opcoes.chave(req) : `${rotaDoPedido(req)} ${chaveDeQuem(req, quem, semLogin)}`),
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
 * Os passos de um grupo SEM LOGIN, na ordem: os do E-MAIL (com o endereço) antes dos do endereço,
 * que outras pessoas dividem. `semODiaDoEndereco`: o dia do endereço é contado à parte (a prévia).
 */
function tetosSemLogin(grupo: { endereco: Teto; email?: Teto }, { semODiaDoEndereco = false } = {}): RequestHandler[] {
  const passos: RequestHandler[] = [];
  if (grupo.email) {
    passos.push(limitador("email", JANELA, grupo.email.porJanela, { semLogin: true }));
    if (grupo.email.porDia) passos.push(limitador("email", DIA, grupo.email.porDia, { semLogin: true }));
  }
  passos.push(limitador("endereco", JANELA, grupo.endereco.porJanela, { semLogin: true }));
  if (grupo.endereco.porDia && !semODiaDoEndereco) passos.push(limitador("endereco", DIA, grupo.endereco.porDia, { semLogin: true }));
  return passos;
}

/** O pedido traz um código promocional para conferir? */
function temCodigo(req: Request): boolean {
  const codigo: unknown = (req.body as { codigo?: unknown } | undefined)?.codigo;
  return typeof codigo === "string" && codigo.trim().length > 0;
}

/**
 * AS CONFERÊNCIAS DE CÓDIGO DO DIA, por endereço — UMA contagem para a prévia e para o assinar que
 * traz código (achado da revisão de segurança do passo 4): o assinar também diz se o código vale, e
 * com contagens separadas o teto de 40 por dia que o operador decidiu viraria 80. É o MESMO passo nas
 * duas rotas, e a chave não leva a rota.
 */
const conferenciasDeCodigoDoDia = limitador("endereco", DIA, LIMITES_DO_VISITANTE.previa.endereco.porDia, {
  semLogin: true,
  chave: (req) => `conferencias-de-codigo endereco:${enderecoParaContar(req, true) ?? "-"}`,
  naoConta: (req) => !temCodigo(req),
});

/**
 * O limite de cada rota SEM LOGIN (etapa 4.7, passo 4) — por endereço e, ao assinar, também por
 * e-mail (com o endereço). Rota pública de `/billing` que vá à Stripe entra num destes.
 */
export const limiteSemLogin = {
  assinar: [...tetosSemLogin(LIMITES_DO_VISITANTE.assinar), conferenciasDeCodigoDoDia],
  previa: [...tetosSemLogin(LIMITES_DO_VISITANTE.previa, { semODiaDoEndereco: true }), conferenciasDeCodigoDoDia],
  leitura: tetosSemLogin(LIMITES_DO_VISITANTE.leitura),
  confirmacao: tetosSemLogin(LIMITES_DO_VISITANTE.confirmacao),
  senha: tetosSemLogin(LIMITES_DO_VISITANTE.senha),
};

/**
 * PEDIR O CÓDIGO NO E-MAIL (etapa 4.7, passo 5 — os tetos estavam no plano aprovado pelo operador em
 * 21/10/2026). Por E-MAIL, de qualquer endereço — é o que protege a caixa de e-mail de alguém e a cota
 * de e-mails da escola no Resend — e por endereço. Aqui o e-mail conta SOZINHO (e não com o endereço,
 * como no assinar): quem quisesse encher a caixa de outra pessoa usaria muitos endereços. O preço:
 * quem pede de propósito os códigos de outra pessoa a deixa sem código por até um dia — ela continua
 * entrando com a senha.
 */
export const LIMITES_DO_CODIGO = { email: { porHora: 3, porDia: 6 }, endereco: { porJanela: 10 } } as const;

export const limiteDoCodigo: RequestHandler[] = [
  limitador("email", HORA, LIMITES_DO_CODIGO.email.porHora, { semLogin: true, chave: (req) => `codigo-hora email:${emailDoPedido(req) ?? "-"}` }),
  limitador("email", DIA, LIMITES_DO_CODIGO.email.porDia, { semLogin: true, chave: (req) => `codigo-dia email:${emailDoPedido(req) ?? "-"}` }),
  limitador("endereco", JANELA, LIMITES_DO_CODIGO.endereco.porJanela, { semLogin: true }),
];

/** A contagem dos clientes novos do dia, por endereço (zera nos testes, como as outras). */
const clientesNovos = new MemoryStore();
// Seguro: a loja só lê a janela das opções do pacote; o resto não se aplica a uma contagem avulsa.
clientesNovos.init({ windowMs: DIA } as Options);
contagens.push(clientesNovos);

/**
 * OS E-MAILS NOVOS DO DIA (a Stripe recomenda limitar quantos CLIENTES um mesmo endereço cria por
 * dia): conta UM cliente novo deste endereço — e só é chamada no instante em que o cliente vai
 * mesmo ser criado (`checkout-do-visitante.ts`), nunca por pedido: quem erra o CPF, ou tenta de
 * novo com o mesmo e-mail, não gasta nada. Devolve em quantos segundos tentar de novo, quando o
 * dia já está cheio; nada, quando pode. Sem endereço válido em produção, não conta (como os outros).
 */
export async function contarClienteNovo(req: Request): Promise<number | null> {
  const { totalHits, resetTime } = await clientesNovos.increment(chaveDosClientesNovos(req));
  const limite = LIMITES_DO_VISITANTE.emailsNovosPorDia;
  if (totalHits <= limite) return null;
  if (totalHits === limite + 1) console.warn(`[api] ${req.method} ${req.baseUrl.toLowerCase()}${rotaDoPedido(req)} passou do limite de e-mails novos do dia (endereço)`);
  return segundosAte(resetTime);
}

/** A chave dos clientes novos do endereço — sem endereço válido em produção, todos juntos (revisão do passo 4). */
function chaveDosClientesNovos(req: Request): string {
  return `clientes-novos endereco:${enderecoParaContar(req, true) ?? "-"}`;
}

function segundosAte(resetTime: Date | undefined): number {
  return Math.max(1, Math.ceil(((resetTime?.getTime() ?? Date.now() + DIA) - Date.now()) / 1000));
}

/**
 * O endereço JÁ TROUXE os e-mails novos do dia? Só lê, sem contar. A rota de assinar pergunta antes
 * de tudo, e responde o mesmo 429 a QUALQUER e-mail desse endereço (achado da revisão de segurança do
 * passo 4): recusar só o e-mail novo, e deixar passar o que já tem ficha, diria a quem sonda "este
 * e-mail começou uma assinatura". Devolve em quantos segundos tentar de novo; nada, quando pode.
 */
export async function cotaDeClientesNovosEsgotada(req: Request): Promise<number | null> {
  const contagem = await clientesNovos.get(chaveDosClientesNovos(req));
  return contagem && contagem.totalHits >= LIMITES_DO_VISITANTE.emailsNovosPorDia ? segundosAte(contagem.resetTime) : null;
}

/**
 * Zera todas as contagens (e o aviso de endereço). SÓ os testes chamam — numa rota, destravaria
 * todo mundo: `limite-de-tentativas.test.ts` reprova se algum arquivo fora de `src/test/` a usar.
 */
export async function zerarLimitesDeTentativas(): Promise<void> {
  avisouSemEndereco = false;
  await Promise.all(contagens.map((loja) => loja.resetAll()));
}
