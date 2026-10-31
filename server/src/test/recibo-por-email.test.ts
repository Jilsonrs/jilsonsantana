import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { pt, type ReciboDaEscola } from "@jilson/core";
import type { PedidoDeEmail, Envio } from "../lib/email.js";
import type { AssinaturaNaStripe } from "../lib/stripe.js";

// O RECIBO POR E-MAIL (etapa 4.7b, passo 6a — decisões do operador, 31/10/2026). Na NOSSA fronteira: o recibo (que já tem
// teste próprio — `recibo.test.ts`) e o balcão de e-mail; a conta e o espelho rodam contra o banco. O que protege: o recibo
// em linhas, com os itens da tela e sem nome nem CPF; a renovação e a troca de plano mandam "Recebemos seu pagamento" UMA
// vez por recibo (a chave é o número), para o e-mail da conta, com o botão do recibo; a primeira cobrança, outra fatura que
// não é a última paga, a conta excluída e o pagamento sem recibo não mandam; a confirmação leva o recibo embaixo.
const reciboDoPagamento = vi.fn<(conta: string, pagamento: string) => Promise<ReciboDaEscola | null>>();
vi.mock("../lib/recibo.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/recibo.js")>()),
  reciboDoPagamento: (conta: string, pagamento: string) => reciboDoPagamento(conta, pagamento),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import { prisma } from "../lib/prisma.js";
import { caminhoDoRecibo, mandarReciboDoPagamento, pagamentoDaConfirmacao, reciboDoEmail } from "../lib/recibo-por-email.js";
import { montarEmail } from "../views/email.js";
import { montarAvisoDaCobranca } from "../views/email-da-cobranca.js";
import { SubscriptionEmailKind } from "../lib/prisma.js";

const S = `${Date.now()}`;
const conta = `recibo-email-${S}`;
const SUB = `sub_${S}_recibo_email`;
const recibo: ReciboDaEscola = {
  em: "2026-10-31T15:00:00.000Z",
  centavos: 4995,
  moeda: "brl",
  forma: "cartao",
  cartao: { bandeira: "visa", final: "4242" },
  situacao: "paga",
  devolvido: 0,
  numero: "81DD-3FD1-33E6-F9FB",
  plano: "mensal",
  periodo: { de: "2026-10-31T15:00:00.000Z", ate: "2026-11-30T15:00:00.000Z" },
  detalhe: { preco: 9990, descontos: [{ codigo: "BLACK50", centavos: 4995 }], credito: 0 },
};
const naStripe = (mudanca: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({ id: SUB, status: "active", pagoAte: new Date(Date.now() + 30 * 86_400_000), clienteId: `cus_${S}`, userId: conta, livemode: false, ultimaFaturaPaga: { fatura: "in_renovacao", pagamento: "pi_renovacao" }, ...mudanca });
const sem = (texto: string) => texto.replace(/ /g, " ");

beforeAll(async () => {
  await prisma.user.create({ data: { id: conta, email: `${conta}@teste.local`, name: "Ana Souza" } });
  await prisma.subscription.create({ data: { stripeSubscriptionId: SUB, stripeCustomerId: `cus_${S}`, ownerUserId: conta, status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000), plan: "mensal" } });
});
beforeEach(() => {
  reciboDoPagamento.mockReset().mockResolvedValue(recibo);
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});
afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: SUB } });
  await prisma.user.deleteMany({ where: { id: conta } });
});

describe("o recibo no e-mail", () => {
  it("o bloco do recibo: o número e a data, a escola, o plano e o período, o preço, o desconto, o total, a forma e as dúvidas — sem nome nem CPF", () => {
    const bloco = reciboDoEmail(recibo, pt.app.faturamento);
    const pares = (linhas: { rotulo: string; valor: string }[]) => linhas.map((l) => [l.rotulo, sem(l.valor)]);
    expect({ ...bloco, valores: pares(bloco.valores), pagamento: pares(bloco.pagamento) }).toEqual({
      titulo: "Recibo",
      numero: "Nº 81DD-3FD1-33E6-F9FB · 31/10/2026",
      escola: ["67.633.954 JILSON RODRIGUES DE SANTANA", "CNPJ 67.633.954/0001-02", "jilsonsantana.com"],
      item: "Assinatura Mensal",
      periodo: "31/10/2026 a 30/11/2026",
      // As duas caixas da tela (`ReciboPage`): os valores, e a forma com a situação.
      valores: [
        ["Preço", "R$ 99,90"],
        ["Desconto (BLACK50)", "−R$ 49,95"],
        ["Total pago", "R$ 49,95"],
      ],
      pagamento: [
        ["Forma de pagamento", "Cartão Visa final 4242"],
        ["Situação", "Paga"],
      ],
      nota: "Dúvidas sobre este recibo? Escreva para suporte@jilsonsantana.com.",
    });
    expect(caminhoDoRecibo(recibo)).toBe("/login?depois=recibo&recibo=81dd3fd133e6f9fb");
  });

  it("o modelo desenha o bloco (escapado) e o põe também na versão de texto puro", () => {
    const bloco = { ...reciboDoEmail(recibo, pt.app.faturamento), item: "<b>Assinatura</b>" };
    const { html, texto } = montarEmail({ assunto: "a", paragrafos: ["p"], recibo: bloco }, pt.app.email);
    expect(html).toContain("&lt;b&gt;Assinatura&lt;/b&gt;");
    expect(html).not.toContain("<b>Assinatura</b>");
    expect(html).toContain("Desconto (BLACK50)");
    // As duas caixas da tela: a dos valores e a da forma com a situação.
    expect(html).toContain("Cartão Visa final 4242");
    expect(html).toContain("Situação");
    expect(html).toContain("31/10/2026 a 30/11/2026");
    expect(sem(texto)).toContain("Desconto (BLACK50): −R$ 49,95");
    expect(sem(texto)).toContain("Situação: Paga");
    expect(texto).toContain("Nº 81DD-3FD1-33E6-F9FB · 31/10/2026");
  });

  it("o pagamento da confirmação: o Pix de que a pré-paga nasceu, senão o da última fatura paga", () => {
    expect(pagamentoDaConfirmacao({ pixPaymentIntentId: "pi_pix", ultimaFaturaPaga: { fatura: "in_1", pagamento: "pi_cartao" } })).toBe("pi_pix");
    expect(pagamentoDaConfirmacao({ pixPaymentIntentId: null, ultimaFaturaPaga: { fatura: "in_1", pagamento: "pi_cartao" } })).toBe("pi_cartao");
    expect(pagamentoDaConfirmacao({ pixPaymentIntentId: null, ultimaFaturaPaga: null })).toBeNull();
  });

  it("a renovação e a troca de plano: 'Recebemos seu pagamento' para o e-mail da conta, com o recibo e o botão — a chave é o número", async () => {
    for (const motivo of ["subscription_cycle", "subscription_update"]) {
      enviarEmail.mockClear();
      await mandarReciboDoPagamento(naStripe(), { id: "in_renovacao", motivo });
      expect(enviarEmail).toHaveBeenCalledTimes(1);
      const pedido = enviarEmail.mock.calls[0]?.[0];
      expect([pedido?.para, pedido?.tipo, pedido?.chave]).toEqual([`${conta}@teste.local`, "pagamento-recebido", "pagamento-recebido/81DD-3FD1-33E6-F9FB"]);
      expect(pedido?.mensagem.assunto).toBe("Recebemos seu pagamento");
      expect(pedido?.mensagem.paragrafos).toEqual(["Recebemos o pagamento da sua assinatura. O recibo está aqui embaixo."]);
      expect(pedido?.mensagem.recibo).toEqual(reciboDoEmail(recibo, pt.app.faturamento));
      expect(pedido?.mensagem.botao?.texto).toBe("Ver o recibo para imprimir");
      const botao = new URL(pedido?.mensagem.botao?.endereco ?? "http://x/");
      expect(botao.pathname + botao.search).toBe("/login?depois=recibo&recibo=81dd3fd133e6f9fb");
    }
    expect(reciboDoPagamento).toHaveBeenCalledWith(conta, "pi_renovacao");
  });

  it("a primeira cobrança (vai na confirmação), outra fatura que não é a última paga, a conta excluída e o pagamento sem recibo: nada sai", async () => {
    await mandarReciboDoPagamento(naStripe(), { id: "in_renovacao", motivo: "subscription_create" });
    await mandarReciboDoPagamento(naStripe(), { id: "in_outra", motivo: "subscription_cycle" });
    await mandarReciboDoPagamento(naStripe({ ultimaFaturaPaga: null }), { id: "in_renovacao", motivo: "subscription_cycle" });
    reciboDoPagamento.mockResolvedValueOnce(null);
    await mandarReciboDoPagamento(naStripe(), { id: "in_renovacao", motivo: "subscription_cycle" });
    await prisma.user.update({ where: { id: conta }, data: { deletedAt: new Date() } });
    try {
      await mandarReciboDoPagamento(naStripe(), { id: "in_renovacao", motivo: "subscription_cycle" });
    } finally {
      await prisma.user.update({ where: { id: conta }, data: { deletedAt: null } });
    }
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("o recibo que falha na Stripe não derruba nada: o e-mail não sai, e ninguém recebe erro", async () => {
    reciboDoPagamento.mockRejectedValueOnce(new Error("fora do ar"));
    await expect(mandarReciboDoPagamento(naStripe(), { id: "in_renovacao", motivo: "subscription_cycle" })).resolves.toBeUndefined();
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it("a confirmação leva o recibo embaixo do texto, e o link para imprimir depois do botão", () => {
    const bloco = reciboDoEmail(recibo, pt.app.faturamento);
    const mensagem = montarAvisoDaCobranca({ tipo: SubscriptionEmailKind.CONFIRMADA, referencia: "inicio", trancaEm: null }, { plano: "mensal", proximaTentativa: null, encerradaSemPagamento: false }, new Date(), pt.app.email, () => "https://www.jilsonsantana.com/x", false, { recibo: bloco, endereco: "https://www.jilsonsantana.com/recibo" });
    expect(mensagem.paragrafos).toHaveLength(1);
    expect(mensagem.recibo).toEqual(bloco);
    expect(mensagem.depoisDoBotao).toEqual([{ link: "Ver o recibo para imprimir", endereco: "https://www.jilsonsantana.com/recibo" }]);
  });
});
