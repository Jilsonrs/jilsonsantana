import { VALIDADE_DO_CODIGO_EM_MINUTOS } from "@jilson/core";
import { getDict } from "./dict.js";
import { enviarEmail } from "./email.js";
import { prisma } from "./prisma.js";

// O E-MAIL DO CÓDIGO (Fase 4, etapa 4.7, passo 5 — decisões do operador, 21/10/2026: o código de 6
// números "como a Apple e os grandes fazem"). É o `sendVerificationOTP` do recurso de código do
// Better Auth (`emailOTP`, em `lib/auth.ts`): ele gera o código, guarda só o resumo dele (nunca o
// número) e chama esta função para mandá-lo. Dois motivos, e só eles:
//   - "sign-in": ENTRAR sem senha ("Receber código de acesso", na tela de entrar);
//   - "forget-password": criar uma SENHA nova ("Esqueci minha senha").
// O código sai pelo balcão de e-mail (`enviarEmail`, com `await` — CLAUDE.md → Membership Gating),
// para o `User.email` lido do NOSSO banco, com o id da conta na referência — nunca o código, nunca o
// e-mail, no registro. Quem pede o código é a nossa rota (`routes/conta-codigo.ts`, com os limites);
// as rotas do próprio recurso para pedir código ficam desligadas.

/** Os motivos do código que a escola usa. Outro tipo que o Better Auth mande não sai. */
const MOTIVOS_DA_ESCOLA: ReadonlySet<string> = new Set(["sign-in", "forget-password"]);

/** Manda o código para a conta deste e-mail. Sem conta (o Better Auth já não chama), nada sai. */
export async function enviarCodigo({ email, otp, type }: { email: string; otp: string; type: string }): Promise<void> {
  if (!MOTIVOS_DA_ESCOLA.has(type)) {
    console.error(`[email] um código do tipo "${type}", que a escola não usa, foi pedido — não saiu`);
    return;
  }
  const conta = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, email: true } });
  if (!conta) return;
  const t = (await getDict()).app.email.codigo;
  const entrar = type === "sign-in";
  await enviarEmail({
    para: conta.email,
    tipo: "codigo",
    referencia: `conta:${conta.id}`,
    mensagem: {
      assunto: (entrar ? t.assuntoEntrar : t.assuntoSenha).replace("{codigo}", otp),
      titulo: entrar ? t.tituloEntrar : t.tituloSenha,
      paragrafos: [entrar ? t.textoEntrar : t.textoSenha, otp, t.validade.replace("{minutos}", String(VALIDADE_DO_CODIGO_EM_MINUTOS)), t.naoFoiVoce],
    },
  });
}
