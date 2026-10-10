/**
 * Os planos da assinatura (Fase 4, etapa 4.2 — billing.md → Preço). É o ÚNICO dado de preço que o
 * site manda ao servidor: QUAL plano. O valor e a moeda saem da Stripe, no servidor — nunca do
 * navegador.
 */
export const Plano = {
  MENSAL: "mensal",
  ANUAL: "anual",
} as const;

export type Plano = (typeof Plano)[keyof typeof Plano];

export const PLANOS = [Plano.MENSAL, Plano.ANUAL] as const;

/**
 * Os endereços da tela de assinar e da de depois do pagamento (decisão do operador, 10/10/2026).
 * Atrás do login; o `/assinar` curto é o do visitante (etapa 4.7). Aqui, e não no site: a home,
 * que é montada no servidor, aponta para o mesmo lugar.
 */
export const TELA_DE_ASSINAR = "/aluno/assinar";
export const TELA_DE_CONCLUIDO = "/aluno/assinar/concluido";

/** Um plano como a tela de assinar o mostra. O valor vem em CENTAVOS, como a Stripe guarda. */
export type PlanoDaAssinatura = { plano: Plano; centavos: number; moeda: string };

/**
 * Resposta de `GET /api/billing/planos`. `formasDePagamento`: a lista do servidor (hoje só
 * `card`), a MESMA com que ele cria a assinatura — o site abre o campo de pagamento com ela.
 */
export type PlanosDaAssinatura = { chavePublicavel: string; planos: PlanoDaAssinatura[]; formasDePagamento: string[] };

/** Por quanto tempo o desconto de um código promocional vale. */
export const DuracaoDoDesconto = {
  PARA_SEMPRE: "para-sempre",
  UMA_VEZ: "uma-vez",
  POR_MESES: "por-meses",
} as const;

export type DuracaoDoDesconto = (typeof DuracaoDoDesconto)[keyof typeof DuracaoDoDesconto];

/** O desconto de um código promocional, como a tela de assinar o descreve. */
export type DescontoDoCodigo = {
  /** Em porcentagem (100 = tudo); vazio quando o desconto é um valor fixo. */
  percentual: number | null;
  /** Valor fixo, em centavos; vazio quando o desconto é em porcentagem. */
  centavos: number | null;
  duracao: DuracaoDoDesconto;
  /** Quantos meses — só quando a duração é `por-meses`. */
  meses: number | null;
};

/** Resposta de `POST /api/billing/previa`: quanto se paga HOJE com o código, pela conta da Stripe. */
export type PreviaDaAssinatura = { centavosHoje: number; moeda: string; desconto: DescontoDoCodigo };

/** Resposta de `GET /api/billing/assinatura`: esta conta tem acesso agora? (a resposta do gate) */
export type SituacaoDaAssinatura = { temAcesso: boolean };

/**
 * Resposta de `POST /api/billing/assinatura`. `ativa`: a Stripe já ativou (nada a pagar, hoje nem
 * depois). `pagar`: o site confirma com o segredo — `pagamento` cobra hoje; `cartao` só guarda o
 * cartão, para a cobrança seguinte (nada a pagar hoje, mas o desconto acaba).
 */
export type AssinaturaCriada = { estado: "ativa" } | { estado: "pagar"; segredo: string; tipo: "pagamento" | "cartao" };
