import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type { AssinaturaNaStripe } from "../lib/stripe.js";

// A CONFERÊNCIA DIÁRIA DAS ATIVAS VENCIDAS (E6 da revisão ampla da cobrança, 29/10/2026). A Stripe na NOSSA fronteira
// (o que ela diz de cada assinatura) vira dublê; a sincronia roda de verdade, contra o banco. O que protege: a ativa no
// site com o período vencido há mais de 2 dias é relida na Stripe e o espelho fica como ela diz; ALERTA a que continua
// ativa sem período pago (o reembolso pelo painel sem cancelar, P114), a encerrada na Stripe (as aulas abertas para
// quem saiu) e a que a Stripe não conhece; a que renovou fica no registro; a vencida há pouco não é conferida; a falha
// fica para amanhã, com um alerta só; o prazo; a hora do dia.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import { prisma } from "../lib/prisma.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { AssinaturaNaoEncontrada } from "../lib/stripe.js";
import { conferirAtivasVencidas, ehHoraDaConferenciaDasAtivas, FOLGA_DA_ATIVA_VENCIDA_EM_MS } from "../lib/ativas-vencidas.js";
import { sincronizarAssinatura } from "../lib/assinaturas.js";

const casoDe = (kind: "ATIVA_SEM_PERIODO_PAGO" | "DIVERGENCIA", id: string) => prisma.billingCase.findUnique({ where: { kind_key: { kind, key: `sub:${id}` } } });

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const AGORA = new Date();
const dono = `ativas-${S}`;
let n = 0;
const novaId = () => `sub_ativas_${S}_${++n}`;
const naStripe = (id: string, dados: Partial<AssinaturaNaStripe>): AssinaturaNaStripe => ({ id, status: "active", pagoAte: new Date(AGORA.getTime() + 25 * DIA), clienteId: "cus_ativas", userId: dono, livemode: false, ...dados });
/** Uma assinatura ATIVA no espelho, com o período pago vencido há tantos dias. */
async function ativaVencida(dias: number, ownerUserId: string = dono): Promise<string> {
  const id = novaId();
  await prisma.subscription.create({ data: { stripeSubscriptionId: id, ownerUserId, status: "active", currentPeriodEnd: new Date(AGORA.getTime() - dias * DIA), livemode: false } });
  return id;
}
const espelho = (id: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } });
/** As linhas de alerta da conferência que citam esta assinatura. */
const alertasDe = (erro: { mock: { calls: unknown[][] } }, id: string) => erro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] rodada:") && texto.includes(id));

beforeAll(async () => {
  await prisma.user.createMany({ data: [{ id: dono, email: `${dono}@teste.local` }, { id: `${dono}-apagado`, email: `${dono}-apagado@teste.local`, deletedAt: new Date() }] });
});
beforeEach(() => {
  // O que este teste não combinou (uma assinatura de outro arquivo que ficou no banco): renovada, sem alerta.
  buscarAssinatura.mockReset().mockImplementation(async (id) => naStripe(id, {}));
});
afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `ativas_${S}` } } });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [dono, `${dono}-apagado`] } } });
});

describe("a conferência diária das assinaturas ativas vencidas", () => {
  it("a Stripe diz ativa, sem período pago (o reembolso pelo painel sem cancelar): ALERTA — a pessoa continua com as aulas", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = await ativaVencida(5);
    buscarAssinatura.mockImplementation(async (pedido) => naStripe(pedido, pedido === id ? { pagoAte: new Date(AGORA.getTime() - 20 * DIA) } : {}));
    const r = await conferirAtivasVencidas(AGORA);
    expect(r).toMatchObject({ semPeriodoPago: 1, encerradas: 0, desconhecidas: 0, falhas: 0 });
    expect(alertasDe(erro, id)).toHaveLength(1);
    expect(alertasDe(erro, id)[0]).toContain("sem período pago");
    expect(await espelho(id)).toMatchObject({ status: "active", currentPeriodEnd: new Date(AGORA.getTime() - 20 * DIA) });
    // O caso (4.7b, bloco 2): aberto; e fecha sozinho quando a sincronia mostra a assinatura cancelada.
    expect(await casoDe("ATIVA_SEM_PERIODO_PAGO", id)).toMatchObject({ open: true, urgent: false, stripeSubscriptionId: id });
    buscarAssinatura.mockImplementation(async (pedido) => naStripe(pedido, { status: "canceled", pagoAte: new Date(AGORA.getTime() - 20 * DIA) }));
    await sincronizarAssinatura(id);
    expect(await casoDe("ATIVA_SEM_PERIODO_PAGO", id)).toMatchObject({ open: false, closedBy: "STRIPE" });
  });

  it("a Stripe diz cancelada (o aviso do fim se perdeu): ALERTA, o espelho fica cancelado e as aulas fecham", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = await ativaVencida(5);
    buscarAssinatura.mockImplementation(async (pedido) => naStripe(pedido, pedido === id ? { status: "canceled", pagoAte: new Date(AGORA.getTime() - 5 * DIA) } : {}));
    expect(await temAcessoAtivo(dono)).toBe(true);
    const r = await conferirAtivasVencidas(AGORA);
    expect(r).toMatchObject({ encerradas: 1, semPeriodoPago: 0 });
    expect(alertasDe(erro, id)).toHaveLength(1);
    expect(alertasDe(erro, id)[0]).toContain("a Stripe diz canceled");
    expect(await espelho(id)).toMatchObject({ status: "canceled" });
    expect(await temAcessoAtivo(dono)).toBe(false);
  });

  it("renovou e o espelho não sabia: só no registro, e o espelho ganha a data nova", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    const id = await ativaVencida(5);
    const r = await conferirAtivasVencidas(AGORA);
    expect(r.renovadas).toBeGreaterThanOrEqual(1);
    expect(alertasDe(erro, id)).toEqual([]);
    expect(registro.mock.calls.some(([texto]) => String(texto).includes(id) && String(texto).includes("tinha renovado"))).toBe(true);
    expect(await espelho(id)).toMatchObject({ status: "active", currentPeriodEnd: new Date(AGORA.getTime() + 25 * DIA) });
  });

  it("vencida há menos de 2 dias, ou de uma conta apagada: nem vai à Stripe", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(FOLGA_DA_ATIVA_VENCIDA_EM_MS).toBe(2 * DIA);
    const recente = await ativaVencida(1.5);
    const apagada = await ativaVencida(5, `${dono}-apagado`);
    await conferirAtivasVencidas(AGORA);
    const pedidas = buscarAssinatura.mock.calls.map(([id]) => id);
    expect(pedidas).not.toContain(recente);
    expect(pedidas).not.toContain(apagada);
  });

  it("a Stripe não conhece a assinatura: ALERTA (as aulas continuam abertas)", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = await ativaVencida(5);
    buscarAssinatura.mockImplementation(async (pedido) => {
      if (pedido === id) throw new AssinaturaNaoEncontrada(pedido);
      return naStripe(pedido, {});
    });
    const r = await conferirAtivasVencidas(AGORA);
    expect(r.desconhecidas).toBe(1);
    expect(alertasDe(erro, id)).toHaveLength(1);
    expect(alertasDe(erro, id)[0]).toContain("não conhece");
    expect(await casoDe("DIVERGENCIA", id)).toMatchObject({ open: true, urgent: false });
  });

  it("a Stripe não respondeu: a falha conta, fica no registro e há UM alerta no fim — o espelho não muda", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    const id = await ativaVencida(5);
    buscarAssinatura.mockImplementation(async (pedido) => {
      if (pedido === id) throw new Error("[stripe] a busca da assinatura falhou: api_error, status 500");
      return naStripe(pedido, {});
    });
    const r = await conferirAtivasVencidas(AGORA);
    expect(r.falhas).toBe(1);
    expect(registro.mock.calls.some(([texto]) => String(texto).includes(id) && String(texto).includes("fica para amanhã"))).toBe(true);
    expect(erro.mock.calls.filter(([texto]) => String(texto).includes("a conferência diária das assinaturas ativas vencidas falhou"))).toHaveLength(1);
    expect(await espelho(id)).toMatchObject({ status: "active", currentPeriodEnd: new Date(AGORA.getTime() - 5 * DIA) });
  });

  it("o prazo acabou: o que falta fica para amanhã, sem ir à Stripe", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const id = await ativaVencida(5);
    const r = await conferirAtivasVencidas(AGORA, 0);
    expect(r.adiadas).toBeGreaterThanOrEqual(1);
    expect(buscarAssinatura).not.toHaveBeenCalled();
    expect(await espelho(id)).toMatchObject({ status: "active" });
  });

  it("a hora: só a rodada das 12h UTC (9h no Brasil) faz a conferência", () => {
    expect(ehHoraDaConferenciaDasAtivas(new Date("2026-10-30T12:00:00Z"))).toBe(true);
    expect(ehHoraDaConferenciaDasAtivas(new Date("2026-10-30T12:59:59Z"))).toBe(true);
    expect(ehHoraDaConferenciaDasAtivas(new Date("2026-10-30T11:59:59Z"))).toBe(false);
    expect(ehHoraDaConferenciaDasAtivas(new Date("2026-10-30T13:00:00Z"))).toBe(false);
  });
});
