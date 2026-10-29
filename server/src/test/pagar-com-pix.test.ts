import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import type { DocumentoFiscal } from "@jilson/core";
import type { AssinaturaNaStripe, AssinaturaNoCheckout, PedidoDeAssinatura, PrecoDoPlano } from "../lib/stripe.js";
import type { PagamentoPixCriado, PedidoDePix, PixPendente } from "../lib/stripe-pix.js";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. Uma "Stripe de mentira" guarda as
// assinaturas e os pagamentos Pix de cada cliente, para a regra de verdade (a trava, a ficha, a
// tentativa, um QR por vez) rodar contra o banco de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarCodigo = vi.fn<(codigo: string) => Promise<null>>();
const criarCliente = vi.fn<(conta: { userId: string; email: string; nome: string | null }) => Promise<{ id: string; livemode: boolean }>>();
const criarClienteDoVisitante = vi.fn<(cliente: { pedido: string; email: string; documento: DocumentoFiscal }) => Promise<{ id: string; livemode: boolean }>>();
const acertarNumeroFiscal = vi.fn<(clienteId: string, documento: DocumentoFiscal) => Promise<boolean>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
const cancelarIncompleta = vi.fn<(id: string) => Promise<string>>();
const criarAssinatura = vi.fn<(pedido: PedidoDeAssinatura) => Promise<AssinaturaNoCheckout | null>>();
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarCodigo: (codigo: string) => buscarCodigo(codigo),
  criarCliente: (conta: { userId: string; email: string; nome: string | null }) => criarCliente(conta),
  criarClienteDoVisitante: (cliente: { pedido: string; email: string; documento: DocumentoFiscal }) => criarClienteDoVisitante(cliente),
  acertarNumeroFiscal: (clienteId: string, documento: DocumentoFiscal) => acertarNumeroFiscal(clienteId, documento),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
  criarAssinatura: (pedido: PedidoDeAssinatura) => criarAssinatura(pedido),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));
const criarPagamentoPix = vi.fn<(pedido: PedidoDePix) => Promise<PagamentoPixCriado>>();
const pagamentosPixPendentes = vi.fn<(clienteId: string) => Promise<PixPendente[]>>();
const cancelarPagamentoPix = vi.fn<(id: string) => Promise<void>>();
// O que o checkout por CARTÃO chama (um pagamento aberto por vez): a função de verdade tem teste de rede próprio.
const cancelarPagamentosPixPendentes = vi.fn<(clienteId: string) => Promise<number>>();
vi.mock("../lib/stripe-pix.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-pix.js")>()),
  criarPagamentoPix: (pedido: PedidoDePix) => criarPagamentoPix(pedido),
  pagamentosPixPendentes: (clienteId: string) => pagamentosPixPendentes(clienteId),
  cancelarPagamentoPix: (id: string) => cancelarPagamentoPix(id),
  cancelarPagamentosPixPendentes: (clienteId: string) => cancelarPagamentosPixPendentes(clienteId),
}));
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { DocumentoRecusado } from "../lib/stripe.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { assinaturasAoMesmoTempo, comVaga } from "../lib/assinaturas-em-andamento.js";
import { temAcessoAtivo } from "../lib/acesso.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";

// PAGAR COM PIX, PRÉ-PAGO (Fase 4, etapa 4.9, passo 2 — decisões do operador, 28/10/2026). O que
// estes testes protegem — é a fronteira de dinheiro, nas duas portas (logado e sem conta):
//   - nada responde sem o Pix configurado; com login, nada sem sessão; o corpo não escolhe preço,
//     cliente nem conta, e o código promocional não existe aqui (o Pix é sempre o preço cheio);
//   - quem JÁ TEM ACESSO não paga de novo; quem a Stripe diz que já assina (o aviso atrasou) é
//     SINCRONIZADO — sem QR —; a cobrança atrasada manda trocar o cartão;
//   - UM QR POR VEZ: o novo clique do mesmo plano é o mesmo QR; o de outro plano cancela o anterior;
//     o visitante só segue com o QR da MESMA tentativa (sem o código, o anterior morre);
//   - UM PAGAMENTO ABERTO POR VEZ, nos dois sentidos: o Pix cancela o cartão começado e não pago, e
//     o checkout por cartão cancela o Pix à espera;
//   - o CPF ou CNPJ vai para a ficha do cliente antes do QR, também no reaproveitado;
//   - NADA grava o espelho: a assinatura nasce quando o Pix cai (`pix-pre-pago.test.ts`);
//   - dois cliques ao mesmo tempo: "ocupada" na hora; o teto de "ao mesmo tempo"; os limites sem login.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const CPF = "529.982.247-25";
const CPF_LIMPO = "52998224725";
const OUTRO_CPF = "111.444.777-35";
const PMC = "pmc_so_pix_da_suite";
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_PIX_CONFIGURATION"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));

let member: string[] = [];
let memberId = "";
let memberEmail = "";
let n = 0;
const novoEmail = () => `pix-${++n}-${S}@teste.local`;
// TEST-NET-3: fora da faixa que os outros arquivos usam (198.51.100.x) — a contagem por endereço é no banco, e os arquivos dividem o banco.
let enderecos = 0;
const novoEndereco = () => `203.0.113.${++enderecos}`;
/** O resumo que a ficha e a Stripe guardam: o SHA-256 da tentativa, em hexadecimal — calculado aqui, à parte. */
const sha256 = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");

/** A Stripe de mentira: as assinaturas e os pagamentos Pix de cada cliente. */
type SubNaStripe = AssinaturaNoCheckout & { cliente: string };
type PixNaStripe = PixPendente & { cliente: string; status: string; pedido: PedidoDePix };
let naStripe: SubNaStripe[] = [];
let pixNaStripe: PixNaStripe[] = [];
// Os clientes criados: um id novo por teste INTEIRO — a ficha do visitante guarda o id e é única por cliente.
let clientes = 0;
const incompleta = (id: string, cliente: string, precoId = "price_mensal"): SubNaStripe => ({ id, cliente, status: "incomplete", precoId, codigoId: null, segredoDoPagamento: `pi_${id}_secret_x`, segredoDoCartao: null });
const viva = (id: string, cliente: string, status = "active"): SubNaStripe => ({ id, cliente, status, precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null });
/** O que a sincronia ouve da Stripe sobre a assinatura viva. */
const dizAStripe = (id: string, clienteId: string, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
  id,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId,
  userId: memberId,
  livemode: false,
  ...dados,
});

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const pix = (corpo: object, cookies: string[] = member) => request(servidor).post("/api/billing/pix").set("Cookie", cookies).send({ documento: CPF, ...corpo });
const cartao = (corpo: object, cookies: string[] = member) => request(servidor).post("/api/billing/assinatura").set("Cookie", cookies).send({ documento: CPF, ...corpo });
const pixVisitante = (corpo: object, endereco: string) => request(servidor).post("/api/billing/visitante/pix").set("x-forwarded-for", endereco).send(corpo);
const cartaoVisitante = (corpo: object, endereco: string) => request(servidor).post("/api/billing/visitante/assinatura").set("x-forwarded-for", endereco).send(corpo);
const pedido = (email: string, extra: object = {}) => ({ email, documento: CPF, plano: "mensal", novidades: false, ...extra });
const ficha = (email: string) => prisma.guestCheckout.findUnique({ where: { email: email.toLowerCase() } });
const clienteDoMember = async () => (await prisma.stripeCustomer.findUniqueOrThrow({ where: { userId: memberId } })).stripeCustomerId;
const pixDoMember = () => prisma.subscription.count({ where: { ownerUserId: memberId, pixPaymentIntentId: { not: null } } });

/** Roda o bloco com a assinatura de teste do member@ vencida, e devolve ela ao fim. */
async function semAssinatura(fn: () => Promise<void>) {
  await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
  try {
    await fn();
  } finally {
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
  }
}

/** Dois pedidos ao mesmo tempo: o primeiro fica PARADO com a trava na mão (a Stripe de mentira segura a lista), o segundo corre inteiro. */
async function comOPrimeiroParado(primeiro: () => Promise<request.Response>, segundo: () => Promise<request.Response>) {
  let dentro!: () => void;
  let soltar!: () => void;
  const entrou = new Promise<void>((ok) => (dentro = ok));
  const segura = new Promise<void>((ok) => (soltar = ok));
  assinaturasDoCliente.mockImplementationOnce(async (clienteId) => {
    dentro();
    await segura;
    return naStripe.filter((a) => a.cliente === clienteId);
  });
  // O `.then` DISPARA o pedido (o do supertest só sai quando alguém o espera).
  const parado = primeiro().then((res) => res);
  await entrou;
  const resposta = await segundo();
  soltar();
  return { primeiro: await parado, segundo: resposta };
}

beforeAll(async () => {
  for (const nome of AMBIENTE) process.env[nome] = nome === "STRIPE_SECRET_KEY" ? "sk_test_da_suite_local" : nome === "STRIPE_PUBLISHABLE_KEY" ? "pk_test_da_suite_local" : PMC;
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  expect(member.length).toBeGreaterThan(0);
  const conta = await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true, email: true } });
  memberId = conta.id;
  memberEmail = conta.email;
});

beforeEach(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
  process.env.STRIPE_PIX_CONFIGURATION = PMC;
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  naStripe = [];
  pixNaStripe = [];
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarCodigo.mockReset().mockRejectedValue(new Error("o código promocional não devia ser buscado: o Pix não tem código"));
  criarCliente.mockReset().mockImplementation(async () => ({ id: `cus_${S}_${++clientes}`, livemode: false }));
  criarClienteDoVisitante.mockReset().mockImplementation(async () => ({ id: `cus_${S}_${++clientes}`, livemode: false }));
  acertarNumeroFiscal.mockReset().mockResolvedValue(false);
  assinaturasDoCliente.mockReset().mockImplementation(async (clienteId) => naStripe.filter((a) => a.cliente === clienteId));
  cancelarIncompleta.mockReset().mockImplementation(async (id) => {
    naStripe = naStripe.map((a) => (a.id === id ? { ...a, status: "incomplete_expired", segredoDoPagamento: null } : a));
    return "incomplete_expired";
  });
  criarAssinatura.mockReset().mockImplementation(async (p) => {
    const nova = incompleta(`sub_${S}_${++n}`, p.clienteId, p.precoId);
    naStripe.push(nova);
    return nova;
  });
  buscarAssinatura.mockReset().mockRejectedValue(new Error("este teste não combinou o que a Stripe diz da assinatura"));
  criarPagamentoPix.mockReset().mockImplementation(async (p) => {
    const id = `pi_${S}_${++n}`;
    pixNaStripe.push({ id, cliente: p.clienteId, status: "requires_action", segredo: `${id}_secret_x`, plano: p.plano, resumoDaTentativa: "visitante" in p ? p.visitante.resumoDaTentativa : null, pedido: p });
    return { id, segredo: `${id}_secret_x`, livemode: false };
  });
  pagamentosPixPendentes.mockReset().mockImplementation(async (clienteId) =>
    pixNaStripe.filter((p) => p.cliente === clienteId && p.status === "requires_action").map(({ id, segredo, plano, resumoDaTentativa }) => ({ id, segredo, plano, resumoDaTentativa })),
  );
  cancelarPagamentoPix.mockReset().mockImplementation(async (id) => {
    pixNaStripe = pixNaStripe.map((p) => (p.id === id ? { ...p, status: "canceled" } : p));
  });
  cancelarPagamentosPixPendentes.mockReset().mockImplementation(async (clienteId) => {
    const pendentes = pixNaStripe.filter((p) => p.cliente === clienteId && p.status === "requires_action");
    pixNaStripe = pixNaStripe.map((p) => (p.cliente === clienteId && p.status === "requires_action" ? { ...p, status: "canceled" } : p));
    return pendentes.length;
  });
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "email_da_suite" });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(async () => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: S } } });
  await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  // Apagar a conta leva junto a ligação com a Stripe e a ficha dela (cascade); as fichas sem conta saem depois.
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("POST /api/billing/pix — com a conta logada", () => {
  it("sem login: 401, e nada vai à Stripe", async () => {
    const res = await pix({ plano: "mensal" }, []);
    expect(res.status).toBe(401);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("o corpo: plano fora da lista, CPF errado ou sem CPF — 400, antes da Stripe", async () => {
    expect((await pix({ plano: "semanal" })).status).toBe(400);
    expect((await pix({ plano: "mensal", documento: "529.982.247-24" })).status).toBe(400);
    expect((await pix({ plano: "mensal", documento: undefined })).status).toBe(400);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarCliente).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("sem a configuração só-Pix (ou sem a chave da Stripe): 503 'NaoConfigurado', um alerta, e nada vai à Stripe", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.STRIPE_PIX_CONFIGURATION;
    let res = await pix({ plano: "mensal" });
    expect([res.status, res.body]).toEqual([503, { error: "NaoConfigurado" }]);
    expect(alerta.mock.calls.map(([linha]) => String(linha))).toEqual([expect.stringContaining("STRIPE_PIX_CONFIGURATION")]);
    process.env.STRIPE_PIX_CONFIGURATION = PMC;
    delete process.env.STRIPE_SECRET_KEY;
    res = await pix({ plano: "mensal" });
    expect(res.status).toBe(503);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("quem JÁ TEM ACESSO não paga de novo: 409 'JaAssinante', sem ir à Stripe (pagar de novo é só depois de acabar)", async () => {
    expect(await temAcessoAtivo(memberId)).toBe(true);
    const res = await pix({ plano: "anual" });
    expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
    expect(criarCliente).not.toHaveBeenCalled();
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(criarPagamentoPix).not.toHaveBeenCalled();
  });

  it("o caminho feliz: o QR do plano pedido, com o preço do SERVIDOR, para o cliente da CONTA — o CPF na ficha antes; nada no espelho; nada de id na resposta", async () => {
    await semAssinatura(async () => {
      const res = await pix({ plano: "anual" });
      expect(res.status).toBe(200);
      const clienteId = await clienteDoMember();
      expect(res.body).toEqual({ estado: "pagar", segredo: `${pixNaStripe[0]?.id}_secret_x`, tipo: "pix" });
      expect(criarCliente).toHaveBeenCalledWith({ userId: memberId, email: memberEmail, nome: expect.anything() });
      expect(criarPagamentoPix).toHaveBeenCalledWith({ clienteId, precoId: "price_anual", plano: "anual", centavos: 99500, userId: memberId });
      expect(acertarNumeroFiscal).toHaveBeenCalledWith(clienteId, { tipo: "cpf", numero: CPF_LIMPO });
      // O número vai para a ficha ANTES do QR nascer.
      expect(acertarNumeroFiscal.mock.invocationCallOrder[0]).toBeLessThan(criarPagamentoPix.mock.invocationCallOrder[0] ?? 0);
      expect(res.text).not.toContain("price_");
      expect(res.text).not.toContain("cus_");
      expect(await pixDoMember()).toBe(0);
      expect(await temAcessoAtivo(memberId)).toBe(false);
    });
  });

  it("o código promocional não existe no Pix: `codigo` no corpo é ignorado, e o QR é do preço cheio", async () => {
    await semAssinatura(async () => {
      const res = await pix({ plano: "mensal", codigo: "CEM" });
      expect(res.status).toBe(200);
      expect(buscarCodigo).not.toHaveBeenCalled();
      expect(criarPagamentoPix.mock.calls[0]?.[0].centavos).toBe(9990);
    });
  });

  it("UM QR POR VEZ: o novo clique do MESMO plano é o mesmo QR (sem outro na Stripe); o de OUTRO plano cancela o anterior e cria o novo — e o CPF vai para a ficha nas três vezes", async () => {
    await semAssinatura(async () => {
      const primeiro = await pix({ plano: "mensal" });
      const segundo = await pix({ plano: "mensal" });
      expect(segundo.status).toBe(200);
      expect(segundo.body.segredo).toBe(primeiro.body.segredo);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(cancelarPagamentoPix).not.toHaveBeenCalled();

      const terceiro = await pix({ plano: "anual", documento: OUTRO_CPF });
      expect(terceiro.status).toBe(200);
      expect(terceiro.body.segredo).not.toBe(primeiro.body.segredo);
      expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe[0]?.id);
      expect(pixNaStripe.map((p) => [p.plano, p.status])).toEqual([["mensal", "canceled"], ["anual", "requires_action"]]);
      expect(criarPagamentoPix.mock.calls[1]?.[0]).toMatchObject({ precoId: "price_anual", centavos: 99500 });
      expect(acertarNumeroFiscal.mock.calls.map(([, documento]) => documento.numero)).toEqual([CPF_LIMPO, CPF_LIMPO, "11144477735"]);
    });
  });

  it("UM PAGAMENTO ABERTO POR VEZ: o cartão começado e não pago morre quando a pessoa segue por Pix; o que foi PAGO no meio é 'já é assinante', sem QR novo, e alerta", async () => {
    await semAssinatura(async () => {
      const primeiro = await pix({ plano: "mensal" });
      const clienteId = await clienteDoMember();
      naStripe.push(incompleta(`sub_${S}_cartao_aberto`, clienteId));
      const segundo = await pix({ plano: "mensal" });
      expect(segundo.status).toBe(200);
      expect(segundo.body.segredo).toBe(primeiro.body.segredo);
      expect(cancelarIncompleta).toHaveBeenCalledWith(`sub_${S}_cartao_aberto`);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);

      // Pago entre a lista e o cancelamento (outra aba): o cancelamento encerrou uma assinatura paga.
      const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
      naStripe.push(incompleta(`sub_${S}_pago_no_meio`, clienteId));
      cancelarIncompleta.mockResolvedValueOnce("active");
      const terceiro = await pix({ plano: "anual" });
      expect([terceiro.status, terceiro.body]).toEqual([409, { error: "JaAssinante" }]);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
      expect(cancelarPagamentoPix).not.toHaveBeenCalled();
      expect(acertarNumeroFiscal).toHaveBeenCalledTimes(2);
      expect(alerta.mock.calls.map(([linha]) => String(linha))).toEqual([expect.stringContaining(`sub_${S}_pago_no_meio`)]);
      expect(String(alerta.mock.calls[0]?.[0])).toContain("já PAGA");
    });
  });

  describe("a Stripe diz que a conta já assina, e o espelho não dá acesso", () => {
    afterEach(async () => {
      await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { startsWith: `sub_viva_${S}` } } });
    });

    it("o aviso se perdeu (pagou por cartão, ou um Pix que caiu): SINCRONIZA — 409 'JaAssinante', o espelho nasce, a conta passa a ter acesso, e nenhum QR", async () => {
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_perdida`;
        const clienteId = `cus_${S}_viva`;
        await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: clienteId, livemode: false } });
        naStripe = [viva(id, clienteId)];
        buscarAssinatura.mockResolvedValue(dizAStripe(id, clienteId));
        const res = await pix({ plano: "mensal" });
        expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
        expect(buscarAssinatura).toHaveBeenCalledWith(id);
        expect(await prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } })).toMatchObject({ ownerUserId: memberId, status: "active" });
        expect(await temAcessoAtivo(memberId)).toBe(true);
        expect(criarPagamentoPix).not.toHaveBeenCalled();
        expect(pagamentosPixPendentes).not.toHaveBeenCalled();
        // A ficha de quem já assina NÃO é mexida.
        expect(acertarNumeroFiscal).not.toHaveBeenCalled();
      });
    });

    it("a cobrança do cartão atrasada há mais de 3 dias, já sem aulas: 409 'CobrancaAtrasada' — o caminho é trocar o cartão, não um Pix por cima", async () => {
      const grito = vi.spyOn(console, "error").mockImplementation(() => {});
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_sem_aulas`;
        const clienteId = `cus_${S}_atrasada`;
        const falhou = new Date(Date.now() - 4 * DIA);
        await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: clienteId, livemode: false } });
        await prisma.subscription.create({ data: { ownerUserId: memberId, status: "past_due", currentPeriodEnd: falhou, stripeSubscriptionId: id } });
        naStripe = [viva(id, clienteId, "past_due")];
        buscarAssinatura.mockResolvedValue(dizAStripe(id, clienteId, { status: "past_due", pagoAte: falhou }));
        const res = await pix({ plano: "mensal" });
        expect([res.status, res.body]).toEqual([409, { error: "CobrancaAtrasada" }]);
        expect(await temAcessoAtivo(memberId)).toBe(false);
        expect(criarPagamentoPix).not.toHaveBeenCalled();
        expect(grito).not.toHaveBeenCalled();
      });
    });
  });

  it("DOIS CLIQUES ao mesmo tempo: o segundo ouve 'ocupada' sem esperar; um cliente, um QR", async () => {
    await semAssinatura(async () => {
      const { primeiro, segundo } = await comOPrimeiroParado(() => pix({ plano: "mensal" }), () => pix({ plano: "mensal" }));
      expect([segundo.status, segundo.body]).toEqual([409, { error: "Ocupada" }]);
      expect(primeiro.status).toBe(200);
      expect(criarCliente).toHaveBeenCalledTimes(1);
      expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    });
  });

  it("o teto de 'ao mesmo tempo' (o mesmo das assinaturas) cheio: 409 'MuitosAoMesmoTempo' na hora, e nada vai à Stripe", async () => {
    let soltar!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const ocupadas = Array.from({ length: assinaturasAoMesmoTempo() }, () => comVaga(() => segura));
    try {
      await semAssinatura(async () => {
        const res = await pix({ plano: "mensal" });
        expect([res.status, res.body]).toEqual([409, { error: "MuitosAoMesmoTempo" }]);
        expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
      });
      expect(criarCliente).not.toHaveBeenCalled();
      expect(criarPagamentoPix).not.toHaveBeenCalled();
    } finally {
      soltar();
      await Promise.all(ocupadas);
    }
  });

  it("a Stripe recusou o CPF que o core aceitou: 400 'DocumentoInvalido', nenhum QR, e alerta", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    await semAssinatura(async () => {
      acertarNumeroFiscal.mockRejectedValueOnce(new DocumentoRecusado("cpf"));
      const res = await pix({ plano: "mensal" });
      expect([res.status, res.body]).toEqual([400, { error: "DocumentoInvalido" }]);
      expect(criarPagamentoPix).not.toHaveBeenCalled();
      expect(alerta).toHaveBeenCalledTimes(1);
    });
  });
});

describe("POST /api/billing/visitante/pix — sem conta", () => {
  it("o corpo: sem e-mail, CPF errado ou plano fora da lista — 400, antes da Stripe e sem ficha", async () => {
    const endereco = novoEndereco();
    const email = novoEmail();
    expect((await pixVisitante({ documento: CPF, plano: "mensal", novidades: false }, endereco)).status).toBe(400);
    expect((await pixVisitante(pedido(email, { documento: "529.982.247-24" }), endereco)).status).toBe(400);
    expect((await pixVisitante(pedido(email, { plano: "semanal" }), endereco)).status).toBe(400);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
    expect(await ficha(email)).toBeNull();
  });

  it("o e-mail que JÁ TEM CONTA (em qualquer grafia) é mandado entrar: 409 'JaTemConta', antes da Stripe", async () => {
    const res = await pixVisitante(pedido(memberEmail.toUpperCase()), novoEndereco());
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
  });

  it("o caminho feliz: a ficha do e-mail nasce com o CPF, o QR leva a ficha, o RESUMO da tentativa e a escolha; a tentativa só vai ao navegador; o `codigo` é ignorado; conta nenhuma nasce", async () => {
    const email = novoEmail();
    const res = await pixVisitante(pedido(email, { novidades: true, origem: "youtube", codigo: "CEM" }), novoEndereco());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: "pagar", tipo: "pix", segredo: `${pixNaStripe[0]?.id}_secret_x` });
    const tentativa: unknown = res.body.tentativa;
    expect(typeof tentativa).toBe("string");
    if (typeof tentativa !== "string") return;
    const f = await ficha(email);
    expect(f).toMatchObject({ tentativa: sha256(tentativa), userId: null });
    expect(criarClienteDoVisitante).toHaveBeenCalledWith({ pedido: f?.id, email, documento: { tipo: "cpf", numero: CPF_LIMPO } });
    expect(criarPagamentoPix).toHaveBeenCalledWith({
      clienteId: f?.stripeCustomerId,
      precoId: "price_mensal",
      plano: "mensal",
      centavos: 9990,
      visitante: { pedido: f?.id, resumoDaTentativa: sha256(tentativa), escolha: { novidades: true, origem: "youtube", campanha: null } },
    });
    // A ficha nova já nasceu com o número; o código promocional não existe aqui.
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(res.text).not.toContain(sha256(tentativa));
    expect(res.text).not.toContain("cus_");
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("a TENTATIVA: com o código dela e o mesmo plano, o mesmo QR (até com outro CPF, que vai para a ficha); SEM o código, o anterior morre e nasce outro, com código novo; outro plano, idem", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    const primeiro = await pixVisitante(pedido(email), endereco);
    const tentativa: unknown = primeiro.body.tentativa;
    if (typeof tentativa !== "string") throw new Error("sem tentativa");

    const mesma = await pixVisitante(pedido(email, { tentativa }), endereco);
    expect(mesma.body).toEqual({ estado: "pagar", segredo: primeiro.body.segredo, tipo: "pix", tentativa });
    const outroCpf = await pixVisitante(pedido(email, { tentativa, documento: OUTRO_CPF }), endereco);
    expect(outroCpf.body).toEqual(mesma.body);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(cancelarPagamentoPix).not.toHaveBeenCalled();
    // A fatura só nasce quando o Pix cai: o número da ficha é o do último pedido desta tentativa.
    expect(acertarNumeroFiscal.mock.calls.map(([, documento]) => documento.numero)).toEqual([CPF_LIMPO, "11144477735"]);

    // Outra pessoa, que sabe só o e-mail: nunca recebe o QR anterior.
    const semCodigo = await pixVisitante(pedido(email), endereco);
    expect(semCodigo.status).toBe(200);
    expect(semCodigo.body.segredo).not.toBe(primeiro.body.segredo);
    expect(semCodigo.body.tentativa).not.toBe(tentativa);
    expect(cancelarPagamentoPix).toHaveBeenCalledWith(pixNaStripe[0]?.id);
    expect((await ficha(email))?.tentativa).toBe(sha256(String(semCodigo.body.tentativa)));

    const anual = await pixVisitante(pedido(email, { plano: "anual", tentativa: semCodigo.body.tentativa as string }), endereco);
    expect(anual.status).toBe(200);
    expect(anual.body.segredo).not.toBe(semCodigo.body.segredo);
    expect(pixNaStripe.map((p) => [p.plano, p.status])).toEqual([["mensal", "canceled"], ["mensal", "canceled"], ["anual", "requires_action"]]);
    expect(criarPagamentoPix.mock.calls[2]?.[0]).toMatchObject({ precoId: "price_anual", centavos: 99500 });
  });

  it("alguém já PAGOU por este e-mail (a Stripe tem assinatura viva): SINCRONIZA — a conta nasce, as boas-vindas saem — e 'já tem conta', sem QR e sem mexer no CPF", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    await pixVisitante(pedido(email), endereco);
    const f = await ficha(email);
    if (!f) throw new Error("sem ficha");
    const id = `sub_${S}_paga_por_cartao`;
    naStripe = [viva(id, f.stripeCustomerId)];
    buscarAssinatura.mockResolvedValue(dizAStripe(id, f.stripeCustomerId, { userId: null, pedido: f.id, doVisitante: { novidades: false, origem: null, campanha: null } }));

    const res = await pixVisitante(pedido(email, { documento: OUTRO_CPF }), endereco);
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    const conta = await prisma.user.findUnique({ where: { email } });
    expect(conta).not.toBeNull();
    expect((await prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } }))?.ownerUserId).toBe(conta?.id);
    expect(enviarEmail.mock.calls.map(([e]) => e.para)).toEqual([email]);
  });

  it("DOIS CLIQUES do mesmo e-mail ao mesmo tempo: o segundo ouve 'ocupada' sem esperar; um cliente, um QR", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    const { primeiro, segundo } = await comOPrimeiroParado(() => pixVisitante(pedido(email), endereco), () => pixVisitante(pedido(email), endereco));
    expect([segundo.status, segundo.body]).toEqual([409, { error: "Ocupada" }]);
    expect(primeiro.status).toBe(200);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(1);
    expect(criarPagamentoPix).toHaveBeenCalledTimes(1);
  });

  it("sem a configuração só-Pix: 503, e nem a ficha nasce", async () => {
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.STRIPE_PIX_CONFIGURATION;
    const email = novoEmail();
    const res = await pixVisitante(pedido(email), novoEndereco());
    expect([res.status, res.body]).toEqual([503, { error: "NaoConfigurado" }]);
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
    expect(await ficha(email)).toBeNull();
    expect(alerta).toHaveBeenCalledTimes(1);
  });

  it("o limite por E-MAIL do assinar sem login vale aqui: o 6º pedido em 15 minutos é recusado", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect(LIMITES_DO_VISITANTE.assinar.email.porJanela).toBe(5);
    for (let i = 0; i < 5; i++) expect((await pixVisitante(pedido(email), endereco)).status, `pedido ${i + 1}`).toBe(200);
    const recusa = await pixVisitante(pedido(email), endereco);
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("os E-MAILS NOVOS do dia (10 por endereço) contam os clientes que o Pix cria: o 11º é recusado, sem ficha", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const endereco = novoEndereco();
    const emails = Array.from({ length: LIMITES_DO_VISITANTE.emailsNovosPorDia }, novoEmail);
    for (let i = 0; i < emails.length; i++) {
      // Em rodadas que respeitam a janela de 15 minutos do endereço.
      if (i > 0 && i % 5 === 0) vi.setSystemTime(Date.now() + 16 * 60_000);
      expect((await pixVisitante(pedido(emails[i] ?? ""), endereco)).status, `e-mail ${i + 1}`).toBe(200);
    }
    vi.setSystemTime(Date.now() + 16 * 60_000);
    const decimoPrimeiro = novoEmail();
    const recusa = await pixVisitante(pedido(decimoPrimeiro), endereco);
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(await ficha(decimoPrimeiro)).toBeNull();
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(10);
  });
});

describe("UM PAGAMENTO ABERTO POR VEZ — o checkout por cartão cancela o Pix à espera", () => {
  it("com a conta logada: o QR aberto morre quando a mesma conta segue por cartão", async () => {
    await semAssinatura(async () => {
      const qr = await pix({ plano: "mensal" });
      expect(qr.status).toBe(200);
      const res = await cartao({ plano: "mensal" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: "pagar", tipo: "pagamento" });
      expect(cancelarPagamentosPixPendentes).toHaveBeenCalledWith(await clienteDoMember());
      expect(pixNaStripe.map((p) => p.status)).toEqual(["canceled"]);
    });
  });

  it("sem conta: o QR aberto da ficha morre quando o e-mail segue por cartão", async () => {
    const email = novoEmail();
    const endereco = novoEndereco();
    expect((await pixVisitante(pedido(email), endereco)).status).toBe(200);
    const res = await cartaoVisitante(pedido(email), endereco);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: "pagar", tipo: "pagamento" });
    expect(cancelarPagamentosPixPendentes).toHaveBeenCalledWith((await ficha(email))?.stripeCustomerId);
    expect(pixNaStripe.map((p) => p.status)).toEqual(["canceled"]);
  });
});

describe("os planos dizem se o Pix está no ar", () => {
  it("com a configuração só-Pix, as duas vitrines levam a configuração (sem a chave secreta); sem ela, `pix` é nulo", async () => {
    const logado = await request(servidor).get("/api/billing/planos").set("Cookie", member);
    const visitante = await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", novoEndereco());
    expect(logado.body.pix).toEqual({ configuracao: PMC });
    expect(visitante.body.pix).toEqual({ configuracao: PMC });
    expect(logado.text).not.toContain("sk_test");

    delete process.env.STRIPE_PIX_CONFIGURATION;
    expect((await request(servidor).get("/api/billing/planos").set("Cookie", member)).body.pix).toBeNull();
    expect((await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", novoEndereco())).body.pix).toBeNull();
  });
});
