import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";
import type { AssinaturaNaStripe } from "../lib/stripe.js";

// A CONFERÊNCIA DOS AVISOS DA STRIPE NA RODADA (E1 da revisão ampla da cobrança, 29/10/2026). A Stripe na NOSSA
// fronteira: a lista dos avisos e o que ela diz da assinatura viram dublê; a rotina do aviso roda de verdade, contra
// o banco. O que protege: o aviso que o site não registrou é processado pela MESMA rotina (o espelho nasce, o aviso
// fica marcado) e sai UM alerta; o já marcado não é processado de novo; o que falha de novo fica sem marca, para a
// próxima rodada; a lista que falha alerta; o mais velho vai primeiro; o prazo para a conferência.
const avisosDaStripe = vi.fn<(desde: Date, ate: Date, maximo: number) => Promise<Stripe.Event[]>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  avisosDaStripe: (desde: Date, ate: Date, maximo: number) => avisosDaStripe(desde, ate, maximo),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import { prisma } from "../lib/prisma.js";
import { conferirAvisosPerdidos, ESPERA_DA_ENTREGA_MS, JANELA_DA_CONFERENCIA_MS, MAXIMO_DA_LISTA } from "../lib/avisos-perdidos.js";

const S = `${Date.now()}`;
const assinante = `perdidos-${S}`;
const DIA = 24 * 60 * 60 * 1000;
const AGORA = Date.now();
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_perdidos_${S}_${++n}`;

/** Um aviso da assinatura como a lista da Stripe o devolve (`created` em segundos). */
const avisoDaAssinatura = (subId: string, criadoHaMs: number): Stripe.Event =>
  // Seguro: o objeto de teste tem só os campos que a rotina lê; a forma completa é da Stripe.
  ({ id: novoId("evt"), object: "event", type: "customer.subscription.updated", created: Math.floor((AGORA - criadoHaMs) / 1000), data: { object: { id: subId, object: "subscription" } } }) as unknown as Stripe.Event;
const naStripe = (subId: string): AssinaturaNaStripe => ({ id: subId, status: "active", pagoAte: new Date(AGORA + 30 * DIA), clienteId: "cus_perdidos", userId: assinante, livemode: false });
const espelho = (subId: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: subId } });
const marcado = (eventoId: string) => prisma.stripeEvent.findUnique({ where: { id: eventoId } });
/** As linhas de alerta da conferência (as `[stripe] rodada: …` que saem como erro). */
const alertas = (erro: { mock: { calls: unknown[][] } }) => erro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] rodada:"));

beforeAll(async () => {
  await prisma.user.create({ data: { id: assinante, email: `${assinante}@teste.local` } });
});
beforeEach(() => {
  avisosDaStripe.mockReset().mockResolvedValue([]);
  buscarAssinatura.mockReset().mockImplementation(async (id) => naStripe(id));
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `perdidos_${S}` } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: `perdidos_${S}` } } });
  await prisma.user.deleteMany({ where: { id: assinante } });
});

describe("a conferência dos avisos da Stripe na rodada", () => {
  it("pede à Stripe os avisos dos últimos 3 dias até 10 min atrás (a entrega normal ainda pode estar chegando)", async () => {
    await conferirAvisosPerdidos(AGORA);
    expect(avisosDaStripe).toHaveBeenCalledWith(new Date(AGORA - JANELA_DA_CONFERENCIA_MS), new Date(AGORA - ESPERA_DA_ENTREGA_MS), MAXIMO_DA_LISTA);
    expect(JANELA_DA_CONFERENCIA_MS).toBe(3 * DIA);
    expect(ESPERA_DA_ENTREGA_MS).toBe(10 * 60 * 1000);
  });

  it("o aviso que o site não registrou é processado pela mesma rotina — o espelho nasce e o aviso fica marcado —, com UM alerta; o já marcado não é processado de novo; na rodada seguinte, nada", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const perdida = novoId("sub");
    const vista = novoId("sub");
    const perdido = avisoDaAssinatura(perdida, 2 * 60 * 60 * 1000);
    const visto = avisoDaAssinatura(vista, 3 * 60 * 60 * 1000);
    await prisma.stripeEvent.create({ data: { id: visto.id, type: visto.type } });
    avisosDaStripe.mockResolvedValue([perdido, visto]);

    expect(await conferirAvisosPerdidos(AGORA)).toEqual({ conferidos: 2, perdidos: 1, processados: 1, falhas: 0, adiados: 0, formatoAntigo: 0 });
    expect(await espelho(perdida)).toMatchObject({ ownerUserId: assinante, status: "active" });
    expect(await marcado(perdido.id)).not.toBeNull();
    expect(await espelho(vista)).toBeNull();
    expect(buscarAssinatura.mock.calls).toEqual([[perdida]]);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("não processou");

    expect(await conferirAvisosPerdidos(AGORA)).toEqual({ conferidos: 2, perdidos: 0, processados: 0, falhas: 0, adiados: 0, formatoAntigo: 0 });
    expect(alertas(erro)).toHaveLength(1);
    expect(buscarAssinatura).toHaveBeenCalledTimes(1);
  });

  it("o mais velho primeiro (a lista vem dos mais novos): a ordem em que a Stripe os teria entregado", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const velha = novoId("sub");
    const nova = novoId("sub");
    avisosDaStripe.mockResolvedValue([avisoDaAssinatura(nova, 60 * 60 * 1000), avisoDaAssinatura(velha, 5 * 60 * 60 * 1000)]);
    await conferirAvisosPerdidos(AGORA);
    expect(buscarAssinatura.mock.calls).toEqual([[velha], [nova]]);
  });

  it("a Stripe não respondeu ao processar: a falha conta, o aviso fica SEM marca e há o alerta da falha — na rodada seguinte, com a Stripe de volta, ele é processado", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const sub = novoId("sub");
    const aviso = avisoDaAssinatura(sub, 60 * 60 * 1000);
    avisosDaStripe.mockResolvedValue([aviso]);
    buscarAssinatura.mockRejectedValueOnce(new Error("[stripe] a busca da assinatura falhou: api_error, status 500"));

    expect(await conferirAvisosPerdidos(AGORA)).toEqual({ conferidos: 1, perdidos: 1, processados: 0, falhas: 1, adiados: 0, formatoAntigo: 0 });
    expect(await marcado(aviso.id)).toBeNull();
    expect(alertas(erro)).toHaveLength(2);
    expect(alertas(erro)[1]).toContain("falharam também na rodada");

    expect(await conferirAvisosPerdidos(AGORA)).toMatchObject({ perdidos: 1, processados: 1, falhas: 0 });
    expect(await marcado(aviso.id)).not.toBeNull();
    expect(await espelho(sub)).toMatchObject({ status: "active" });
  });

  it("a lista da Stripe falhou: UM alerta, a falha conta, e nada é processado", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    avisosDaStripe.mockRejectedValue(new Error("[stripe] a lista dos avisos da Stripe falhou: api_error, status 500"));
    expect(await conferirAvisosPerdidos(AGORA)).toEqual({ conferidos: 0, perdidos: 0, processados: 0, falhas: 1, adiados: 0, formatoAntigo: 0 });
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("não consegui conferir os avisos da Stripe");
    expect(buscarAssinatura).not.toHaveBeenCalled();
  });

  it("o prazo da conferência acabou: o que falta fica para a próxima rodada, sem marca", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    const aviso = avisoDaAssinatura(novoId("sub"), 60 * 60 * 1000);
    avisosDaStripe.mockResolvedValue([aviso]);
    expect(await conferirAvisosPerdidos(AGORA, 0)).toEqual({ conferidos: 1, perdidos: 1, processados: 0, falhas: 0, adiados: 1, formatoAntigo: 0 });
    expect(await marcado(aviso.id)).toBeNull();
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(registro.mock.calls.some(([texto]) => String(texto).includes("ficaram para a próxima rodada"))).toBe(true);
  });

  // C3 da revisão do grupo 1 (29/10/2026): o aviso listado pela API vem na versão de quando nasceu — a fatura de antes
  // da 2025-03-31.basil não traz o "parent", e processada assim seria marcada "sem assinatura".
  it("o aviso de fatura num formato antigo da API: NÃO processado nem marcado, com um alerta; o de formato novo, sim", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const antiga = novoId("sub");
    const nova = novoId("sub");
    const daFatura = (sub: string, formatoNovo: boolean): Stripe.Event =>
      // Seguro: o objeto de teste tem só os campos que a rotina lê; a forma completa é da Stripe.
      ({ id: novoId("evt"), object: "event", type: "invoice.paid", api_version: formatoNovo ? "2026-09-30.endive" : "2024-06-20", created: Math.floor((AGORA - 60 * 60 * 1000) / 1000), data: { object: formatoNovo ? { id: novoId("in"), object: "invoice", parent: { subscription_details: { subscription: sub } } } : { id: novoId("in"), object: "invoice", subscription: sub } } }) as unknown as Stripe.Event;
    const velho = daFatura(antiga, false);
    const novo = daFatura(nova, true);
    avisosDaStripe.mockResolvedValue([velho, novo]);
    expect(await conferirAvisosPerdidos(AGORA)).toEqual({ conferidos: 2, perdidos: 2, processados: 1, falhas: 0, adiados: 0, formatoAntigo: 1 });
    expect(await marcado(velho.id)).toBeNull();
    expect(await marcado(novo.id)).not.toBeNull();
    expect(buscarAssinatura.mock.calls).toEqual([[nova]]);
    expect(alertas(erro).some((linha) => linha.includes("formato antigo da API"))).toBe(true);
  });

  it("nada sem registro: nenhum alerta, nada processado", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await conferirAvisosPerdidos(AGORA)).toEqual({ conferidos: 0, perdidos: 0, processados: 0, falhas: 0, adiados: 0, formatoAntigo: 0 });
    expect(alertas(erro)).toEqual([]);
  });
});
