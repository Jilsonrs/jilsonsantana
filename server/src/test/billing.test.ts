import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNoCheckout, CodigoPromocional, PrecoDoPlano } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. O resto de `lib/stripe.ts` (a
// chave publicável, o que está configurado) roda de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarCodigo = vi.fn<(codigo: string) => Promise<CodigoPromocional | null>>();
const calcularPrevia = vi.fn<(precoId: string, codigoId: string) => Promise<{ centavosHoje: number; moeda: string } | null>>();
type PedidoDeAssinatura = { clienteId: string; userId: string; precoId: string; plano: string; codigoId: string | null };
const criarCliente = vi.fn<(conta: { userId: string; email: string; nome: string | null }) => Promise<{ id: string; livemode: boolean }>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
const cancelarIncompleta = vi.fn<(id: string) => Promise<string>>();
const criarAssinatura = vi.fn<(pedido: PedidoDeAssinatura) => Promise<AssinaturaNoCheckout>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarCodigo: (codigo: string) => buscarCodigo(codigo),
  calcularPrevia: (precoId: string, codigoId: string) => calcularPrevia(precoId, codigoId),
  criarCliente: (conta: { userId: string; email: string; nome: string | null }) => criarCliente(conta),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
  criarAssinatura: (pedido: PedidoDeAssinatura) => criarAssinatura(pedido),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2). O que estes testes protegem — é a fronteira
// de dinheiro:
//   - nada daqui responde sem login, e sem login a Stripe nem é chamada;
//   - os planos saem com o valor que a Stripe diz, e o código do preço não vai ao navegador;
//   - sem a chave certa no lugar certo a tela não abre — e a SECRETA colada na variável da
//     publicável nunca sai na resposta;
//   - a Stripe fora do ar chega à tela como falha, sem plano e sem chave.
//   - "tem acesso?" é a resposta do GATE para a conta da sessão — a tela de depois do pagamento
//     só libera quando o espelho (gravado pelo aviso da Stripe) disser que sim;
//   - ASSINAR: a conta é a da sessão e o preço é o do plano — o corpo não escolhe nenhum dos
//     dois; quem já tem acesso não assina de novo, nem quem a Stripe diz que já assina; uma
//     conta é um cliente só; a nova tentativa usa a MESMA assinatura incompleta; trocar de plano
//     cancela a incompleta antes de criar outra; dois cliques ao mesmo tempo criam UMA;
//   - o código promocional: o valor de hoje é o que a STRIPE calcula, para o preço do plano
//     pedido — o corpo não tem como apontar outro preço; código que não existe e código que
//     não vale para a compra dão a MESMA recusa; o código da Stripe não vai ao navegador.

const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const CEM_PARA_SEMPRE: CodigoPromocional = { id: "promo_cem", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } };
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
let member: string[] = [];

async function sessao(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}
const planos = (cookies: string[] = []) => request(servidor).get("/api/billing/planos").set("Cookie", cookies);
const previa = (corpo: object, cookies: string[] = []) => request(servidor).post("/api/billing/previa").set("Cookie", cookies).send(corpo);

beforeAll(async () => {
  member = await sessao(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  expect(member.length).toBeGreaterThan(0);
});

beforeEach(() => {
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarCodigo.mockReset().mockResolvedValue(CEM_PARA_SEMPRE);
  calcularPrevia.mockReset().mockResolvedValue({ centavosHoje: 0, moeda: "brl" });
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
});

afterAll(() => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("GET /api/billing/planos", () => {
  it("sem login: 401, e a Stripe nem é chamada", async () => {
    const res = await planos();
    expect(res.status).toBe(401);
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("com login: os dois planos com o valor da Stripe e a chave publicável", async () => {
    const res = await planos(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      chavePublicavel: "pk_test_da_suite_local",
      planos: [
        { plano: "mensal", centavos: 9990, moeda: "brl" },
        { plano: "anual", centavos: 99500, moeda: "brl" },
      ],
      // A mesma lista com que o servidor cria a assinatura (nesta etapa, só cartão).
      formasDePagamento: ["card"],
    });
  });

  it("o código do preço e a chave secreta não vão ao navegador", async () => {
    const res = await planos(member);
    expect(res.text).not.toContain("price_");
    expect(res.text).not.toContain("sk_test");
  });

  it("a chave SECRETA colada na variável da publicável: 503, e ela não sai na resposta", async () => {
    process.env.STRIPE_PUBLISHABLE_KEY = "sk_test_colada_no_lugar_errado";
    const res = await planos(member);
    expect(res.status).toBe(503);
    expect(res.text).not.toContain("sk_test");
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("sem a chave publicável ou sem a secreta: 503", async () => {
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    expect((await planos(member)).status).toBe(503);
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
    delete process.env.STRIPE_SECRET_KEY;
    expect((await planos(member)).status).toBe(503);
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  // A mensagem de erro da Stripe é limpa na fronteira (`erroSemMensagem`, com teste em
  // `lib/stripe.test.ts`); aqui, o que a tela precisa: a falha chega como falha, sem plano nenhum.
  it("a Stripe fora do ar: 500, e nenhum plano sai", async () => {
    buscarPrecos.mockRejectedValue(new Error("[stripe] a busca dos preços falhou: StripeConnectionError"));
    const res = await planos(member);
    expect(res.status).toBe(500);
    expect(res.body).not.toHaveProperty("planos");
    expect(res.text).not.toContain("pk_test");
  });
});

describe("POST /api/billing/previa", () => {
  it("sem login: 401, e a Stripe nem é chamada", async () => {
    const res = await previa({ plano: "mensal", codigo: "TESTE100" });
    expect(res.status).toBe(401);
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(calcularPrevia).not.toHaveBeenCalled();
  });

  it("código que vale: o valor de hoje que a Stripe calculou e o desconto", async () => {
    const res = await previa({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ centavosHoje: 0, moeda: "brl", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } });
    expect(calcularPrevia).toHaveBeenCalledWith("price_mensal", "promo_cem");
  });

  it("o preço é o do plano pedido — e o corpo não tem como apontar outro preço nem outro valor", async () => {
    calcularPrevia.mockResolvedValue({ centavosHoje: 49750, moeda: "brl" });
    const res = await previa({ plano: "anual", codigo: "METADE", precoId: "price_de_um_centavo", centavos: 1, centavosHoje: 1 }, member);
    expect(res.status).toBe(200);
    expect(res.body.centavosHoje).toBe(49750);
    expect(calcularPrevia).toHaveBeenCalledTimes(1);
    expect(calcularPrevia).toHaveBeenCalledWith("price_anual", "promo_cem");
  });

  it("o código chega à Stripe aparado nas pontas (colado de e-mail, vem com espaço)", async () => {
    await previa({ plano: "mensal", codigo: "  TESTE100 \n" }, member);
    expect(buscarCodigo).toHaveBeenCalledWith("TESTE100");
  });

  it("código que não existe, venceu ou esgotou: 400 CodigoInvalido, sem calcular nada", async () => {
    buscarCodigo.mockResolvedValue(null);
    const res = await previa({ plano: "mensal", codigo: "NAOEXISTE" }, member);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "CodigoInvalido" });
    expect(calcularPrevia).not.toHaveBeenCalled();
  });

  it("código que existe mas não vale para esta compra: a MESMA recusa", async () => {
    calcularPrevia.mockResolvedValue(null);
    const res = await previa({ plano: "mensal", codigo: "SOEMDOLAR" }, member);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "CodigoInvalido" });
  });

  it("o código da Stripe e o do preço não vão ao navegador", async () => {
    const res = await previa({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(res.text).not.toContain("promo_");
    expect(res.text).not.toContain("price_");
  });

  it("plano inventado, código vazio ou só de espaços, ou comprido demais: 400, sem ir à Stripe", async () => {
    for (const corpo of [{ plano: "vitalicio", codigo: "TESTE100" }, { plano: "mensal" }, { plano: "mensal", codigo: "   " }, { plano: "mensal", codigo: "A".repeat(65) }, { codigo: "TESTE100" }]) {
      const res = await previa(corpo, member);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ValidationError");
    }
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("sem a chave secreta: 503, sem ir à Stripe", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await previa({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(res.status).toBe(503);
    expect(buscarCodigo).not.toHaveBeenCalled();
  });
});

describe("GET /api/billing/assinatura", () => {
  const S = `${Date.now()}`;
  const situacao = (cookies: string[] = []) => request(servidor).get("/api/billing/assinatura").set("Cookie", cookies);
  let memberId = "";

  /** Roda o bloco com a assinatura de teste do member@ vencida, e devolve ela ao fim. */
  async function semAssinatura(fn: () => Promise<void>) {
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
    try {
      await fn();
    } finally {
      await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
    }
  }

  beforeAll(async () => {
    memberId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } })).id;
  });

  it("sem login: 401", async () => {
    expect((await situacao()).status).toBe(401);
  });

  it("conta com assinatura ativa: tem acesso", async () => {
    const res = await situacao(member);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ temAcesso: true });
  });

  it("conta sem assinatura que dê acesso: não tem", async () => {
    await semAssinatura(async () => {
      expect((await situacao(member)).body).toEqual({ temAcesso: false });
    });
  });

  it("assinatura que nunca foi paga (incomplete) não libera; quando o espelho passa a ativa, libera", async () => {
    await semAssinatura(async () => {
      const nova = await prisma.subscription.create({ data: { ownerUserId: memberId, status: "incomplete", stripeSubscriptionId: `sub_da_tela_${S}` } });
      try {
        expect((await situacao(member)).body).toEqual({ temAcesso: false });
        // É o que o aviso da Stripe faz quando o pagamento passa.
        await prisma.subscription.update({ where: { id: nova.id }, data: { status: "active" } });
        expect((await situacao(member)).body).toEqual({ temAcesso: true });
      } finally {
        await prisma.subscription.delete({ where: { id: nova.id } });
      }
    });
  });
});

describe("POST /api/billing/assinatura", () => {
  const S = `${Date.now()}`;
  const assinarComo = (corpo: object, cookies: string[] = []) => request(servidor).post("/api/billing/assinatura").set("Cookie", cookies).send(corpo);
  let memberId = "";
  let memberEmail = "";

  // A Stripe de mentira, com memória: o que foi criado aparece na lista seguinte — como na de verdade.
  let naStripe: AssinaturaNoCheckout[] = [];
  const incompleta = (id: string, plano: string, codigoId: string | null = null): AssinaturaNoCheckout => ({ id, status: "incomplete", plano, codigoId, segredoDoPagamento: `pi_${id}_secret_x`, segredoDoCartao: null });

  /** Roda o bloco com a assinatura de teste do member@ vencida, e devolve ela ao fim. */
  async function semAssinatura(fn: () => Promise<void>) {
    await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "canceled", currentPeriodEnd: new Date("2020-01-01T00:00:00Z") } });
    try {
      await fn();
    } finally {
      await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
    }
  }

  beforeAll(async () => {
    const conta = await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true, email: true } });
    memberId = conta.id;
    memberEmail = conta.email;
  });

  beforeEach(async () => {
    await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
    naStripe = [];
    let n = 0;
    criarCliente.mockReset().mockImplementation(async () => ({ id: `cus_${S}_${++n}`, livemode: false }));
    assinaturasDoCliente.mockReset().mockImplementation(async () => [...naStripe]);
    cancelarIncompleta.mockReset().mockImplementation(async (id) => {
      naStripe = naStripe.map((a) => (a.id === id ? { ...a, status: "incomplete_expired", segredoDoPagamento: null } : a));
      return "incomplete_expired";
    });
    criarAssinatura.mockReset().mockImplementation(async (pedido) => {
      // Um instante, como a rede: sem a trava por conta, dois pedidos juntos passariam os dois da lista.
      await new Promise((ok) => setTimeout(ok, 30));
      const nova = incompleta(`sub_${S}_${++n}`, pedido.plano, pedido.codigoId);
      naStripe.push(nova);
      return nova;
    });
  });

  afterAll(async () => {
    await prisma.stripeCustomer.deleteMany({ where: { userId: memberId } });
  });

  it("sem login: 401, e nada é criado na Stripe", async () => {
    expect((await assinarComo({ plano: "mensal" })).status).toBe(401);
    expect(criarCliente).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("plano inventado, sem plano ou código vazio: 400, e nada é criado", async () => {
    await semAssinatura(async () => {
      for (const corpo of [{ plano: "vitalicio" }, {}, { plano: "mensal", codigo: "" }, { plano: "mensal", codigo: "   " }]) {
        const res = await assinarComo(corpo, member);
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("ValidationError");
      }
    });
    expect(criarCliente).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("sem a chave secreta: 503, e nada é criado", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await semAssinatura(async () => {
      expect((await assinarComo({ plano: "mensal" }, member)).status).toBe(503);
    });
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("quem JÁ TEM ACESSO não assina de novo: 409, e nada é criado na Stripe", async () => {
    const res = await assinarComo({ plano: "mensal" }, member);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "JaAssinante" });
    expect(criarCliente).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("assinar no cartão: cria o cliente da conta, a assinatura do plano pedido, e devolve o segredo do pagamento", async () => {
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "anual" }, member);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ estado: "pagar", segredo: expect.stringMatching(/^pi_sub_.*_secret_x$/), tipo: "pagamento" });
      expect(criarCliente).toHaveBeenCalledWith({ userId: memberId, email: memberEmail, nome: expect.anything() });
      const guardado = await prisma.stripeCustomer.findUniqueOrThrow({ where: { userId: memberId } });
      expect(criarAssinatura).toHaveBeenCalledWith({ clienteId: guardado.stripeCustomerId, userId: memberId, precoId: "price_anual", plano: "anual", codigoId: null });
      expect(guardado.livemode).toBe(false);
    });
  });

  it("o corpo não escolhe a conta, o cliente, o preço nem o valor", async () => {
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "mensal", userId: "conta-de-outra-pessoa", clienteId: "cus_de_outra_pessoa", precoId: "price_de_um_centavo", centavos: 1 }, member);
      expect(res.status).toBe(200);
      const pedido = criarAssinatura.mock.calls[0]?.[0];
      expect(pedido?.userId).toBe(memberId);
      expect(pedido?.precoId).toBe("price_mensal");
      expect(pedido?.clienteId).not.toBe("cus_de_outra_pessoa");
      expect(criarCliente.mock.calls[0]?.[0].userId).toBe(memberId);
    });
  });

  it("uma conta é UM cliente: a segunda vez não cria outro", async () => {
    await semAssinatura(async () => {
      await assinarComo({ plano: "mensal" }, member);
      await assinarComo({ plano: "mensal" }, member);
      expect(criarCliente).toHaveBeenCalledTimes(1);
      expect(await prisma.stripeCustomer.count({ where: { userId: memberId } })).toBe(1);
    });
  });

  it("o cartão foi recusado e o aluno tenta de novo: a MESMA assinatura, o mesmo segredo — nenhuma nova", async () => {
    await semAssinatura(async () => {
      const primeira = await assinarComo({ plano: "mensal" }, member);
      const segunda = await assinarComo({ plano: "mensal" }, member);
      expect(segunda.status).toBe(200);
      expect(segunda.body).toEqual(primeira.body);
      expect(criarAssinatura).toHaveBeenCalledTimes(1);
      expect(cancelarIncompleta).not.toHaveBeenCalled();
    });
  });

  it("trocou de plano (ou de código) depois de tentar: a incompleta antiga é cancelada, e nasce a nova", async () => {
    await semAssinatura(async () => {
      const mensal = await assinarComo({ plano: "mensal" }, member);
      const anual = await assinarComo({ plano: "anual" }, member);
      expect(anual.body.segredo).not.toBe(mensal.body.segredo);
      expect(cancelarIncompleta).toHaveBeenCalledTimes(1);
      // A cancelada é a primeira, a do mensal.
      expect(cancelarIncompleta).toHaveBeenCalledWith(naStripe[0]?.id);
      // E o código conta igual ao plano: o mesmo plano, agora com código, é outra assinatura.
      const comCodigo = await assinarComo({ plano: "anual", codigo: "METADE" }, member);
      expect(comCodigo.status).toBe(200);
      expect(cancelarIncompleta).toHaveBeenCalledTimes(2);
      expect(criarAssinatura).toHaveBeenCalledTimes(3);
      expect(naStripe.filter((a) => a.status === "incomplete")).toHaveLength(1);
    });
  });

  it("a incompleta foi PAGA no instante do cancelamento: grita no registro, 409, e nenhuma nova", async () => {
    const grito = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await semAssinatura(async () => {
        await assinarComo({ plano: "mensal" }, member);
        cancelarIncompleta.mockResolvedValue("canceled");
        const res = await assinarComo({ plano: "anual" }, member);
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "JaAssinante" });
        expect(criarAssinatura).toHaveBeenCalledTimes(1);
        expect(grito).toHaveBeenCalledWith(expect.stringContaining("PAGA"));
      });
    } finally {
      grito.mockRestore();
    }
  });

  it("a STRIPE diz que a conta já assina (o espelho está atrasado): 409, e nenhuma nova", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await semAssinatura(async () => {
        for (const status of ["active", "past_due", "unpaid", "trialing", "paused"]) {
          naStripe = [{ id: `sub_viva_${status}`, status, plano: "mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null }];
          const res = await assinarComo({ plano: "anual" }, member);
          expect(res.status).toBe(409);
        }
        expect(criarAssinatura).not.toHaveBeenCalled();
        expect(cancelarIncompleta).not.toHaveBeenCalled();
        expect(aviso).toHaveBeenCalledTimes(5);
      });
    } finally {
      aviso.mockRestore();
    }
  });

  it("assinatura encerrada na Stripe (cancelada ou expirada) não impede assinar de novo", async () => {
    await semAssinatura(async () => {
      naStripe = [
        { id: "sub_cancelada", status: "canceled", plano: "mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null },
        { id: "sub_expirada", status: "incomplete_expired", plano: "mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null },
      ];
      const res = await assinarComo({ plano: "mensal" }, member);
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe("pagar");
      expect(cancelarIncompleta).not.toHaveBeenCalled();
    });
  });

  it("DOIS CLIQUES ao mesmo tempo: UMA assinatura, um cliente, e as duas respostas com o mesmo segredo", async () => {
    await semAssinatura(async () => {
      const [a, b] = await Promise.all([assinarComo({ plano: "mensal" }, member), assinarComo({ plano: "mensal" }, member)]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      expect(a.body.segredo).toBe(b.body.segredo);
      expect(criarAssinatura).toHaveBeenCalledTimes(1);
      expect(criarCliente).toHaveBeenCalledTimes(1);
    });
  });

  it("código de 100% para sempre: a Stripe já devolve ativa — sem cartão, sem segredo", async () => {
    criarAssinatura.mockImplementation(async (pedido) => ({ id: "sub_cem", status: "active", plano: pedido.plano, codigoId: pedido.codigoId, segredoDoPagamento: null, segredoDoCartao: "seti_cem_secret_x" }));
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "mensal", codigo: " teste100 " }, member);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ estado: "ativa" });
      expect(buscarCodigo).toHaveBeenCalledWith("teste100");
      expect(criarAssinatura.mock.calls[0]?.[0].codigoId).toBe("promo_cem");
    });
  });

  it("100% só na primeira cobrança: nada hoje, mas o cartão é guardado para a seguinte", async () => {
    buscarCodigo.mockResolvedValue({ id: "promo_primeira", desconto: { percentual: 100, centavos: null, duracao: "uma-vez", meses: null } });
    criarAssinatura.mockImplementation(async (pedido) => ({ id: "sub_primeira", status: "active", plano: pedido.plano, codigoId: pedido.codigoId, segredoDoPagamento: null, segredoDoCartao: "seti_primeira_secret_x" }));
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "mensal", codigo: "PRIMEIRA" }, member);
      expect(res.body).toEqual({ estado: "pagar", segredo: "seti_primeira_secret_x", tipo: "cartao" });
    });
  });

  it("código que não vale: 400 CodigoInvalido — sem cliente e sem assinatura", async () => {
    buscarCodigo.mockResolvedValue(null);
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "mensal", codigo: "NAOEXISTE" }, member);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "CodigoInvalido" });
    });
    expect(criarCliente).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("a Stripe falha ao criar a assinatura: 500 sem segredo — e o cliente já guardado é o que a nova tentativa usa", async () => {
    await semAssinatura(async () => {
      criarAssinatura.mockRejectedValueOnce(new Error("[stripe] a criação da assinatura falhou: StripeConnectionError"));
      const falhou = await assinarComo({ plano: "mensal" }, member);
      expect(falhou.status).toBe(500);
      expect(falhou.body).not.toHaveProperty("segredo");
      const deNovo = await assinarComo({ plano: "mensal" }, member);
      expect(deNovo.status).toBe(200);
      expect(criarCliente).toHaveBeenCalledTimes(1);
    });
  });

  it("o segredo do pagamento não vai para o registro", async () => {
    const registro = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await semAssinatura(async () => {
        const res = await assinarComo({ plano: "mensal" }, member);
        const linhas = registro.mock.calls.map((linha) => linha.join(" ")).join("\n");
        expect(linhas).toContain("checkout");
        expect(linhas).not.toContain(res.body.segredo);
        expect(linhas).not.toContain("_secret_");
      });
    } finally {
      registro.mockRestore();
    }
  });
});
