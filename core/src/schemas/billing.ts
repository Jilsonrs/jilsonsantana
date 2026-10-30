import { z } from "zod";
import { MOTIVOS_DE_CANCELAMENTO, PLANOS, TAMANHO_DO_COMENTARIO } from "../constants/billing.js";
import { documentoFiscalSchema } from "./documento-fiscal.js";

/**
 * Corpo de `POST /api/billing/previa` — quanto fica a assinatura com um código promocional
 * (Fase 4, etapa 4.2). O site diz só QUAL plano e o código: preço e valor saem da Stripe, no
 * servidor. O código é aparado nas pontas (colado de e-mail, vem com espaço).
 */
export const previaSchema = z.object({
  plano: z.enum(PLANOS),
  codigo: z.string().trim().min(1).max(64),
});
export type PreviaInput = z.infer<typeof previaSchema>;

/**
 * Corpo de `POST /api/billing/assinatura` — assinar (Fase 4, etapa 4.2). O plano, o CPF ou CNPJ e,
 * se houver, o código promocional: a conta é a da sessão, e o preço é achado no servidor. Sem
 * código, o campo NÃO vem (vazio é recusado: a tela não manda o que o aluno não aplicou).
 */
export const assinarSchema = z.object({
  plano: z.enum(PLANOS),
  codigo: z.string().trim().min(1).max(64).optional(),
  // O CPF ou CNPJ, OBRIGATÓRIO (etapa 4.7, passo 6 — as duas telas iguais, decisão do operador de
  // 27/10/2026; obrigatório no servidor desde a publicação seguinte à da 6a): é ele que restringe a
  // venda ao Brasil. Vai para a FICHA DO CLIENTE na Stripe, nunca para os dados do cartão.
  documento: documentoFiscalSchema,
});
export type AssinarInput = z.infer<typeof assinarSchema>;
/** O corpo como a TELA o manda (o CPF ou CNPJ é o texto digitado; o servidor o confere e converte). */
export type CorpoDeAssinar = z.input<typeof assinarSchema>;

/**
 * Corpo de `POST /api/billing/minha-assinatura/cancelar` — parar a renovação (Fase 4, etapa 4.6).
 * Só o MOTIVO, e ele é opcional (decisão do operador, 11/10/2026): o botão de cancelar funciona
 * sem nada. O pedido NÃO diz qual assinatura — é a da conta da sessão. O comentário é aparado nas
 * pontas; vazio é o mesmo que não mandar.
 */
export const cancelarSchema = z.object({
  motivo: z.enum(MOTIVOS_DE_CANCELAMENTO).optional(),
  comentario: z.string().trim().max(TAMANHO_DO_COMENTARIO).optional(),
});
export type CancelarInput = z.infer<typeof cancelarSchema>;

/**
 * Corpo de `POST /api/billing/minha-assinatura/plano` — mudar de plano (Fase 4, etapa 4.6). Só
 * PARA QUAL plano e, na troca que vale na hora, o valor que a TELA MOSTROU (`valorMostrado`, em
 * centavos). O servidor o confere com a conta refeita na hora — tem que estar dentro da folga,
 * e nunca acima dela — e só então cobra o valor mostrado. Preço e assinatura nunca vêm do site,
 * e um valor inventado não passa na conferência.
 */
export const mudarDePlanoSchema = z.object({
  plano: z.enum(PLANOS),
  valorMostrado: z.number().int().min(0).optional(),
});
export type MudarDePlanoInput = z.infer<typeof mudarDePlanoSchema>;

/**
 * UM endereço de e-mail, aparado nas pontas, até 254 caracteres (o limite do padrão). É também o
 * que o balcão de e-mail (`server/src/lib/email.ts`) confere antes de enviar — lá, sem aparar:
 * o destinatário tem de chegar já limpo.
 */
export const enderecoDeEmailSchema = z.string().trim().email().max(254);

/**
 * A origem do visitante (o UTM do primeiro acesso, `utm_source`/`utm_campaign`): NUNCA recusa o
 * pedido — ela é conveniência de medição, e um valor estranho não pode impedir ninguém de assinar.
 * Aparada, cortada em 100 caracteres; vazia ou ausente, nada.
 */
const campoDeOrigem = z
  .string()
  .nullish()
  .catch(undefined)
  .transform((valor) => valor?.trim().slice(0, 100) || undefined);

/** Até quantos caracteres o nome da pessoa tem (etapa 4.7, passo 9). */
export const TAMANHO_DO_NOME = 100;

/**
 * Um nome de gente: palavras de LETRAS (com acento), separadas por um espaço, um hífen ou um apóstrofo, e um ponto só
 * no fim de uma palavra (abreviação: "Jr.", "M. Souza"). Fica de fora tudo o que serve a um golpe: dígito, `/ : @ $`,
 * endereço de site, e os caracteres invisíveis ou que invertem o texto — também os que o Unicode conta como letra ou
 * acento (o preenchimento do coreano, os seletores de variação: `Default_Ignorable_Code_Point`), e a palavra que não
 * começa por uma letra (um acento solto). Sem isso, o nome obrigatório passava visualmente vazio (revisão de
 * segurança, 30/10/2026).
 */
export const NOME_SO_COM_LETRAS = /^(?!.*\p{Default_Ignorable_Code_Point})\p{L}[\p{L}\p{M}]*\.?(?:[ '’-]\p{L}[\p{L}\p{M}]*\.?)*$/u;

/**
 * O NOME de quem assina sem conta (etapa 4.7, passo 9 — o campo "Seu nome", obrigatório na tela por
 * decisão do operador, 30/10/2026): aparado nas pontas, os espaços de dentro juntados num só, até 100
 * caracteres, e SÓ LETRAS (`NOME_SO_COM_LETRAS` — decisão do operador, 30/10/2026, depois de a revisão de
 * segurança mostrar o golpe: quem digita o e-mail de outra pessoa escrevia no nome "seu acesso foi
 * bloqueado, regularize em golpe.com.br", e o e-mail da escola o entregava). Vai para a conta e para o lead;
 * nunca para a Stripe (a fatura anulada guarda o que for para lá, e não se apaga) nem para o lembrete.
 */
export const nomeDaPessoaSchema = z
  .string()
  .trim()
  .min(1)
  .max(TAMANHO_DO_NOME)
  .transform((nome) => nome.replace(/\s+/gu, " "))
  .pipe(z.string().regex(NOME_SO_COM_LETRAS));

/**
 * Corpo de `POST /api/billing/visitante/assinatura` — assinar SEM CONTA (Fase 4, etapa 4.7, passo 4
 * — billing.md → *Assinar sem conta*). O site diz: o e-mail (com ele a conta nasce no pagamento), o
 * CPF ou CNPJ (obrigatório — conferido pelo dígito e guardado só na Stripe), o plano e o código, a
 * caixa "quero receber novidades" (desmarcada de fábrica) e a origem. `tentativa`: o código que o
 * servidor devolveu no clique anterior — com ele, o novo clique segue com a MESMA tentativa (o
 * cartão recusado e a nova tentativa não criam outra); sem ele, a tentativa anterior deste e-mail é
 * cancelada e nasce outra. Preço, valor e conta nunca vêm do navegador.
 */
export const assinarSemLoginSchema = z.object({
  // O nome (passo 9): OBRIGATÓRIO no servidor desde a publicação seguinte à do passo 9 — a aba aberta antes
  // dela, que não o mandava, já saiu (CLAUDE.md → Rendering Boundary, *API aditiva*), como o CPF fez na 6a.
  nome: nomeDaPessoaSchema,
  email: enderecoDeEmailSchema,
  documento: documentoFiscalSchema,
  plano: z.enum(PLANOS),
  codigo: z.string().trim().min(1).max(64).optional(),
  novidades: z.boolean(),
  origem: campoDeOrigem,
  campanha: campoDeOrigem,
  tentativa: z.string().trim().min(1).max(64).nullish().catch(undefined),
});
export type AssinarSemLoginInput = z.infer<typeof assinarSemLoginSchema>;
/** O corpo como a TELA PÚBLICA o manda (o CPF ou CNPJ é o texto digitado; o servidor o confere). */
export type CorpoDeAssinarSemLogin = z.input<typeof assinarSemLoginSchema>;

/**
 * Corpo de `POST /api/billing/pix` — pagar com PIX, pré-pago (etapa 4.9, passo 2; decisão do operador,
 * 28/10/2026). Só o plano e o CPF ou CNPJ: a conta é a da sessão, o preço se acha no servidor. SEM
 * código promocional (decisão (b) da etapa: o desconto é da assinatura, e o Pix é pagamento solto).
 */
export const pixSchema = z.object({
  plano: z.enum(PLANOS),
  documento: documentoFiscalSchema,
});
export type PixInput = z.infer<typeof pixSchema>;
export type CorpoDePix = z.input<typeof pixSchema>;

/**
 * Corpo de `POST /api/billing/minha-assinatura/pix` — pagar com Pix a cobrança ATRASADA (4.9b, E14; decisão do operador,
 * P118): só o CPF ou CNPJ. Qual assinatura se encerra e o plano do Pix são os da conta da sessão, lidos no servidor.
 */
export const pixDaAtrasadaSchema = z.object({
  documento: documentoFiscalSchema,
});
export type CorpoDePixDaAtrasada = z.input<typeof pixDaAtrasadaSchema>;

/**
 * Corpo de `POST /api/billing/visitante/pix` — pagar com Pix SEM CONTA: o mesmo pedido de assinar sem
 * login, sem o código promocional. `tentativa`: com ela, o novo clique segue com o MESMO Pix.
 */
export const pixSemLoginSchema = assinarSemLoginSchema.omit({ codigo: true });
export type PixSemLoginInput = z.infer<typeof pixSemLoginSchema>;
export type CorpoDePixSemLogin = z.input<typeof pixSemLoginSchema>;

/**
 * Corpo de `POST /api/billing/visitante/confirmacao` — "o pagamento já valeu?", a pergunta da tela de
 * depois do pagamento, que não tem login. Só o código da tentativa, que só quem a fez recebeu.
 */
export const confirmacaoSemLoginSchema = z.object({
  tentativa: z.string().trim().min(1).max(64),
});
export type ConfirmacaoSemLoginInput = z.infer<typeof confirmacaoSemLoginSchema>;

/**
 * Corpo de `POST /api/admin/assinaturas/sincronizar` — o admin força a sincronia de UMA conta com
 * a Stripe (Fase 4, etapa 4.4). Só o e-mail do aluno: quais assinaturas conferir é o servidor
 * que acha. Aparado nas pontas (colado de e-mail, vem com espaço).
 */
export const sincronizarContaSchema = z.object({
  email: enderecoDeEmailSchema,
});
export type SincronizarContaInput = z.infer<typeof sincronizarContaSchema>;

/**
 * Corpo de `POST /api/billing/campo-nao-abriu` — o campo de pagamento da Stripe não abriu na tela (E3 da revisão
 * ampla da cobrança, 29/10/2026). É o único jeito de o operador saber: o pedido de assinar nem chega ao servidor.
 * Só QUAL tela e QUAL falha, de listas fechadas — nada de texto livre, que iria para o registro e para o alerta.
 */
export const TELAS_DO_CAMPO = ["assinar", "assinar-sem-login", "trocar-cartao", "pagar-com-pix"] as const;
export type TelaDoCampo = (typeof TELAS_DO_CAMPO)[number];
export const campoNaoAbriuSchema = z.object({
  tela: z.enum(TELAS_DO_CAMPO),
  /** `nao-carregou`: o campo não ficou pronto no prazo (o Stripe.js nem chegou, ou travou); `erro-ao-carregar`: a Stripe disse que falhou. */
  motivo: z.enum(["nao-carregou", "erro-ao-carregar"]),
});
export type CampoNaoAbriuInput = z.infer<typeof campoNaoAbriuSchema>;
