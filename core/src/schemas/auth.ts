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
