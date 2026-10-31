import { erroSemMensagem, stripe } from "./stripe-cliente.js";

// O DINHEIRO DO MÊS NA STRIPE (os números do mês do painel da cobrança — 4.7b, passo 6c, P143): o que entrou (as cobranças
// pagas, cartão e Pix) e o que foi devolvido, desde um instante. Só leitura; a lista inteira, pela paginação da biblioteca. A
// recusa sobe sem a mensagem crua.

/** A soma, em centavos, das cobranças PAGAS criadas desde `desde`. */
export async function entrouDesde(desde: Date): Promise<number> {
  try {
    let soma = 0;
    for await (const c of stripe().charges.list({ created: { gte: Math.floor(desde.getTime() / 1000) }, limit: 100 })) {
      if (c.paid && c.status === "succeeded") soma += c.amount;
    }
    return soma;
  } catch (erro) {
    throw erroSemMensagem(erro, "a soma das cobranças do mês");
  }
}

/** A soma, em centavos, das devoluções criadas desde `desde` — as que saíram ou estão saindo (não as que falharam). */
export async function devolvidoDesde(desde: Date): Promise<number> {
  try {
    let soma = 0;
    for await (const d of stripe().refunds.list({ created: { gte: Math.floor(desde.getTime() / 1000) }, limit: 100 })) {
      if (d.status !== "failed" && d.status !== "canceled") soma += d.amount;
    }
    return soma;
  } catch (erro) {
    throw erroSemMensagem(erro, "a soma das devoluções do mês");
  }
}
