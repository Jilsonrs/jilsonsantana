import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { AssinaturaNaStripe, AvisoDaStripe } from "../lib/stripe.js";
// Só o tipo (sumido na compilação): o banco é carregado lá embaixo, depois do endereço com uma ligação.
import type { TipoDeCaso as TipoDoCaso } from "../lib/prisma.js";

// OS CASOS COM O BANCO ACEITANDO UMA LIGAÇÃO SÓ (Fase 4, etapa 4.7b — o achado 3 da revisão de segurança do bloco 2,
// 31/10/2026): o caso aberto pelo banco de sempre no MEIO de uma transação da cobrança (a contestação dentro do aviso, o
// agendamento da troca dentro da operação) pedia uma SEGUNDA ligação enquanto a transação segurava a dela. Aqui o banco
// aceita UMA: aquele caso esperaria uma ligação que nunca vem, cairia em erro em 3 s — e sumiria, porque abrir um caso
// nunca lança. Com o caso gravado DEPOIS da transação (`transacaoDaCobranca`), ele fica — também quando a operação falha
// e a transação é desfeita. Cada arquivo de teste roda no próprio processo: o endereço com uma ligação não vaza.

// A biblioteca da Stripe falsa entra pela fábrica do cliente: é dela que saem as idas da contestação e da troca.
const falsa = {
  subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
  invoices: { voidInvoice: vi.fn(), retrieve: vi.fn() },
  subscriptionSchedules: { create: vi.fn(), update: vi.fn(), release: vi.fn() },
};
vi.mock("../lib/stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-cliente.js")>()),
  stripe: () => falsa,
}));
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

// UMA ligação, e o prazo curto. Antes de o banco ser carregado — é na carga que o cliente lê o endereço.
const enderecoOriginal = process.env.DATABASE_URL;
const endereco = new URL(enderecoOriginal ?? "");
endereco.searchParams.set("connection_limit", "1");
endereco.searchParams.set("pool_timeout", "3");
process.env.DATABASE_URL = endereco.toString();
const { prisma, TipoDeCaso } = await import("../lib/prisma.js");
const { processarAviso, operarNaAssinatura } = await import("../lib/assinaturas.js");
const { agendarTroca } = await import("../lib/stripe-plano.js");

const S = `${Date.now()}`;
let n = 0;
const novoId = (prefixo: string) => `${prefixo}_uma_ligacao_casos_${S}_${++n}`;
const DIA = 24 * 60 * 60 * 1000;
const caso = (tipo: TipoDoCaso, chave: string) => prisma.billingCase.findUnique({ where: { kind_key: { kind: tipo, key: chave } } });

beforeEach(() => {
  for (const grupo of Object.values(falsa)) for (const duble of Object.values(grupo)) duble.mockReset();
  buscarAssinatura.mockReset().mockImplementation(async (id) => ({ id, status: "canceled", pagoAte: new Date(Date.now() - DIA), clienteId: "cus_uma_ligacao_casos", userId: null, livemode: false }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.billingCase.deleteMany({ where: { stripeSubscriptionId: { contains: `uma_ligacao_casos_${S}` } } });
  await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { contains: `uma_ligacao_casos_${S}` } } });
  await prisma.stripeEvent.deleteMany({ where: { id: { contains: `uma_ligacao_casos_${S}` } } });
  process.env.DATABASE_URL = enderecoOriginal;
});

describe("os casos da cobrança com o banco aceitando UMA ligação", () => {
  // Sem a premissa, os testes daqui não provariam nada: passariam com qualquer número de ligações.
  it("a premissa: com a única ligação presa numa transação, outra consulta espera — e falha no prazo", async () => {
    let soltar!: () => void;
    let presa!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const ligacaoPresa = new Promise<void>((ok) => (presa = ok));
    const transacao = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1`;
      presa();
      await segura;
    }, { timeout: 20_000 });
    await ligacaoPresa;
    try {
      await expect(prisma.user.count()).rejects.toThrow("timeout exceeded when trying to connect");
    } finally {
      soltar();
      await transacao;
    }
  });

  it("a contestação cujo dinheiro saiu, com a cobrança em aberto que não se anula: o caso fica, aberto no meio do aviso", async () => {
    const assinatura = novoId("sub");
    const fatura = novoId("in");
    falsa.subscriptions.retrieve.mockResolvedValue({ id: assinatura, status: "active", metadata: {} });
    falsa.subscriptions.update.mockResolvedValue({ id: assinatura, status: "active", latest_invoice: { id: fatura, status: "open" } });
    falsa.subscriptions.cancel.mockResolvedValue({ id: assinatura, status: "canceled" });
    falsa.invoices.voidInvoice.mockRejectedValue(new Error("fora do ar"));
    const aviso: AvisoDaStripe = { id: novoId("evt"), tipo: "charge.dispute.funds_withdrawn", assinatura, contestacao: { id: novoId("du"), motivo: "fraudulent", centavos: 9990, prazo: null, pagamento: null, fase: "dinheiro-saiu" } };
    expect((await processarAviso(aviso)).resultado).not.toBe("repetido");
    expect(falsa.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(await caso(TipoDeCaso.COBRANCA_EM_ABERTO, `fatura:${fatura}`)).toMatchObject({ open: true, urgent: false, stripeSubscriptionId: assinatura, stripeObjectId: fatura });
  });

  it("o agendamento da troca que fica pela metade, dentro de uma operação que FALHA: o caso fica — a transação desfeita não o leva", async () => {
    const assinatura = novoId("sub");
    const agendamento = novoId("sub_sched");
    falsa.subscriptionSchedules.create.mockResolvedValue({ id: agendamento, phases: [{ start_date: 1, end_date: 2, items: [], discounts: [] }] });
    falsa.subscriptionSchedules.update.mockRejectedValue(new Error("fora do ar"));
    falsa.subscriptionSchedules.release.mockRejectedValue(new Error("fora do ar"));
    await expect(operarNaAssinatura(assinatura, () => agendarTroca(assinatura, "price_anual"))).rejects.toThrow(`a operação na assinatura ${assinatura} falhou`);
    expect(await caso(TipoDeCaso.TROCA_DE_PLANO, `agendamento:${agendamento}`)).toMatchObject({ open: true, stripeSubscriptionId: assinatura, stripeObjectId: agendamento });
  });
});
