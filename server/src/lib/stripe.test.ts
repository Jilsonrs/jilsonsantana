import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { paraAssinaturaNaStripe } from "./stripe.js";

// O ESPELHO A PARTIR DA STRIPE (Fase 4, etapa 4.1) — função pura, teste unitário (CLAUDE.md →
// Testing: só função pura, sem I/O). O que protege é o "PAGO ATÉ": quando a renovação falha, a
// Stripe já avançou o período antes de cobrar, e o fim dele é um mês NÃO pago — quem tivesse a
// assinatura cancelada por falta de pagamento ficaria com acesso até lá.

const DIA = 24 * 60 * 60;
const inicio = 1_800_000_000;
const fim = inicio + 30 * DIA;

type Fatura = { status: string } | string | null;
function assinatura({
  status = "active",
  fatura = { status: "paid" } as Fatura,
  itens = [{ current_period_start: inicio, current_period_end: fim }],
  metadata = {} as Record<string, string>,
  cliente = { id: "cus_1", metadata: {} as Record<string, string> } as { id: string; metadata: Record<string, string>; deleted?: true } | string,
  pausa = null as { behavior: string } | null,
  livemode = false,
} = {}): Stripe.Subscription {
  // Seguro: o objeto de teste tem só os campos que a função lê; a forma completa é da Stripe.
  return { id: "sub_1", status, latest_invoice: fatura, items: { data: itens }, metadata, customer: cliente, pause_collection: pausa, livemode } as unknown as Stripe.Subscription;
}

describe("o espelho a partir da assinatura da Stripe", () => {
  it("última fatura paga: pago até o FIM do período", () => {
    expect(paraAssinaturaNaStripe(assinatura()).pagoAte?.getTime()).toBe(fim * 1000);
  });

  it("última fatura NÃO paga (a renovação falhou): pago só até o COMEÇO do período", () => {
    for (const fatura of [{ status: "open" }, { status: "uncollectible" }, { status: "void" }, "in_sem_expandir", null]) {
      expect(paraAssinaturaNaStripe(assinatura({ status: "past_due", fatura })).pagoAte?.getTime()).toBe(inicio * 1000);
    }
  });

  it("sem item: sem data", () => {
    expect(paraAssinaturaNaStripe(assinatura({ itens: [] })).pagoAte).toBeNull();
  });

  it("a conta: o userId da assinatura; sem ele, o do cliente; cliente apagado ou só o id, nenhum", () => {
    expect(paraAssinaturaNaStripe(assinatura({ metadata: { userId: "u-assinatura" }, cliente: { id: "cus_1", metadata: { userId: "u-cliente" } } })).userId).toBe("u-assinatura");
    expect(paraAssinaturaNaStripe(assinatura({ cliente: { id: "cus_1", metadata: { userId: "u-cliente" } } })).userId).toBe("u-cliente");
    expect(paraAssinaturaNaStripe(assinatura({ cliente: { id: "cus_1", metadata: { userId: "u" }, deleted: true } })).userId).toBeNull();
    const soOId = paraAssinaturaNaStripe(assinatura({ cliente: "cus_9" }));
    expect([soOId.userId, soOId.clienteId]).toEqual([null, "cus_9"]);
  });

  it("o status vai como a Stripe diz (texto: o gate não quebra com status novo)", () => {
    expect(paraAssinaturaNaStripe(assinatura({ status: "algum_status_novo" })).status).toBe("algum_status_novo");
  });

  // A COBRANÇA PAUSADA (achado P1 da revisão de segurança, 09/10/2026): a Stripe mantém
  // `active` durante a pausa; no espelho vira `paused`, e o gate passa a olhar o "pago até".
  it("cobrança pausada: `paused` no espelho, mesmo com a Stripe dizendo `active`", () => {
    expect(paraAssinaturaNaStripe(assinatura({ status: "active", pausa: { behavior: "void" } })).status).toBe("paused");
    expect(paraAssinaturaNaStripe(assinatura({ status: "active" })).status).toBe("active");
  });

  it("modo de teste ou de verdade: vai como a Stripe diz", () => {
    expect(paraAssinaturaNaStripe(assinatura({ livemode: true })).livemode).toBe(true);
    expect(paraAssinaturaNaStripe(assinatura()).livemode).toBe(false);
  });
});
