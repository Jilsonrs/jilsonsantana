import { z } from "zod";
import type { MotivoDoCancelamento } from "../constants/billing.js";
import { enderecoDeEmailSchema } from "./billing.js";

// O PAINEL DA COBRANÇA DO ADMIN (Fase 4, etapa 4.7b — decisões do operador, 31/10/2026). Só ADMIN lê e usa estes
// formatos; o aluno nunca os vê. A ASSINATURA vai ao navegador pelo id do ESPELHO (o nosso banco), nunca pelo da
// Stripe — as ações (bloco 3) a dizem assim. A COBRANÇA não tem espelho: a ficha mostra o id dela na Stripe (`ch_`),
// e a ação sobre ela (bloco 4) confere no servidor que ela é do aluno.

/** Os filtros da lista das assinaturas (passo 1b). "Todas" deixa de fora só a tentativa que expirou sem pagar, que é de "Tentativas". */
export const FILTROS_DAS_ASSINATURAS = ["todas", "ativas", "vao-cancelar", "atrasadas", "canceladas", "aguardando"] as const;
export type FiltroDasAssinaturas = (typeof FILTROS_DAS_ASSINATURAS)[number];

/** O que a tela pede: o filtro, a busca (e-mail, nome, ou o código da Stripe que veio num alerta) e a página. */
export const listaDeAssinaturasQuerySchema = z.object({
  filtro: z.enum(FILTROS_DAS_ASSINATURAS).default("todas"),
  busca: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((texto) => (texto ? texto : undefined)),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type ListaDeAssinaturasQuery = z.infer<typeof listaDeAssinaturasQuerySchema>;

/** A situação de uma assinatura na lista, tirada do espelho (sem ir à Stripe). "outra": um status que a Stripe inventou. */
export type SituacaoNaLista = "ativa" | "vai-cancelar" | "pre-paga" | "atrasada" | "cancelada" | "aguardando" | "pausada" | "outra";

export type AssinaturaDaLista = {
  /** O id do ESPELHO — nunca o da Stripe. */
  id: number;
  /** A conta dona; vazio = a assinatura está sem conta (o caso "pagou e está sem conta"). */
  aluno: { id: string; nome: string | null; email: string } | null;
  plano: "mensal" | "anual" | null;
  /** O Pix pré-pago: não renova; o acesso vai até `acabaEm`. */
  prePaga: boolean;
  situacao: SituacaoNaLista;
  /** O status como a Stripe diz (para a situação "outra"). */
  status: string;
  /** Até quando está PAGO (o que o gate lê). */
  pagoAte: string | null;
  /** Marcada para acabar nesta data; vazio = renova. */
  acabaEm: string | null;
  /**
   * Esta assinatura dá acesso a alguém AGORA — a regra do gate (`assinaturaDaAcesso`), calculada no servidor e só com
   * conta (achado da revisão de segurança do bloco 1: a tela não pode ter uma segunda cópia da regra). Só escolhe o
   * texto ("acesso até"); nunca decide nada.
   */
  daAcesso: boolean;
  /** O código promocional em vigor, como o aluno o digitou. */
  codigo: string | null;
  /** Do modo de teste da Stripe (no ar, só as de antes do lançamento). */
  deTeste: boolean;
  criadaEm: string;
};

export type ContagemDasAssinaturas = Record<FiltroDasAssinaturas, number>;

/** A resposta de `GET /api/admin/assinaturas`: a contagem de cada filtro (sem a busca) e uma página da lista. */
export type ListaDeAssinaturas = { contagem: ContagemDasAssinaturas; assinaturas: AssinaturaDaLista[]; temMais: boolean };

/** Quantas assinaturas por página. */
export const ASSINATURAS_POR_PAGINA = 50;

/** Quem a ficha mostra (passos 1c e 1e): uma conta, uma assinatura sem conta (pelo id do espelho) ou a ficha de um visitante que não terminou de assinar — um só. */
export const fichaQuerySchema = z.union([
  z.object({ conta: z.string().min(1).max(100) }).strict(),
  z.object({ assinatura: z.coerce.number().int().positive() }).strict(),
  z.object({ visitante: z.string().min(1).max(100) }).strict(),
]);
export type FichaQuery = z.infer<typeof fichaQuerySchema>;

/** O código da Stripe que veio num alerta (passo 1c): de quem é. */
export const acharQuerySchema = z.object({
  codigo: z
    .string()
    .trim()
    .max(255)
    .regex(/^(sub|cus|pi|ch|in|du)_[A-Za-z0-9_]+$/),
});

/** Onde um código da Stripe leva: a conta; sem conta, a assinatura no espelho; ou a ficha do visitante que não terminou de assinar. */
export type OndeLeva = { conta: string | null; assinatura: number | null; visitante: string | null };

/** Uma cobrança de cartão ou de Pix, como a Stripe diz agora. */
export type CobrancaDaFicha = {
  /** O id da cobrança na Stripe (`ch_`). */
  id: string;
  em: string;
  centavos: number;
  moeda: string;
  forma: "cartao" | "pix" | "outra";
  cartao: { bandeira: string; final: string } | null;
  situacao: "paga" | "falhou" | "pendente" | "devolvida" | "devolvida-em-parte" | "contestada";
  /** Quanto já voltou, em centavos. */
  devolvido: number;
  /** O motivo da recusa como a Stripe o diz (`outcome.reason`, senão `failure_code`) — a tela traduz. */
  motivoDaFalha: string | null;
  /** O recibo da Stripe (só da cobrança que passou). */
  recibo: string | null;
  contestacao: { situacao: string; motivo: string; prazo: string | null } | null;
};

/** Um e-mail da cobrança que a escola mandou (ou tentou mandar) a esta pessoa. */
export type EmailDaFicha = { tipo: string; em: string; saiu: boolean };

/** O visitante que começou a assinar sem conta e não terminou (passo 1e): o que a ficha de espera guarda. */
export type VisitanteDaFicha = {
  id: string;
  nome: string | null;
  email: string;
  ultimaTentativaEm: string;
  /** Quando o lembrete "você não terminou" saiu; vazio = ainda não saiu. */
  lembreteEm: string | null;
  /** Quando a ficha (e o cliente na Stripe) somem: 7 dias depois da última tentativa. */
  someEm: string;
  novidades: boolean;
  /** A limpeza achou pagamento e NÃO apagou (alguém pagou e ficou sem conta). */
  naoApagada: boolean;
};

/** Um Pix gerado e ainda não pago (o QR aberto). */
export type PixEsperando = { id: string; em: string; centavos: number; moeda: string };

/** A ficha do aluno (passo 1c): a conta e as assinaturas pelo nosso banco; as cobranças, o cartão e o CPF pela Stripe, na hora. */
export type FichaDaCobranca = {
  conta: { id: string; nome: string | null; email: string; criadaEm: string } | null;
  /** A ficha de um visitante sem conta (passo 1e); vazio nas outras. */
  visitante: VisitanteDaFicha | null;
  /** Os Pix gerados e não pagos (passo 1e). */
  pixEsperando: PixEsperando[];
  temAcesso: boolean;
  assinaturas: AssinaturaDaLista[];
  cobrancas: CobrancaDaFicha[];
  /** A Stripe tem mais cobranças do que as 100 mais recentes de cada cliente. */
  maisCobrancas: boolean;
  /** O cartão que a Stripe cobra (bandeira e os 4 últimos números) — nunca o cartão. */
  cartao: { bandeira: string; final: string; mes: number; ano: number } | null;
  /** O CPF ou CNPJ, com parte escondida. */
  documento: string | null;
  emails: EmailDaFicha[];
  /** A Stripe não respondeu: a ficha traz só o que está no banco. */
  stripeIndisponivel: boolean;
  /** Os links para mandar ao aluno (passo 3a): trocar o cartão, reativar e pagar a atrasada com Pix (quando o Pix está no ar). */
  links: { trocarCartao: string | null; reativar: string | null; pagarComPix: string | null };
  /** O que aconteceu na cobrança desta pessoa (passo 1f) — as 50 linhas mais recentes. */
  registro: LinhaDoRegistro[];
};

/** Uma tentativa que não terminou (passo 1e): um visitante sem conta, ou uma conta com a assinatura esperando (ou que expirou sem) o primeiro pagamento. */
export type TentativaDaLista =
  | { tipo: "visitante"; visitante: VisitanteDaFicha }
  | { tipo: "conta"; assinatura: number; conta: { id: string; nome: string | null; email: string }; situacao: "aguardando" | "expirou"; em: string };

/** A resposta de `GET /api/admin/cobranca/tentativas`: da mais recente para a mais antiga. */
export type ListaDeTentativas = { tentativas: TentativaDaLista[]; temMais: boolean };

/** Quantas tentativas a lista traz; as contas, só dos últimos 30 dias. */
export const TENTATIVAS_NA_LISTA = 200;

/** Quem fez o que está no registro (passo 1f). */
export type QuemFezNoRegistro = "STRIPE" | "OPERADOR" | "ALUNO" | "RODADA" | "JILSONAI";

/** Uma linha do registro da cobrança: quem, quando, o quê (o tipo do aviso da Stripe, ou a ação), o resumo e em quem. */
export type LinhaDoRegistro = {
  id: number;
  em: string;
  quem: QuemFezNoRegistro;
  acao: string;
  /** Resumo sem dado pessoal: partes separadas por " · " (o status, `vai-cancelar`, `motivo:…`, `perdeu-acesso`…). */
  detalhe: string | null;
  centavos: number | null;
  aluno: { id: string; nome: string | null; email: string } | null;
};

/** Um motivo de cancelamento e quantas assinaturas o escolheram (passo 1f). */
export type MotivoContado = { motivo: MotivoDoCancelamento; total: number };

/** A resposta de `GET /api/admin/cobranca/o-que-aconteceu`: uma página do registro da escola e os motivos contados. */
export type OQueAconteceu = { linhas: LinhaDoRegistro[]; temMais: boolean; motivos: MotivoContado[] };

/** Quantas linhas do registro por página. */
export const REGISTRO_POR_PAGINA = 50;

/** O que a tela pede ao registro: a página. */
export const oQueAconteceuQuerySchema = z.object({ pagina: z.coerce.number().int().min(1).max(10_000).default(1) });

/** O tipo de caso de "Precisa de você" (bloco 2) — os mesmos nomes do banco. */
export const TIPOS_DE_CASO = [
  "PIX_EM_CONFERENCIA",
  "PAGO_SEM_ASSINATURA",
  "PAGOU_SEM_CONTA",
  "DIVERGENCIA",
  "ATIVA_SEM_PERIODO_PAGO",
  "COBRANCA_EM_ABERTO",
  "DEVOLUCAO_FALHOU",
  "TROCA_DE_PLANO",
  "CONTESTACAO",
  "AVISO_DE_FRAUDE",
  "EMAIL_NAO_SAIU",
  "PEDIDO_DE_REEMBOLSO",
] as const;
export type TipoDeCasoDaLista = (typeof TIPOS_DE_CASO)[number];

/** O nome de cada tipo de caso — o mesmo na tela "Precisa de você" e no e-mail ao operador (texto do admin). */
export const NOME_DO_TIPO_DE_CASO: Record<TipoDeCasoDaLista, string> = {
  PIX_EM_CONFERENCIA: "Pix pago que não virou assinatura",
  PAGO_SEM_ASSINATURA: "Dinheiro recebido sem assinatura",
  PAGOU_SEM_CONTA: "Pagou e está sem conta",
  DIVERGENCIA: "O site e a Stripe discordam",
  ATIVA_SEM_PERIODO_PAGO: "Ativa na Stripe sem período pago",
  COBRANCA_EM_ABERTO: "Cobrança em aberto que não foi anulada",
  DEVOLUCAO_FALHOU: "Devolução que falhou",
  TROCA_DE_PLANO: "Troca de plano com defeito",
  CONTESTACAO: "Contestação no banco",
  AVISO_DE_FRAUDE: "Aviso de fraude do banco",
  EMAIL_NAO_SAIU: "E-mail que não saiu",
  PEDIDO_DE_REEMBOLSO: "Pedido de reembolso",
};

/** Um caso de "Precisa de você" (passo 2c): o que aconteceu, com quem, e para onde ir (a ficha). */
export type CasoDaLista = {
  id: number;
  tipo: TipoDeCasoDaLista;
  urgente: boolean;
  aberto: boolean;
  abertoEm: string;
  /** O resumo em poucas palavras (sem dado pessoal). */
  detalhe: string | null;
  centavos: number | null;
  aluno: { id: string; nome: string | null; email: string } | null;
  /** Para onde a ficha leva: a conta, a assinatura sem conta, ou o visitante. */
  ficha: OndeLeva;
  fechadoEm: string | null;
  fechadoPor: QuemFezNoRegistro | null;
  nota: string | null;
  /** O conserto que o painel já faz para este caso (passo 3b) — ou nenhum ainda. */
  conserto: ConsertoDoCaso | null;
};

/** A resposta de `GET /api/admin/cobranca/casos`: uma página e quantos casos abertos há (e quantos urgentes). */
export type ListaDeCasos = { casos: CasoDaLista[]; temMais: boolean; abertos: number; urgentes: number };

/** Quantos casos por página. */
export const CASOS_POR_PAGINA = 50;

/** O que a tela pede: os abertos ou os fechados, e a página. */
export const casosQuerySchema = z.object({
  situacao: z.enum(["abertos", "fechados"]).default("abertos"),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
});

/** Fechar um caso: a nota é opcional (o que foi feito). */
export const fecharCasoSchema = z.object({ nota: z.string().trim().max(500).optional() });
export type FecharCasoInput = z.infer<typeof fecharCasoSchema>;

/** Uma ação do admin numa assinatura (passo 3a): pelo id do ESPELHO — nunca o da Stripe. */
export const acaoNaAssinaturaSchema = z.object({ assinatura: z.number().int().positive() });

/** O que uma ação fez, em poucas palavras (o que a Stripe respondeu). */
export type AcaoFeita = { detalhe: string };

/** O resultado de "Conferir na Stripe" pela ficha: se a pessoa ficou com acesso, e o que foi conferido. */
export type ConferenciaPelaFicha = { temAcesso: boolean; detalhe: string };

/** Os consertos que hoje só o painel da Stripe faz, a partir de um caso (passo 3b). */
export const CONSERTOS_DO_CASO = ["anular-cobranca", "soltar-agendamento", "encerrar-na-hora", "devolver-de-novo"] as const;
export type ConsertoDoCaso = (typeof CONSERTOS_DO_CASO)[number];
export const resolverCasoSchema = z.object({ acao: z.enum(CONSERTOS_DO_CASO) });

/** Corrigir o CPF ou CNPJ (passo 3b): de uma conta, ou da ficha de um visitante. O número é conferido no servidor. */
export const corrigirDocumentoSchema = z.union([
  z.object({ conta: z.string().min(1).max(100), documento: z.string().trim().min(1).max(30) }).strict(),
  z.object({ visitante: z.string().min(1).max(100), documento: z.string().trim().min(1).max(30) }).strict(),
]);

/** Os links que o admin manda ao aluno por e-mail (passo 3b) — os mesmos da ficha. */
export const LINKS_PARA_O_ALUNO = ["trocarCartao", "reativar", "pagarComPix"] as const;
export type LinkParaOAluno = (typeof LINKS_PARA_O_ALUNO)[number];
export const enviarLinkSchema = z.object({ conta: z.string().min(1).max(100), link: z.enum(LINKS_PARA_O_ALUNO) });

/**
 * DEVOLVER (bloco 4, passo 4a — decisões do operador P114 e P139). "Cancelar e devolver o dinheiro": a prévia diz quanto
 * volta (tudo o que falta voltar da assinatura, e de quantos pagamentos), e a ação leva o valor MOSTRADO — se o de agora
 * for outro, nada é feito.
 */
export type PreviaDaDevolucao = { centavos: number; moeda: string | null; pagamentos: number };
export const devolverTudoSchema = z.object({ assinatura: z.number().int().positive(), centavos: z.number().int().positive() }).strict();
/**
 * "Devolver um pagamento": uma cobrança da ficha, inteira ou em parte (P139: no máximo o que ainda não voltou). `encerrar`:
 * encerra agora a assinatura dessa cobrança, antes de devolver (decisão do operador, 31/10/2026: sem ela, devolver não mexe
 * no acesso — a regra das aulas libera a assinatura ativa sem olhar o pagamento).
 */
const cobrancaDaFichaSchema = z.string().regex(/^(ch|py)_[A-Za-z0-9_]+$/).max(100);
const doPagamento = { cobranca: cobrancaDaFichaSchema, centavos: z.number().int().positive(), encerrar: z.boolean().optional() };
export const devolverPagamentoSchema = z.union([
  z.object({ conta: z.string().min(1).max(100), ...doPagamento }).strict(),
  z.object({ visitante: z.string().min(1).max(100), ...doPagamento }).strict(),
]);
export type DevolverPagamentoInput = z.infer<typeof devolverPagamentoSchema>;

/** CORRIGIR O E-MAIL (passo 3c — decisão do operador P121): o e-mail certo da conta, para onde o código vai. */
export const pedirCodigoDoEmailSchema = z.object({ conta: z.string().min(1).max(100), email: enderecoDeEmailSchema }).strict();
export type PedirCodigoDoEmailInput = z.infer<typeof pedirCodigoDoEmailSchema>;
/** E o código de 6 números que a pessoa recebeu nele: só com ele a troca vale. */
export const corrigirEmailSchema = z.object({ conta: z.string().min(1).max(100), email: enderecoDeEmailSchema, codigo: z.string().trim().regex(/^\d{6}$/) }).strict();
export type CorrigirEmailInput = z.infer<typeof corrigirEmailSchema>;
/** O código saiu: vale por tantos minutos. */
export type CodigoDoEmailEnviado = { minutos: number };
/** A troca valeu: o e-mail da conta agora. */
export type EmailCorrigido = { email: string };
