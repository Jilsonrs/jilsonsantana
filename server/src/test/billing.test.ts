import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { AssinaturaNaStripe, AssinaturaNoCheckout, CodigoPromocional, PrecoDoPlano } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. O resto de `lib/stripe.ts` (a
// chave publicável, o que está configurado) roda de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarCodigo = vi.fn<(codigo: string) => Promise<CodigoPromocional | null>>();
const calcularPrevia = vi.fn<(precoId: string, codigoId: string) => Promise<{ centavosHoje: number; moeda: string } | null>>();
type PedidoDeAssinatura = { clienteId: string; userId: string; precoId: string; plano: string; codigoId: string | null };
const criarCliente = vi.fn<(conta: { userId: string; email: string; nome: string | null }) => Promise<{ id: string; livemode: boolean }>>();
const assinaturasDoCliente = vi.fn<(clienteId: string) => Promise<AssinaturaNoCheckout[]>>();
const cancelarIncompleta = vi.fn<(id: string) => Promise<string>>();
const criarAssinatura = vi.fn<(pedido: PedidoDeAssinatura) => Promise<AssinaturaNoCheckout | null>>();
// A busca que a SINCRONIA faz na Stripe (etapa 4.4): o checkout a chama quando a Stripe diz que
// a conta já assina e o espelho não dá acesso.
const buscarAssinatura = vi.fn<(id: string) => Promise<AssinaturaNaStripe>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
  buscarCodigo: (codigo: string) => buscarCodigo(codigo),
  calcularPrevia: (precoId: string, codigoId: string) => calcularPrevia(precoId, codigoId),
  criarCliente: (conta: { userId: string; email: string; nome: string | null }) => criarCliente(conta),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
  criarAssinatura: (pedido: PedidoDeAssinatura) => criarAssinatura(pedido),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
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
//   - QUEM PAGOU E FICOU TRANCADO (o aviso da Stripe se perdeu): assinar de novo SINCRONIZA o
//     espelho e a conta passa a ter acesso — sem assinatura nova; a Stripe fora do ar nessa hora
//     é 500, nunca um "já é assinante" com a aula trancada; e a conta da sessão nunca fica com a
//     assinatura que a Stripe diz ser de outra conta (etapa 4.4);
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
    expect(res.body).toEqual({ temAcesso: true, reativar: false });
  });

  it("conta sem assinatura que dê acesso: não tem", async () => {
    await semAssinatura(async () => {
      expect((await situacao(member)).body.temAcesso).toBe(false);
    });
  });

  // "REATIVAR ASSINATURA" (etapa 4.4 — decisão do operador, 10/10/2026): "Assinar" só na
  // primeira vez. `reativar` é só o TEXTO do convite: quem já foi assinante e está sem acesso.
  it("reativar: sim para quem JÁ FOI assinante e está sem acesso; não para quem só tentou pagar, nem para quem tem acesso", async () => {
    const com = (status: string, currentPeriodEnd: Date) => prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status, currentPeriodEnd } });
    const [PASSADO, FUTURO] = [new Date("2020-01-01T00:00:00Z"), new Date("2100-01-01T00:00:00Z")];
    try {
      const casos: [string, Date, { temAcesso: boolean; reativar: boolean }][] = [
        ["canceled", PASSADO, { temAcesso: false, reativar: true }],
        ["unpaid", PASSADO, { temAcesso: false, reativar: true }],
        ["incomplete", FUTURO, { temAcesso: false, reativar: false }],
        ["incomplete_expired", PASSADO, { temAcesso: false, reativar: false }],
        // Cancelou e ainda tem dias pagos: continua assistindo — não há o que reativar.
        ["canceled", FUTURO, { temAcesso: true, reativar: false }],
        ["past_due", PASSADO, { temAcesso: true, reativar: false }],
      ];
      for (const [status, fim, esperado] of casos) {
        await com(status, fim);
        expect((await situacao(member)).body, `${status} até ${fim.getFullYear()}`).toEqual(esperado);
      }
    } finally {
      await com("active", FUTURO);
    }
  });

  it("assinatura que nunca foi paga (incomplete) não libera; quando o espelho passa a ativa, libera", async () => {
    await semAssinatura(async () => {
      const nova = await prisma.subscription.create({ data: { ownerUserId: memberId, status: "incomplete", stripeSubscriptionId: `sub_da_tela_${S}` } });
      try {
        expect((await situacao(member)).body.temAcesso).toBe(false);
        // É o que o aviso da Stripe faz quando o pagamento passa.
        await prisma.subscription.update({ where: { id: nova.id }, data: { status: "active" } });
        expect((await situacao(member)).body.temAcesso).toBe(true);
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
  // Cada assinatura criada fica com o cliente que a pediu; as postas à mão num teste (sem
  // `cliente`) valem para quem perguntar.
  let naStripe: (AssinaturaNoCheckout & { cliente?: string })[] = [];
  const incompleta = (id: string, precoId: string, codigoId: string | null = null): AssinaturaNoCheckout => ({ id, status: "incomplete", precoId, codigoId, segredoDoPagamento: `pi_${id}_secret_x`, segredoDoCartao: null });
  const encerrada = (id: string, status: string): AssinaturaNoCheckout => ({ id, status, precoId: "price_mensal", codigoId: null, segredoDoPagamento: null, segredoDoCartao: null });

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
    // Sem resposta combinada, a sincronia falha: nenhum teste herda a Stripe de mentira do anterior.
    buscarAssinatura.mockReset().mockRejectedValue(new Error("este teste não combinou o que a Stripe diz da assinatura"));
    criarCliente.mockReset().mockImplementation(async () => ({ id: `cus_${S}_${++n}`, livemode: false }));
    assinaturasDoCliente.mockReset().mockImplementation(async (clienteId) => naStripe.filter((a) => a.cliente === undefined || a.cliente === clienteId));
    cancelarIncompleta.mockReset().mockImplementation(async (id) => {
      naStripe = naStripe.map((a) => (a.id === id ? { ...a, status: "incomplete_expired", segredoDoPagamento: null } : a));
      return "incomplete_expired";
    });
    criarAssinatura.mockReset().mockImplementation(async (pedido) => {
      // Um instante, como a rede: sem a trava por conta, dois pedidos juntos passariam os dois da lista.
      await new Promise((ok) => setTimeout(ok, 30));
      const nova = incompleta(`sub_${S}_${++n}`, pedido.precoId, pedido.codigoId);
      naStripe.push({ ...nova, cliente: pedido.clienteId });
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

  // QUEM PAGOU E FICOU TRANCADO (etapa 4.4 — o achado P1 da revisão de segurança da 4.2).
  describe("a Stripe diz que a conta já assina, e o espelho não dá acesso", () => {
    const DIA = 24 * 60 * 60 * 1000;
    const acesso = async () => (await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).body.temAcesso;
    const doEspelho = (id: string) => prisma.subscription.findUnique({ where: { stripeSubscriptionId: id } });
    /** O que a sincronia ouve da Stripe sobre a assinatura. */
    const dizAStripe = (id: string, dados: Partial<AssinaturaNaStripe> = {}): AssinaturaNaStripe => ({
      id,
      status: "active",
      pagoAte: new Date(Date.now() + 30 * DIA),
      clienteId: "cus_do_member",
      userId: memberId,
      livemode: false,
      ...dados,
    });

    afterEach(async () => {
      await prisma.subscription.deleteMany({ where: { stripeSubscriptionId: { startsWith: `sub_viva_${S}` } } });
    });

    it("o aviso se perdeu: assinar de novo SINCRONIZA — 409, o espelho nasce da Stripe, a conta passa a ter acesso, e nenhuma assinatura nova", async () => {
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_perdida`;
        naStripe = [encerrada(id, "active")];
        buscarAssinatura.mockResolvedValue(dizAStripe(id));
        expect(await acesso()).toBe(false);

        const res = await assinarComo({ plano: "anual" }, member);
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "JaAssinante" });
        expect(buscarAssinatura).toHaveBeenCalledWith(id);
        expect(await doEspelho(id)).toMatchObject({ ownerUserId: memberId, status: "active" });
        expect(await acesso()).toBe(true);
        expect(criarAssinatura).not.toHaveBeenCalled();
        expect(cancelarIncompleta).not.toHaveBeenCalled();
      });
    });

    it("o espelho estava ATRASADO (parou em incompleta; na Stripe a assinatura já vale): a sincronia o atualiza, e a conta passa a ter acesso", async () => {
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_atrasada`;
        await prisma.subscription.create({ data: { ownerUserId: memberId, status: "incomplete", currentPeriodEnd: null, stripeSubscriptionId: id } });
        naStripe = [encerrada(id, "past_due")];
        buscarAssinatura.mockResolvedValue(dizAStripe(id, { status: "past_due", pagoAte: new Date(Date.now() - DIA) }));
        expect((await assinarComo({ plano: "mensal" }, member)).status).toBe(409);
        expect((await doEspelho(id))?.status).toBe("past_due");
        expect(await acesso()).toBe(true);
      });
    });

    it("sincronizou e a conta segue sem acesso: 409 — e GRITA nos dois casos (precisa de gente): pagando e trancado fora, ou querendo assinar sem conseguir", async () => {
      const grito = vi.spyOn(console, "error").mockImplementation(() => {});
      const qual = (linha: unknown) => String(linha).match(new RegExp(`sub_viva_${S}_(\\w+)`))?.[1];
      try {
        await semAssinatura(async () => {
          // Dá acesso na Stripe, mas ela não diz de que conta é: o espelho não nasce.
          for (const status of ["active", "past_due", "trialing"]) {
            const id = `sub_viva_${S}_${status}`;
            naStripe = [encerrada(id, status)];
            buscarAssinatura.mockResolvedValue(dizAStripe(id, { status, userId: null }));
            expect((await assinarComo({ plano: "anual" }, member)).status).toBe(409);
            expect(await doEspelho(id)).toBeNull();
          }
          // Não dá acesso nem na Stripe: o espelho nasce, e a conta segue trancada — é o certo. Mas
          // ela também não consegue assinar de novo, e isso não pode ficar mudo (pendência P60).
          for (const status of ["unpaid", "paused"]) {
            const id = `sub_viva_${S}_${status}`;
            naStripe = [encerrada(id, status)];
            buscarAssinatura.mockResolvedValue(dizAStripe(id, { status, pagoAte: new Date(Date.now() - DIA) }));
            expect((await assinarComo({ plano: "anual" }, member)).status).toBe(409);
            expect((await doEspelho(id))?.status).toBe(status);
          }
          expect(await acesso()).toBe(false);
          expect(criarAssinatura).not.toHaveBeenCalled();
          const gritos = grito.mock.calls.map(([linha]) => String(linha));
          expect(gritos.map(qual)).toEqual(["active", "past_due", "trialing", "unpaid", "paused"]);
          expect(gritos.map((linha) => linha.includes("trancado fora"))).toEqual([true, true, true, false, false]);
          expect(gritos.map((linha) => linha.includes("quer assinar e não consegue"))).toEqual([false, false, false, true, true]);
        });
      } finally {
        grito.mockRestore();
      }
    });

    it("a Stripe não responde na hora de sincronizar: 500 — nunca um \"já é assinante\" com a aula trancada — e nada é gravado", async () => {
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_fora_do_ar`;
        naStripe = [encerrada(id, "active")];
        buscarAssinatura.mockRejectedValue(new Error("a Stripe não respondeu"));
        const res = await assinarComo({ plano: "mensal" }, member);
        expect(res.status).toBe(500);
        expect(JSON.stringify(res.body)).not.toContain("JaAssinante");
        expect(await doEspelho(id)).toBeNull();
        expect(await acesso()).toBe(false);
      });
    });

    it("a conta da sessão NÃO fica com a assinatura que a Stripe diz ser de OUTRA conta", async () => {
      const grito = vi.spyOn(console, "error").mockImplementation(() => {});
      const outra = await prisma.user.create({ data: { id: `outra-${S}`, email: `outra-${S}@teste.local` } });
      try {
        await semAssinatura(async () => {
          const id = `sub_viva_${S}_de_outra`;
          naStripe = [encerrada(id, "active")];
          buscarAssinatura.mockResolvedValue(dizAStripe(id, { userId: outra.id }));
          expect((await assinarComo({ plano: "mensal" }, member)).status).toBe(409);
          expect((await doEspelho(id))?.ownerUserId).toBe(outra.id);
          expect(await acesso()).toBe(false);
          expect(grito.mock.calls.flat().join(" ")).toContain("trancado fora");
        });
      } finally {
        grito.mockRestore();
        await prisma.user.delete({ where: { id: outra.id } });
      }
    });
  });

  it("assinatura encerrada na Stripe (cancelada ou expirada) não impede assinar de novo", async () => {
    await semAssinatura(async () => {
      naStripe = [encerrada("sub_cancelada", "canceled"), encerrada("sub_expirada", "incomplete_expired")];
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
    criarAssinatura.mockImplementation(async (pedido) => ({ id: "sub_cem", status: "active", precoId: pedido.precoId, codigoId: pedido.codigoId, segredoDoPagamento: null, segredoDoCartao: "seti_cem_secret_x" }));
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
    criarAssinatura.mockImplementation(async (pedido) => ({ id: "sub_primeira", status: "active", precoId: pedido.precoId, codigoId: pedido.codigoId, segredoDoPagamento: null, segredoDoCartao: "seti_primeira_secret_x" }));
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

  it("o segredo do pagamento não vai para o registro — por nenhuma das quatro vias", async () => {
    const vias = (["info", "warn", "error", "log"] as const).map((via) => vi.spyOn(console, via).mockImplementation(() => {}));
    try {
      await semAssinatura(async () => {
        const res = await assinarComo({ plano: "mensal" }, member);
        // Também nos caminhos que gritam: a viva na Stripe e a paga no cancelamento.
        cancelarIncompleta.mockResolvedValueOnce("canceled");
        await assinarComo({ plano: "anual" }, member);
        naStripe = [encerrada("sub_viva", "active")];
        buscarAssinatura.mockResolvedValue({ id: "sub_viva", status: "active", pagoAte: new Date("2100-01-01T00:00:00Z"), clienteId: "cus_sem_conta", userId: null, livemode: false });
        await assinarComo({ plano: "mensal" }, member);
        const linhas = vias.flatMap((via) => via.mock.calls.map((linha) => linha.join(" "))).join("\n");
        expect(linhas).toContain("checkout");
        expect(linhas).toContain("trancado fora");
        expect(linhas).not.toContain(res.body.segredo);
        expect(linhas).not.toContain("_secret_");
      });
    } finally {
      for (const via of vias) via.mockRestore();
    }
  });

  // ── Achados da revisão de segurança da etapa (10/10/2026) ────────────────────────────────────

  it("DUAS contas: cada uma com o SEU cliente — a incompleta de uma nunca volta para a outra", async () => {
    const admin = await sessao(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
    const adminId = (await prisma.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL }, select: { id: true } })).id;
    try {
      await semAssinatura(async () => {
        const doMember = await assinarComo({ plano: "mensal" }, member);
        const doAdmin = await assinarComo({ plano: "mensal" }, admin);
        expect(doAdmin.status).toBe(200);
        expect(doAdmin.body.segredo).not.toBe(doMember.body.segredo);
        const clientes = await prisma.stripeCustomer.findMany({ where: { userId: { in: [memberId, adminId] } } });
        const clienteDe = (userId: string) => clientes.find((c) => c.userId === userId)?.stripeCustomerId;
        expect(clienteDe(adminId)).toBeTruthy();
        expect(clienteDe(adminId)).not.toBe(clienteDe(memberId));
        // A lista e a criação do admin foram pedidas com o cliente e a conta DELE.
        expect(assinaturasDoCliente).toHaveBeenLastCalledWith(clienteDe(adminId));
        expect(criarAssinatura).toHaveBeenLastCalledWith(expect.objectContaining({ userId: adminId, clienteId: clienteDe(adminId) }));
        expect(criarAssinatura).toHaveBeenCalledTimes(2);
        expect(criarCliente).toHaveBeenCalledTimes(2);
      });
    } finally {
      await prisma.stripeCustomer.deleteMany({ where: { userId: adminId } });
    }
  });

  it("o checkout NÃO grava o espelho: depois de assinar (a pagar, ou já ativa na Stripe), a conta segue sem acesso até o aviso chegar", async () => {
    await semAssinatura(async () => {
      const antes = await prisma.subscription.count({ where: { ownerUserId: memberId } });
      expect((await assinarComo({ plano: "mensal" }, member)).body.estado).toBe("pagar");
      criarAssinatura.mockImplementation(async (pedido) => ({ id: "sub_cem", status: "active", precoId: pedido.precoId, codigoId: pedido.codigoId, segredoDoPagamento: null, segredoDoCartao: null }));
      expect((await assinarComo({ plano: "mensal", codigo: "TESTE100" }, member)).body.estado).toBe("ativa");
      expect(await prisma.subscription.count({ where: { ownerUserId: memberId } })).toBe(antes);
      expect((await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).body.temAcesso).toBe(false);
    });
  });

  it("quem já tem acesso NEM chega à Stripe: a resposta não diz a um assinante se um código existe", async () => {
    buscarCodigo.mockResolvedValue(null);
    const comCodigoQueNaoExiste = await assinarComo({ plano: "mensal", codigo: "NAOEXISTE" }, member);
    buscarCodigo.mockResolvedValue(CEM_PARA_SEMPRE);
    const comCodigoQueExiste = await assinarComo({ plano: "mensal", codigo: "TESTE100" }, member);
    expect(comCodigoQueNaoExiste.status).toBe(409);
    expect(comCodigoQueExiste.status).toBe(409);
    expect(comCodigoQueExiste.body).toEqual(comCodigoQueNaoExiste.body);
    expect(buscarCodigo).not.toHaveBeenCalled();
    expect(buscarPrecos).not.toHaveBeenCalled();
  });

  it("o aviso da Stripe chegou enquanto o pedido esperava: COM a trava, confere de novo — 409, sem ir às assinaturas na Stripe", async () => {
    await semAssinatura(async () => {
      // A busca dos preços roda ANTES da trava: no meio dela, o aviso libera a conta.
      buscarPrecos.mockImplementationOnce(async () => {
        await prisma.subscription.update({ where: { stripeSubscriptionId: ASSINATURA_DE_TESTE }, data: { status: "active", currentPeriodEnd: new Date("2100-01-01T00:00:00Z") } });
        return PRECOS;
      });
      const res = await assinarComo({ plano: "mensal" }, member);
      expect(res.status).toBe(409);
      expect(assinaturasDoCliente).not.toHaveBeenCalled();
      expect(criarAssinatura).not.toHaveBeenCalled();
    });
  });

  it("a Stripe recusa o desconto NA CRIAÇÃO (o código esgotou entre a prévia e o clique): 400 CodigoInvalido, igual a código que não existe", async () => {
    criarAssinatura.mockResolvedValue(null);
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "mensal", codigo: "ESGOTOU" }, member);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "CodigoInvalido" });
    });
  });

  it("o PREÇO do plano mudou: a incompleta do preço antigo NÃO é reaproveitada — é cancelada, e nasce outra com o preço de agora", async () => {
    await semAssinatura(async () => {
      naStripe = [incompleta("sub_do_preco_antigo", "price_mensal_antigo")];
      const res = await assinarComo({ plano: "mensal" }, member);
      expect(res.status).toBe(200);
      expect(res.body.segredo).not.toBe("pi_sub_do_preco_antigo_secret_x");
      expect(cancelarIncompleta).toHaveBeenCalledWith("sub_do_preco_antigo");
      expect(criarAssinatura).toHaveBeenCalledWith(expect.objectContaining({ precoId: "price_mensal" }));
    });
  });

  it("nenhuma resposta por conta fica em cache — nem a que leva o segredo do pagamento", async () => {
    const semCache = "private, no-store";
    expect((await planos(member)).headers["cache-control"]).toBe(semCache);
    expect((await previa({ plano: "mensal", codigo: "TESTE100" }, member)).headers["cache-control"]).toBe(semCache);
    expect((await request(servidor).get("/api/billing/assinatura").set("Cookie", member)).headers["cache-control"]).toBe(semCache);
    await semAssinatura(async () => {
      const res = await assinarComo({ plano: "mensal" }, member);
      expect(res.body.segredo).toBeTruthy();
      expect(res.headers["cache-control"]).toBe(semCache);
    });
  });
});
