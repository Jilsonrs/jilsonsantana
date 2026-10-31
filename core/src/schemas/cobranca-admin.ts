import { z } from "zod";
import type { MotivoDoCancelamento } from "../constants/billing.js";

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
