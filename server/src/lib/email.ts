import { Resend } from "resend";
import { EMAIL_DE_SUPORTE, enderecoDeEmailSchema } from "@jilson/core";
import { montarEmail, type MensagemDeEmail } from "../views/email.js";
import { getDict } from "./dict.js";

// O BALCÃO DE CORREIO DA ESCOLA (etapa 4.7, passo 3). TODO e-mail que o site manda sai por aqui,
// e só este arquivo importa `resend` (há teste): trocar de fornecedor custa um arquivo.
//
// O REMETENTE (P49 — decisões do operador, 20/10/2026): a escola envia por um SUBDOMÍNIO,
// `alunos.jilsonsantana.com` — se um e-mail da escola for marcado como spam, a fama que sofre é a
// do subdomínio, não a do e-mail pessoal dele (`jilson@`, na Microsoft). A resposta do aluno vai
// para a caixa `suporte@jilsonsantana.com`, que é dele, na Microsoft. A parte antes do @ do
// remetente pode mudar a qualquer momento; o subdomínio, não (está configurado no Resend e no DNS).
//
// AS GARANTIAS, que quem chama pode assumir:
//   1. NUNCA LANÇA — nem na montagem do e-mail, que acontece aqui dentro. Falha vira
//      `{ enviado: false }` e uma linha `[email] …`, que é ALERTA (monitor.ts). Quem chama faz
//      `await enviarEmail(...)` e segue: o pagamento já confirmado não volta atrás por causa de um
//      e-mail (CLAUDE.md → Membership Gating). O `await` continua obrigatório (o lint reprova).
//   2. NÃO TRAVA: 10 s e desiste. Sem limite, um Resend lento seguraria o aviso da Stripe aberto.
//   3. NÃO EXPÕE: o registro leva o tipo, a `referencia` (ids NOSSOS) e o id do Resend — nunca o
//      destinatário nem o conteúdo (o "crie sua senha" carrega um link que dá acesso à conta).
//   4. SÓ PARA UM ENDEREÇO, e válido: `para` é o `User.email` lido do NOSSO banco (minúsculas),
//      nunca o que veio num aviso de fora. Fora disso, não envia. A ÚNICA exceção (decisão do operador, etapa 4.7,
//      passo 9): o lembrete de quem não terminou de assinar vai para o e-mail da FICHA (`guest_checkout`, também do nosso
//      banco), que ninguém provou — por isso ele leva só texto fixo, um por ficha (`lib/quem-nao-terminou.ts`).
//   5. SÓ PARA O RESEND: o endereço da API é fixo; uma `RESEND_BASE_URL` esquecida num `.env` não
//      desvia a chave e os links de acesso para outro servidor.
//
// COMO CHAMAR (o que a revisão de segurança de 20/10/2026 pediu para os próximos passos):
//   - DEPOIS do commit, FORA de transação e de trava. Dentro da trava da assinatura, os 10 s do
//     envio seguram uma conexão do banco — a falha que a etapa 4.7, passo 2, tirou do checkout.
//     E antes do commit, uma transação desfeita deixa no ar um e-mail com link para um token
//     que não existe.
//   - `chave` = `<tipo>/<id do evento da Stripe>` (ou outro id nosso). NUNCA token, endereço ou
//     e-mail. Com a mesma chave, o Resend devolve o envio anterior em vez de mandar outro, por 24 h
//     (context7 /websites/resend, 20/10/2026: "Keys expire after 24 hours and have a max length of
//     256 characters"); o mesmo e-mail com conteúdo DIFERENTE é recusado. Por isso o token de um
//     link é gravado antes e REAPROVEITADO na reentrega — gerar outro muda o conteúdo.
//   - `{ enviado: false, motivo: "duplicado" }` quer dizer que outro pedido com a mesma chave está
//     mandando o mesmo e-mail agora: não tente de novo, e não responda erro por isso.

export const REMETENTE = "Jilson Santana <suporte@alunos.jilsonsantana.com>";
export const RESPONDER_PARA = EMAIL_DE_SUPORTE;
const API_DO_RESEND = "https://api.resend.com";
const TEMPO_LIMITE_MS = 10_000;

/** Os e-mails que existem. Cada passo que cria um e-mail acrescenta o dele aqui. */
export type TipoDeEmail = "prova" | "codigo" | "boas-vindas" | "cobranca-falhou" | "antes-de-trancar" | "assinatura-cancelada" | "prepago-terminando" | "senha-criada" | "assinatura-confirmada" | "lembrete-da-assinatura" | "casos-urgentes" | "resumo-dos-casos";

export type PedidoDeEmail = {
  /** O `User.email` lido do NOSSO banco. */
  para: string;
  tipo: TipoDeEmail;
  mensagem: MensagemDeEmail;
  /** Ids NOSSOS, para o alerta dizer QUEM ficou sem o e-mail (`conta:abc evento:evt_1`). */
  referencia?: string;
  /** O mesmo e-mail não sai duas vezes com a mesma chave, por 24 h. Até 256 caracteres. */
  chave?: string;
};

export type Envio = { enviado: true; id: string } | { enviado: false; motivo: "duplicado" | "falhou" };

/** Um endereço só, inteiro em minúsculas e sem espaço — como o Better Auth grava a conta. */
function enderecoValido(para: string): boolean {
  return para === para.trim().toLowerCase() && enderecoDeEmailSchema.safeParse(para).success;
}

/** Só ids: letras, números e `_ : . / -` (e espaço entre eles). Um `@` não passa — e-mail não entra no registro. */
const REFERENCIA = /^[\w:./ -]{1,200}$/;
function rotulo(pedido: PedidoDeEmail): string {
  const referencia = pedido.referencia === undefined ? "" : REFERENCIA.test(pedido.referencia) ? ` (${pedido.referencia})` : " (referência fora do formato)";
  return `o e-mail "${pedido.tipo}"${referencia}`;
}

/** Manda o e-mail. Nunca lança: a falha volta como `{ enviado: false }` e vira alerta. */
export async function enviarEmail(pedido: PedidoDeEmail): Promise<Envio> {
  try {
    const chaveDaConta = process.env.RESEND_API_KEY;
    if (!chaveDaConta) {
      // Em produção, é configuração faltando: alguém precisa saber. Fora dela, é o normal (o CI e
      // quem não pôs a chave no `server/.env`).
      if (process.env.NODE_ENV === "production") console.error(`[email] ${rotulo(pedido)} não saiu: falta a RESEND_API_KEY`);
      else console.warn(`[email] ${rotulo(pedido)} não saiu: sem RESEND_API_KEY (fora de produção)`);
      return { enviado: false, motivo: "falhou" };
    }
    if (!enderecoValido(pedido.para)) {
      console.error(`[email] ${rotulo(pedido)} não saiu: o destinatário não é um endereço único e válido`);
      return { enviado: false, motivo: "falhou" };
    }

    const email = montarEmail(pedido.mensagem, (await getDict()).app.email);
    const { data, error } = await new Resend(chaveDaConta, { baseUrl: API_DO_RESEND }).emails.send(
      {
        from: REMETENTE,
        replyTo: RESPONDER_PARA,
        to: [pedido.para],
        subject: email.assunto,
        html: email.html,
        text: email.texto,
      },
      { idempotencyKey: pedido.chave, signal: AbortSignal.timeout(TEMPO_LIMITE_MS) },
    );
    if (error) {
      // Duas entregas do mesmo aviso ao mesmo tempo: o outro envio, com a mesma chave, é o que vale.
      if (error.name === "concurrent_idempotent_requests") {
        console.warn(`[email] ${rotulo(pedido)} já está saindo por outro pedido com a mesma chave`);
        return { enviado: false, motivo: "duplicado" };
      }
      // Só o tipo e o status do erro: a mensagem do Resend pode repetir o destinatário.
      console.error(`[email] ${rotulo(pedido)} não saiu: ${error.name}${error.statusCode ? `, status ${error.statusCode}` : ""}`);
      return { enviado: false, motivo: "falhou" };
    }
    if (!data) {
      console.error(`[email] ${rotulo(pedido)} não saiu: o Resend respondeu sem o id do envio`);
      return { enviado: false, motivo: "falhou" };
    }
    console.info(`[email] ${rotulo(pedido)} foi entregue ao Resend (${data.id})`);
    return { enviado: true, id: data.id };
  } catch (erro) {
    console.error(`[email] ${rotulo(pedido)} não saiu: falha inesperada (${erro instanceof Error ? erro.name : "sem tipo"})`);
    return { enviado: false, motivo: "falhou" };
  }
}
