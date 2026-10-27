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
/** A tela de depois do pagamento de quem assinou SEM CONTA (etapa 4.7, passo 6e): página do servidor com o app no meio. */
export const TELA_DE_CONCLUIDO_SEM_LOGIN = "/assinar/concluido";

/** Um plano como a tela de assinar o mostra. O valor vem em CENTAVOS, como a Stripe guarda. */
export type PlanoDaAssinatura = { plano: Plano; centavos: number; moeda: string };

/**
 * Resposta de `GET /api/billing/planos`. `formasDePagamento`: a lista do servidor (hoje só
 * `card`), a MESMA com que ele cria a assinatura — o site abre o campo de pagamento com ela.
 */
export type PlanosDaAssinatura = {
  chavePublicavel: string;
  planos: PlanoDaAssinatura[];
  formasDePagamento: string[];
  /**
   * "O que está incluído" (etapa 4.7, passo 6d — decisão do operador, 27/10/2026, P80): a MESMA lista
   * do cartão de preço da home, com as edições do admin, e a frase de baixo dele. Opcional porque a
   * API só acrescenta: sem ele, a tela não mostra a lista.
   */
  incluido?: { itens: string[]; frase: string };
};

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
export type SituacaoDaAssinatura = {
  temAcesso: boolean;
  reativar: boolean;
  /**
   * A conta está com a cobrança ATRASADA e já sem as aulas (etapa 4.6b, 12/10/2026): o caminho
   * dela é trocar o cartão em Faturamento e Assinatura, e não assinar de novo. Só muda o texto e
   * o destino — quem decide acesso é `temAcesso`.
   */
  atrasada?: boolean;
};

/**
 * Resposta de `POST /api/billing/assinatura`. `ativa`: a Stripe já ativou (nada a pagar, hoje nem
 * depois). `pagar`: o site confirma com o segredo — `pagamento` cobra hoje; `cartao` só guarda o
 * cartão, para a cobrança seguinte (nada a pagar hoje, mas o desconto acaba).
 */
export type AssinaturaCriada = { estado: "ativa" } | { estado: "pagar"; segredo: string; tipo: "pagamento" | "cartao" };

/**
 * Resposta de `POST /api/billing/visitante/assinatura` — assinar SEM CONTA (etapa 4.7, passo 4). A
 * mesma da conta logada, e mais a `tentativa`: o código desta tentativa, que o site devolve no
 * próximo clique (para seguir com ela) e com que a tela de depois do pagamento pergunta se valeu.
 */
export type AssinaturaSemLogin = { estado: "ativa"; tentativa: string } | { estado: "pagar"; segredo: string; tipo: "pagamento" | "cartao"; tentativa: string };

/**
 * Resposta de `POST /api/billing/visitante/confirmacao`: o pagamento desta tentativa já valeu — a
 * conta nasceu e tem acesso? Só sim ou não: nada sobre a conta, o e-mail ou a assinatura.
 */
export type ConfirmacaoSemLogin = { confirmada: boolean };

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
export const TELA_DE_CANCELAR = "/aluno/conta/faturamento/cancelar";
export const TELA_DE_MUDAR_DE_PLANO = "/aluno/conta/faturamento/plano";

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
      /** Esta assinatura ainda pode ser cobrada: aceita cartão novo. A encerrada de vez, com dias pagos, não. */
      aceitaCartao: boolean;
      /** Renova, e a pessoa pode PARAR a renovação (o acesso continua até o fim do período pago). */
      podeParar: boolean;
      /** A renovação está parada e ainda dá para voltar atrás, sem pagar nada. A encerrada de vez, não. */
      podeManter: boolean;
      /**
       * A cobrança está atrasada: cancelar aqui TERMINA a assinatura na hora (não há período pago a
       * manter) e a cobrança em aberto não é mais tentada — decisão do operador, 11/10/2026.
       */
      terminaAoCancelar: boolean;
      /**
       * A saída do reembolso: quanto volta e até quando dá para pedir (em ISO). Só dentro do prazo
       * e com dinheiro a devolver — a assinatura de cortesia nunca tem. Quem confere é o servidor,
       * de novo, na hora da ação.
       */
      reembolso: { centavos: number; moeda: string; ate: string } | null;
      /** Dá para mudar de plano agora (renova, não está atrasada e não há troca já marcada). */
      podeMudarDePlano: boolean;
      /** A troca de plano MARCADA para o fim do período pago (anual → mensal): para qual plano e quando (ISO). Dá para desistir. */
      trocaMarcada: { plano: Plano; em: string } | null;
      /**
       * Só com a cobrança ATRASADA (etapa 4.6b): até quando as aulas ficam abertas (ISO) — 3 dias
       * depois da cobrança que falhou — e se já trancaram. Trancadas, a assinatura continua aqui:
       * é nela que a pessoa troca o cartão, e pagar reabre as aulas na hora.
       */
      aulasAte?: string | null;
      aulasTrancadas?: boolean;
    };

/**
 * Os motivos de cancelamento (decisão do operador, 11/10/2026: a lista curta, e escolher é
 * OPCIONAL). O valor é o que fica guardado junto da assinatura, na Stripe; o texto que o aluno
 * lê sai do dicionário.
 */
export const MOTIVOS_DE_CANCELAMENTO = ["caro", "sem-tempo", "ja-aprendi", "sem-conteudo", "outro"] as const;
export type MotivoDoCancelamento = (typeof MOTIVOS_DE_CANCELAMENTO)[number];

/** O tamanho do "Quer contar mais?": é uma frase ou duas, não uma carta. */
export const TAMANHO_DO_COMENTARIO = 500;

/**
 * Por quantos dias as aulas ficam abertas depois da COBRANÇA QUE FALHOU (decisão do operador,
 * 11/10/2026: "2 semanas é muito tempo […] não quero perder aluno e nem ser vítima de
 * espertinhos"). A Stripe continua tentando cobrar pela janela dela; o acesso é que tem este prazo.
 */
export const TOLERANCIA_DA_COBRANCA_ATRASADA_EM_DIAS = 3;

/**
 * O prazo do reembolso, em dias, contados do PRIMEIRO DIA da assinatura — trocar de plano não
 * recomeça (decisões do operador, 10/10/2026; é o direito de arrependimento do CDC, art. 49).
 * É o único prazo: a escola vende só para o Brasil (decisão do operador, 12/10/2026).
 */
export const PRAZO_DO_REEMBOLSO_EM_DIAS = 7;

/** Resposta de `POST /api/billing/minha-assinatura/reembolso`: quanto foi devolvido. O acesso terminou. */
export type ReembolsoFeito = { centavos: number; moeda: string };

/**
 * Resposta de `POST /api/billing/minha-assinatura/cancelar`: a renovação parou, e até quando há
 * acesso (o fim do período já pago). A data vem em ISO. Com a cobrança atrasada, a assinatura
 * termina na hora: `terminou`, e não há data.
 */
export type RenovacaoParada = {
  acessoAte: string | null;
  /** A cobrança estava atrasada: a assinatura TERMINOU agora, sem acesso — e não "parou de renovar". */
  terminou?: boolean;
};

/**
 * Resposta de `GET /api/billing/minha-assinatura/plano`: a troca de plano que esta conta pode
 * fazer AGORA — ou nenhuma (decisões do operador, 11/10/2026).
 *   - para o ANUAL vale na hora, e o ANO COMEÇA NO DIA DA TROCA: quanto se paga hoje (a conta é
 *     da Stripe: o anual inteiro, menos o que sobrou do mês pago) e quando é a cobrança
 *     seguinte. O VALOR MOSTRADO É O COBRADO: ao confirmar, o site devolve o valor que mostrou
 *     (`hoje.centavos`) e a cobrança sai EXATAMENTE nele, num clique só — mesmo que a pessoa
 *     tenha demorado. `valeAte` (ISO) é até quando isso vale: passou, a tela leva a pessoa ao
 *     Início, e na volta ela vê o valor novo (decisão do operador, 11/10/2026).
 *   - para o MENSAL vale no fim do período já pago: quando, e quanto passa a custar por mês.
 */
export type TrocaDePlano =
  | { para: "anual"; quando: "agora"; preco: { centavos: number; moeda: string }; hoje: { centavos: number; moeda: string }; proximaEm: string | null; valeAte: string }
  | { para: "mensal"; quando: "fim-do-periodo"; preco: { centavos: number; moeda: string }; em: string };
export type TrocaDisponivel = { troca: TrocaDePlano | null };

/**
 * Resposta de `POST /api/billing/minha-assinatura/plano`: `trocado` (vale agora) · `confirmar`
 * (o banco pediu uma confirmação: o site a completa com este segredo, e a troca só vale depois) ·
 * `marcado` (vale no fim do período pago, na data — ISO).
 */
export type PlanoMudado = { estado: "trocado" } | { estado: "confirmar"; segredo: string } | { estado: "marcado"; em: string };

/**
 * Resposta de `POST /api/billing/minha-assinatura/plano/desistir`. `trocado: true`: não deu para
 * desistir — o pagamento da troca se completou no mesmo instante, e o plano mudou.
 */
export type TrocaDesfeita = {
  trocado: boolean;
  /**
   * Em que plano a assinatura está AGORA, relido pelo servidor. É por ele que a tela decide o que
   * dizer depois de uma confirmação do banco que não voltou: se já é o plano pedido, o pagamento
   * passou — e ela nunca diz "nada foi cobrado".
   */
  plano?: Plano | null;
};

/** Resposta de `POST /api/billing/cartao`: o segredo com que o campo da Stripe guarda o cartão novo. */
export type TrocaDeCartaoPreparada = { segredo: string };

/**
 * Resposta de `POST /api/billing/cartao/aplicar`: o cartão que passou a valer na assinatura.
 * `pagou`: a cobrança estava atrasada, e o cartão novo pagou a fatura em aberto na hora.
 */
export type CartaoTrocado = {
  cartao: CartaoDaAssinatura | null;
  pagou: boolean;
  /** O banco pediu uma confirmação para a cobrança em aberto: o site a completa com este segredo. */
  confirmar?: string | null;
};
