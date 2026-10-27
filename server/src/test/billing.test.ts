import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import type { DocumentoFiscal } from "@jilson/core";
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
// O CPF ou CNPJ na FICHA DO CLIENTE (etapa 4.7, passo 6): devolve se o número MUDOU.
const acertarNumeroFiscal = vi.fn<(clienteId: string, documento: DocumentoFiscal) => Promise<boolean>>();
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
  acertarNumeroFiscal: (clienteId: string, documento: DocumentoFiscal) => acertarNumeroFiscal(clienteId, documento),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { DocumentoRecusado } from "../lib/stripe.js";
import { assinaturasAoMesmoTempo, comVaga } from "../lib/assinaturas-em-andamento.js";
import { prisma } from "../lib/prisma.js";
import { ASSINATURA_DE_TESTE } from "../lib/assinatura-de-teste.js";
import { invalidarCacheDeTexto } from "../lib/dict.js";
import { pt as fabrica } from "@jilson/core";

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
      // "O que está incluído": a lista do cartão de preço da home (passo 6d).
      incluido: { itens: [...fabrica.home.pricing.features], frase: fabrica.home.pricing.footer },
    });
  });

  // A LISTA É UM TEXTO SÓ COM A HOME (decisão do operador, 27/10/2026): mudou no admin, muda nos dois.
  it("\"O que está incluído\" vem com as edições do admin — o mesmo texto do cartão da home", async () => {
    await prisma.siteText.createMany({
      data: [
        { key: "home.pricing.features[0]", value: "Item editado no admin" },
        { key: "home.pricing.footer", value: "Frase editada no admin" },
      ],
    });
    invalidarCacheDeTexto();
    try {
      const res = await planos(member);
      expect(res.body.incluido.itens[0]).toBe("Item editado no admin");
      expect(res.body.incluido.itens.slice(1)).toEqual(fabrica.home.pricing.features.slice(1));
      expect(res.body.incluido.frase).toBe("Frase editada no admin");
    } finally {
      await prisma.siteText.deleteMany({});
      invalidarCacheDeTexto();
    }
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
    expect(res.body).toEqual({ temAcesso: true, reativar: false, atrasada: false });
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
      const HA_DIAS = (dias: number) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
      const casos: [string, Date, { temAcesso: boolean; reativar: boolean; atrasada: boolean }][] = [
        ["canceled", PASSADO, { temAcesso: false, reativar: true, atrasada: false }],
        ["unpaid", PASSADO, { temAcesso: false, reativar: true, atrasada: false }],
        ["incomplete", FUTURO, { temAcesso: false, reativar: false, atrasada: false }],
        ["incomplete_expired", PASSADO, { temAcesso: false, reativar: false, atrasada: false }],
        // Cancelou e ainda tem dias pagos: continua assistindo — não há o que reativar.
        ["canceled", FUTURO, { temAcesso: true, reativar: false, atrasada: false }],
        // A COBRANÇA ATRASADA (etapa 4.6b): as aulas ficam por 3 dias; depois trancam, e a
        // situação diz `atrasada` — o caminho é trocar o cartão, e as telas dão a ele a vez.
        ["past_due", HA_DIAS(1), { temAcesso: true, reativar: false, atrasada: false }],
        ["past_due", HA_DIAS(4), { temAcesso: false, reativar: true, atrasada: true }],
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
    // A ficha com memória, como a Stripe: o número igual ao guardado não muda nada.
    const fichas = new Map<string, string>();
    acertarNumeroFiscal.mockReset().mockImplementation(async (clienteId, documento) => {
      const antes = fichas.get(clienteId);
      fichas.set(clienteId, `${documento.tipo}:${documento.numero}`);
      return antes !== `${documento.tipo}:${documento.numero}`;
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

  // A STRIPE CANCELA o pagamento depois de 10 recusas (medido na área restrita, 21/10/2026), e a
  // assinatura continua aberta com o segredo morto: o novo clique ganha outra, em vez de ficar preso.
  it("o pagamento que a Stripe cancelou (10 recusas): o novo clique cancela a antiga e ganha OUTRA — não o segredo morto", async () => {
    await semAssinatura(async () => {
      const primeira = await assinarComo({ plano: "mensal" }, member);
      naStripe = naStripe.map((a) => ({ ...a, pagamentoCancelado: true }));
      const depois = await assinarComo({ plano: "mensal" }, member);
      expect(depois.status).toBe(200);
      expect(depois.body.segredo).not.toBe(primeira.body.segredo);
      expect(cancelarIncompleta).toHaveBeenCalledTimes(1);
      expect(criarAssinatura).toHaveBeenCalledTimes(2);
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
  // O MESMO TETO DAS ASSINATURAS SEM LOGIN (achado P1 da revisão de segurança do passo 6, 27/10/2026):
  // cada assinatura segura uma ligação com o banco enquanto a Stripe responde; ficam sempre 2 livres.
  it("o assinar logado conta no mesmo teto: cheio, 409 'muitos ao mesmo tempo' na hora — e nada vai à Stripe", async () => {
    let soltar!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const ocupadas = Array.from({ length: assinaturasAoMesmoTempo() }, () => comVaga(() => segura));
    try {
      await semAssinatura(async () => {
        const res = await assinarComo({ plano: "mensal", documento: "529.982.247-25" }, member);
        expect([res.status, res.body]).toEqual([409, { error: "MuitosAoMesmoTempo" }]);
        expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
      });
      expect(criarCliente).not.toHaveBeenCalled();
      expect(acertarNumeroFiscal).not.toHaveBeenCalled();
      expect(criarAssinatura).not.toHaveBeenCalled();
    } finally {
      soltar();
      await Promise.all(ocupadas);
    }
    // Soltas as vagas, assina.
    await semAssinatura(async () => {
      expect((await assinarComo({ plano: "mensal" }, member)).status).toBe(200);
    });
  });

  // O CPF OU CNPJ (etapa 4.7, passo 6 — as duas telas iguais, decisão do operador de 27/10/2026): vai
  // para a FICHA DO CLIENTE na Stripe (nunca para os dados do cartão), com a trava, antes de a
  // assinatura — e a primeira fatura dela — nascer.
  describe("o CPF ou CNPJ", () => {
    const CPF = "529.982.247-25";
    const OUTRO_CPF = "111.444.777-35";

    it("vai para a ficha do cliente da conta — o tipo e o número —, ANTES de a assinatura nascer", async () => {
      await semAssinatura(async () => {
        const res = await assinarComo({ plano: "mensal", documento: CPF }, member);
        expect(res.status).toBe(200);
        const guardado = await prisma.stripeCustomer.findUniqueOrThrow({ where: { userId: memberId } });
        expect(acertarNumeroFiscal).toHaveBeenCalledWith(guardado.stripeCustomerId, { tipo: "cpf", numero: "52998224725" });
        const [numeroFiscal] = acertarNumeroFiscal.mock.invocationCallOrder;
        const [assinatura] = criarAssinatura.mock.invocationCallOrder;
        expect(numeroFiscal).toBeLessThan(assinatura ?? 0);
      });
    });

    it("o CNPJ também", async () => {
      await semAssinatura(async () => {
        expect((await assinarComo({ plano: "mensal", documento: "11.222.333/0001-81" }, member)).status).toBe(200);
      });
      expect(acertarNumeroFiscal).toHaveBeenCalledWith(expect.any(String), { tipo: "cnpj", numero: "11222333000181" });
    });

    it("com o dígito errado, vazio ou que não é número: 400, nada vai à Stripe, e o número não volta na resposta", async () => {
      await semAssinatura(async () => {
        for (const documento of ["529.982.247-24", "11.222.333/0001-82", "", "abc"]) {
          const res = await assinarComo({ plano: "mensal", documento }, member);
          expect(res.status, documento).toBe(400);
          expect(res.body.error).toBe("ValidationError");
          if (documento.length > 3) expect(res.text).not.toContain(documento.slice(0, 7));
        }
      });
      expect(criarCliente).not.toHaveBeenCalled();
      expect(acertarNumeroFiscal).not.toHaveBeenCalled();
      expect(criarAssinatura).not.toHaveBeenCalled();
    });

    it("a Stripe recusou o número que o core aceitou: 400 DocumentoInvalido, nada é criado — e o alerta, sem o número", async () => {
      const erros = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        acertarNumeroFiscal.mockRejectedValue(new DocumentoRecusado("cpf"));
        await semAssinatura(async () => {
          const res = await assinarComo({ plano: "mensal", documento: CPF }, member);
          expect([res.status, res.body]).toEqual([400, { error: "DocumentoInvalido" }]);
        });
        expect(criarAssinatura).not.toHaveBeenCalled();
        const alertas = erros.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe]"));
        expect(alertas.some((texto) => texto.includes(memberId))).toBe(true);
        expect(alertas.join(" ")).not.toContain("52998224725");
        expect(alertas.join(" ")).not.toContain(CPF);
      } finally {
        erros.mockRestore();
      }
    });

    it("corrigiu o CPF depois de tentar: a incompleta antiga é cancelada e nasce outra — a fatura dela levava o número antigo", async () => {
      await semAssinatura(async () => {
        const primeira = await assinarComo({ plano: "mensal", documento: CPF }, member);
        // O mesmo número: a MESMA assinatura, o mesmo segredo.
        expect((await assinarComo({ plano: "mensal", documento: CPF }, member)).body).toEqual(primeira.body);
        expect(cancelarIncompleta).not.toHaveBeenCalled();

        const corrigido = await assinarComo({ plano: "mensal", documento: OUTRO_CPF }, member);
        expect(corrigido.status).toBe(200);
        expect(corrigido.body.segredo).not.toBe(primeira.body.segredo);
        expect(cancelarIncompleta).toHaveBeenCalledWith(naStripe[0]?.id);
        expect(criarAssinatura).toHaveBeenCalledTimes(2);
        expect(naStripe.filter((a) => a.status === "incomplete")).toHaveLength(1);
      });
    });

    it("sem o CPF (a tela de antes desta publicação): assina como antes, e a ficha não é mexida", async () => {
      await semAssinatura(async () => {
        expect((await assinarComo({ plano: "mensal" }, member)).status).toBe(200);
      });
      expect(acertarNumeroFiscal).not.toHaveBeenCalled();
      expect(criarAssinatura).toHaveBeenCalledTimes(1);
    });
  });

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

    it("com o CPF: a ficha do cliente que já assina NÃO é mexida — só a sincronia roda", async () => {
      await semAssinatura(async () => {
        const id = `sub_viva_${S}_com_cpf`;
        naStripe = [encerrada(id, "active")];
        buscarAssinatura.mockResolvedValue(dizAStripe(id));
        const res = await assinarComo({ plano: "mensal", documento: "529.982.247-25" }, member);
        expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
        expect(acertarNumeroFiscal).not.toHaveBeenCalled();
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

    // A COBRANÇA ATRASADA há mais de 3 dias (etapa 4.6b): não se assina de novo — a assinatura
    // continua viva, e o caminho é trocar o cartão dela. É o esperado: ninguém é acordado.
    it("a assinatura da conta está com a cobrança atrasada e já sem aulas: 409 'CobrancaAtrasada', sem criar outra e sem alarme", async () => {
      const grito = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await semAssinatura(async () => {
          const id = `sub_viva_${S}_sem_aulas`;
          const falhou = new Date(Date.now() - 4 * DIA);
          await prisma.subscription.create({ data: { ownerUserId: memberId, status: "past_due", currentPeriodEnd: falhou, stripeSubscriptionId: id } });
          naStripe = [encerrada(id, "past_due")];
          buscarAssinatura.mockResolvedValue(dizAStripe(id, { status: "past_due", pagoAte: falhou }));
          const res = await assinarComo({ plano: "mensal" }, member);
          expect([res.status, res.body]).toEqual([409, { error: "CobrancaAtrasada" }]);
          expect(await acesso()).toBe(false);
          expect(criarAssinatura).not.toHaveBeenCalled();
          expect(cancelarIncompleta).not.toHaveBeenCalled();
          expect(grito).not.toHaveBeenCalled();
        });
      } finally {
        grito.mockRestore();
      }
    });

    // A frase do alarme sai da REGRA DO GATE aplicada ao que a Stripe diz — e não de uma lista
    // de status à parte (achado da revisão de segurança, 12/10/2026).
    it("a atrasada há mais de 3 dias que a Stripe não diz de quem é: o espelho não nasce, e o alarme NÃO diz 'trancado fora' (ela já não dá acesso)", async () => {
      const grito = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await semAssinatura(async () => {
          const id = `sub_viva_${S}_atrasada_sem_dono`;
          naStripe = [encerrada(id, "past_due")];
          buscarAssinatura.mockResolvedValue(dizAStripe(id, { status: "past_due", userId: null, pagoAte: new Date(Date.now() - 10 * DIA) }));
          expect((await assinarComo({ plano: "anual" }, member)).body).toEqual({ error: "JaAssinante" });
          expect(await doEspelho(id)).toBeNull();
          const gritos = grito.mock.calls.map(([linha]) => String(linha));
          expect(gritos).toHaveLength(1);
          expect(gritos[0]).toContain("quer assinar e não consegue");
          expect(gritos[0]).not.toContain("trancado fora");
        });
      } finally {
        grito.mockRestore();
      }
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

  // A TRAVA QUE NÃO ESPERA (etapa 4.7, passo 2 — achados P1 das revisões da 4.2 e da 4.4): quem
  // esperasse a trava esperaria segurando uma ligação com o banco. O segundo clique ouve
  // "ocupada" NA HORA; o clique seguinte segue com a MESMA assinatura.
  it("DOIS CLIQUES ao mesmo tempo: o segundo ouve 'ocupada' sem esperar — e o seguinte segue com a MESMA assinatura; um cliente, uma assinatura", async () => {
    await semAssinatura(async () => {
      // O primeiro pedido fica PARADO com a trava na mão (a Stripe de mentira segura a lista).
      let dentro!: () => void;
      let soltar!: () => void;
      const entrou = new Promise<void>((ok) => (dentro = ok));
      const segura = new Promise<void>((ok) => (soltar = ok));
      assinaturasDoCliente.mockImplementationOnce(async (clienteId) => {
        dentro();
        await segura;
        return naStripe.filter((a) => a.cliente === undefined || a.cliente === clienteId);
      });
      const primeiro = assinarComo({ plano: "mensal" }, member).then((res) => res);
      await entrou;

      const segundo = await assinarComo({ plano: "mensal" }, member);
      expect([segundo.status, segundo.body]).toEqual([409, { error: "Ocupada" }]);
      expect(criarAssinatura).not.toHaveBeenCalled();

      soltar();
      const a = await primeiro;
      expect(a.status).toBe(200);
      const depois = await assinarComo({ plano: "mensal" }, member);
      expect(depois.status).toBe(200);
      expect(depois.body.segredo).toBe(a.body.segredo);
      expect(criarAssinatura).toHaveBeenCalledTimes(1);
      expect(criarCliente).toHaveBeenCalledTimes(1);
    });
  });

  // UMA CONTA, UM CLIENTE, na corrida (achado da revisão de segurança do passo 2): a leitura sem
  // trava não achou o cliente, e a outra aba o gravou antes de este pedido pegar a trava. Quem
  // segura é a SEGUNDA leitura, já com a trava — sem ela, nasceria outro cliente na Stripe.
  it("a leitura sem trava chegou atrasada (a outra aba acabou de gravar o cliente): a leitura COM a trava acha — nenhum cliente novo", async () => {
    await semAssinatura(async () => {
      await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: `cus_${S}_da_outra_aba`, livemode: false } });
      // A leitura SEM trava (a do `prisma`, fora da transação) chega atrasada: devolve "nada" uma
      // vez. Não é `vi.spyOn`: no Prisma o método vem de um intermediário, e desfazer o espião (ou
      // apagar a troca) o deixaria vazio para os testes seguintes (medido) — no fim, a função
      // ORIGINAL, guardada antes da troca, volta para o lugar.
      // Seguro: só para trocar e apagar esta propriedade; o resto do objeto não é tocado.
      const delegado = prisma.stripeCustomer as unknown as Record<string, unknown>;
      const original = prisma.stripeCustomer.findUnique;
      let leituras = 0;
      Object.defineProperty(delegado, "findUnique", { configurable: true, writable: true, value: (...args: Parameters<typeof original>) => (++leituras === 1 ? Promise.resolve(null) : original(...args)) });
      try {
        const res = await assinarComo({ plano: "mensal" }, member);
        expect(res.status).toBe(200);
        expect(leituras).toBe(1);
        expect(criarCliente).not.toHaveBeenCalled();
        expect(await prisma.stripeCustomer.count({ where: { userId: memberId } })).toBe(1);
        expect(criarAssinatura.mock.calls[0]?.[0].clienteId).toBe(`cus_${S}_da_outra_aba`);
      } finally {
        Object.defineProperty(delegado, "findUnique", { configurable: true, writable: true, value: original });
      }
      // De volta ao normal: a leitura de verdade acha o cliente.
      expect((await prisma.stripeCustomer.findUnique({ where: { userId: memberId } }))?.stripeCustomerId).toBe(`cus_${S}_da_outra_aba`);
    });
  });

  it("a conta ocupada (outro pedido dela assinando): 409 'ocupada' na hora, e NADA vai à Stripe — com cliente ainda por criar e com cliente já gravado", async () => {
    await semAssinatura(async () => {
      let soltar!: () => void;
      let travou!: () => void;
      const segura = new Promise<void>((ok) => (soltar = ok));
      const travada = new Promise<void>((ok) => (travou = ok));
      const outro = prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assinar:${memberId}`}))`;
        travou();
        await segura;
      }, { timeout: 20_000 });
      await travada;
      try {
        const semCliente = await assinarComo({ plano: "mensal" }, member);
        expect([semCliente.status, semCliente.body]).toEqual([409, { error: "Ocupada" }]);
        await prisma.stripeCustomer.create({ data: { userId: memberId, stripeCustomerId: `cus_${S}_guardado`, livemode: false } });
        const comCliente = await assinarComo({ plano: "mensal" }, member);
        expect([comCliente.status, comCliente.body]).toEqual([409, { error: "Ocupada" }]);
        expect(criarCliente).not.toHaveBeenCalled();
        expect(assinaturasDoCliente).not.toHaveBeenCalled();
        expect(criarAssinatura).not.toHaveBeenCalled();
      } finally {
        soltar();
        await outro;
      }
    });
  });

  // A Stripe JÁ DISSE que há assinatura viva desta conta (muitas vezes paga): responder "ocupada"
  // faria a tela dizer "não foi possível" a quem pode ter acabado de pagar (achado da revisão de
  // segurança do passo 2). É "já é assinante" — e a tela relê o gate.
  it("a Stripe diz que há assinatura e a sincronia dela está ocupada (o aviso chegando): 409 'já é assinante' na hora, sem esperar a trava dela", async () => {
    await semAssinatura(async () => {
      const id = `sub_viva_${S}_ocupada`;
      naStripe = [encerrada(id, "active")];
      let soltar!: () => void;
      let travou!: () => void;
      const segura = new Promise<void>((ok) => (soltar = ok));
      const travada = new Promise<void>((ok) => (travou = ok));
      const aviso = prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
        travou();
        await segura;
      }, { timeout: 20_000 });
      await travada;
      try {
        const res = await assinarComo({ plano: "mensal" }, member);
        expect([res.status, res.body]).toEqual([409, { error: "JaAssinante" }]);
        expect(buscarAssinatura).not.toHaveBeenCalled();
        expect(criarAssinatura).not.toHaveBeenCalled();
      } finally {
        soltar();
        await aviso;
      }
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
