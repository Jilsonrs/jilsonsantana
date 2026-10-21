import { z } from "zod";

// Client-side login form validation. The server's credential check is Better
// Auth's; this only guards the form UX (shared so it stays one source of truth).
//
// E-MAIL É TRIMADO, SENHA NÃO — e a assimetria é o ponto desta regra.
//
// `.trim()` no e-mail TRANSFORMA o valor: espaço nas pontas é sempre erro de
// digitação ou de colagem (o caso frequente é colar de um gerenciador de
// senhas), nunca intenção. Sem isso, `" a@b.com "` era rejeitado com "Informe um
// e-mail válido" para um e-mail que é válido — mensagem que manda a pessoa
// procurar o erro no lugar errado.
//
// `.refine()` na senha VALIDA sem transformar: rejeita a senha feita só de
// espaço em branco (que antes passava, porque `.min(1)` conta espaço como
// caractere — ia ao servidor e voltava como "e-mail ou senha incorretos", quando
// o problema era campo vazio). Mas os bytes digitados seguem intactos.
//
// Por que NUNCA `.trim()` na senha: senha com espaço nas pontas é legítima, e
// removê-lo tranca a pessoa para fora com a mensagem de credencial errada. O
// suporte nunca descobre o motivo, porque do lado de fora é indistinguível de
// senha errada de verdade.
export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .refine((value) => value.trim().length > 0, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * O CÓDIGO NO E-MAIL (Fase 4, etapa 4.7, passo 5 — decisões do operador, 21/10/2026: "como a Apple
 * e os grandes fazem"). Seis números, que valem 10 minutos e 3 tentativas: para ENTRAR sem senha
 * ("Receber código de acesso", na tela de entrar) e para criar uma SENHA nova ("Esqueci minha
 * senha"). Os mesmos números valem para o servidor (o Better Auth) e para os textos das telas.
 */
export const VALIDADE_DO_CODIGO_EM_MINUTOS = 10;
export const TENTATIVAS_DO_CODIGO = 3;
export const MOTIVOS_DO_CODIGO = ["entrar", "senha"] as const;
export type MotivoDoCodigo = (typeof MOTIVOS_DO_CODIGO)[number];

/**
 * Corpo de `POST /api/conta/codigo` — pedir o código. Só o e-mail (aparado) e para quê. A resposta é
 * a MESMA exista a conta ou não (quem pede não descobre nada), e nenhum código sai para e-mail sem
 * conta: entrar por código nunca cria conta.
 */
export const pedirCodigoSchema = z.object({
  email: z.string().trim().email().max(254),
  motivo: z.enum(MOTIVOS_DO_CODIGO),
});
export type PedirCodigoInput = z.infer<typeof pedirCodigoSchema>;

/** Resposta de `POST /api/conta/codigo`: sempre a mesma — o código foi enviado, SE o e-mail tiver conta. */
export type CodigoPedido = { ok: true };

/**
 * A SENHA NOVA (etapa 4.7, passo 5): de 8 a 128 caracteres — os mesmos números do Better Auth
 * (`lib/auth.ts` os fixa daqui). NUNCA aparada: espaço nas pontas é parte da senha (CLAUDE.md →
 * Client: trimar senha tranca gente para fora); só a senha feita só de espaços é recusada.
 */
export const TAMANHO_MINIMO_DA_SENHA = 8;
export const TAMANHO_MAXIMO_DA_SENHA = 128;
export const senhaNovaSchema = z
  .string()
  .min(TAMANHO_MINIMO_DA_SENHA)
  .max(TAMANHO_MAXIMO_DA_SENHA)
  .refine((valor) => valor.trim().length > 0, "SenhaVazia");

/**
 * Corpo de `POST /api/billing/visitante/senha` — criar a senha LOGO DEPOIS DE PAGAR, na própria tela
 * (decisão do operador, 21/10/2026). O código da tentativa — que só quem pagou naquela tela recebeu
 * — e a senha. A conta é a que nasceu daquele pagamento; nada mais vem do navegador.
 */
export const senhaDepoisDePagarSchema = z.object({
  tentativa: z.string().trim().min(1).max(64),
  senha: senhaNovaSchema,
});
export type SenhaDepoisDePagarInput = z.infer<typeof senhaDepoisDePagarSchema>;

/** Resposta de `POST /api/billing/visitante/senha`: a senha foi criada; `entrou`, a sessão já está aberta. */
export type SenhaCriada = { entrou: boolean };
