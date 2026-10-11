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

/**
 * Resposta de `GET /api/billing/assinatura`: esta conta tem acesso agora? (a resposta do gate).
 * `reativar` (etapa 4.4 — decisão do operador, 10/10/2026): a conta JÁ FOI assinante e hoje está
 * sem acesso — o convite dela é "Reativar assinatura", e não "Assinar". Só muda o texto.
 */
export type SituacaoDaAssinatura = { temAcesso: boolean; reativar: boolean };

/**
 * Resposta de `POST /api/billing/assinatura`. `ativa`: a Stripe já ativou (nada a pagar, hoje nem
 * depois). `pagar`: o site confirma com o segredo — `pagamento` cobra hoje; `cartao` só guarda o
 * cartão, para a cobrança seguinte (nada a pagar hoje, mas o desconto acaba).
 */
export type AssinaturaCriada = { estado: "ativa" } | { estado: "pagar"; segredo: string; tipo: "pagamento" | "cartao" };

/**
 * O que a sincronia fez com UMA assinatura (Fase 4, etapa 4.4). `atualizada`: o espelho ficou
 * igual à Stripe. `sem-conta`: a Stripe não diz de que conta ela é (ou diz uma que não existe),
 * e o espelho não nasceu. `nao-encontrada`: a Stripe não conhece esta assinatura — o espelho
 * dela fica como está, nunca é apagado por aqui.
 */
export const ResultadoDaSincronia = {
  ATUALIZADA: "atualizada",
  SEM_CONTA: "sem-conta",
  NAO_ENCONTRADA: "nao-encontrada",
} as const;
export type ResultadoDaSincronia = (typeof ResultadoDaSincronia)[keyof typeof ResultadoDaSincronia];

/** Uma assinatura conferida: `status` e `pagoAte` são o que a Stripe diz AGORA (vazios se ela não a conhece). */
export type AssinaturaConferida = { id: string; resultado: ResultadoDaSincronia; status: string | null; pagoAte: string | null };

/** Resposta de `POST /api/admin/assinaturas/sincronizar`: o que foi conferido e a resposta do gate depois. */
export type SincroniaDaConta = { temAcesso: boolean; assinaturas: AssinaturaConferida[] };

/**
 * "FATURAMENTO E ASSINATURA" (Fase 4, etapa 4.6 — decisões do operador, 11/10/2026): a tela mora
 * no item que já existia no menu da conta, e cada ação tem a sua tela, com endereço próprio — é o
 * que dá link direto para "trocar o cartão" (o painel do admin e o e-mail da cobrança que falhou).
 */
export const TELA_DO_FATURAMENTO = "/aluno/conta/faturamento";
export const TELA_DE_TROCAR_O_CARTAO = "/aluno/conta/faturamento/cartao";

/** O cartão guardado, como a tela o mostra: NUNCA o número — a bandeira, os 4 últimos e a validade. */
export type CartaoDaAssinatura = { bandeira: string; final: string; mes: number; ano: number };

/** Em que pé está a assinatura da conta, para a tela de Faturamento e Assinatura. */
export const SituacaoDoFaturamento = {
  /** Nunca assinou. */
  NENHUMA: "nenhuma",
  /** Já foi assinante e hoje está sem acesso. */
  TERMINADA: "terminada",
  /** Com acesso, e renova. */
  ATIVA: "ativa",
  /** Com acesso até uma data, e não renova (a renovação foi parada, ou a assinatura já encerrou com dias pagos). */
  VAI_CANCELAR: "vai-cancelar",
  /** Com acesso, e a última cobrança falhou: a Stripe está tentando de novo. */
  ATRASADA: "atrasada",
} as const;
export type SituacaoDoFaturamento = (typeof SituacaoDoFaturamento)[keyof typeof SituacaoDoFaturamento];

/**
 * Resposta de `GET /api/billing/minha-assinatura`: a assinatura da conta da SESSÃO, como a Stripe
 * diz agora. Nenhum código da Stripe sai daqui (assinatura, cliente, preço, cartão). As datas vêm
 * em ISO. `plano` e `preco` vazios: o preço da assinatura não é nenhum dos dois planos de hoje.
 */
export type MinhaAssinatura =
  | { situacao: typeof SituacaoDoFaturamento.NENHUMA }
  | { situacao: typeof SituacaoDoFaturamento.TERMINADA; terminouEm: string | null }
  | {
      situacao: typeof SituacaoDoFaturamento.ATIVA | typeof SituacaoDoFaturamento.VAI_CANCELAR | typeof SituacaoDoFaturamento.ATRASADA;
      plano: Plano | null;
      preco: { centavos: number; moeda: string } | null;
      /** Quanto e quando a Stripe cobra a renovação — a conta é dela. Só quando renova. */
      proximaCobranca: { centavos: number; moeda: string; em: string } | null;
      /** Até quando há acesso — só quando não renova. */
      acessoAte: string | null;
      cartao: CartaoDaAssinatura | null;
    };

/** Resposta de `POST /api/billing/cartao`: o segredo com que o campo da Stripe guarda o cartão novo. */
export type TrocaDeCartaoPreparada = { segredo: string };

/**
 * Resposta de `POST /api/billing/cartao/aplicar`: o cartão que passou a valer na assinatura.
 * `pagou`: a cobrança estava atrasada, e o cartão novo pagou a fatura em aberto na hora.
 */
export type CartaoTrocado = { cartao: CartaoDaAssinatura | null; pagou: boolean };
