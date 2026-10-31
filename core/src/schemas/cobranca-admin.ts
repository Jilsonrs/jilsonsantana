import { z } from "zod";

// O PAINEL DA COBRANÇA DO ADMIN (Fase 4, etapa 4.7b — decisões do operador, 31/10/2026). Só ADMIN lê e usa estes
// formatos; o aluno nunca os vê. O que vai ao navegador é o ESPELHO (o nosso banco) — os ids da Stripe ficam no
// servidor, e as ações (bloco 3) dizem a assinatura pelo id do espelho.

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
