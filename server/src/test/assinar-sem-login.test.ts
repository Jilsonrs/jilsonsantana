import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import type { DocumentoFiscal } from "@jilson/core";
import type { AssinaturaNaStripe, AssinaturaNoCheckout, CodigoPromocional, PedidoDeAssinatura, PrecoDoPlano } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira: só o que iria à rede vira dublê. Uma "Stripe de mentira" guarda as
// assinaturas de cada cliente, para a regra de verdade (a trava, a ficha, a tentativa) rodar contra
// o banco de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
const buscarCodigo = vi.fn<(codigo: string) => Promise<CodigoPromocional | null>>();
const calcularPrevia = vi.fn<(precoId: string, codigoId: string) => Promise<{ centavosHoje: number; moeda: string } | null>>();
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
  calcularPrevia: (precoId: string, codigoId: string) => calcularPrevia(precoId, codigoId),
  criarClienteDoVisitante: (cliente: { pedido: string; email: string; documento: DocumentoFiscal }) => criarClienteDoVisitante(cliente),
  acertarNumeroFiscal: (clienteId: string, documento: DocumentoFiscal) => acertarNumeroFiscal(clienteId, documento),
  assinaturasDoCliente: (clienteId: string) => assinaturasDoCliente(clienteId),
  cancelarIncompleta: (id: string) => cancelarIncompleta(id),
  criarAssinatura: (pedido: PedidoDeAssinatura) => criarAssinatura(pedido),
  buscarAssinatura: (id: string) => buscarAssinatura(id),
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { chaveDoNumeroFiscal, DocumentoRecusado } from "../lib/stripe.js";
import { sincronizarAssinatura } from "../lib/assinaturas.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";
import { assinaturaSemLoginNoAr } from "../routes/billing-sem-login.js";
import { assinaturasAoMesmoTempo } from "../lib/assinaturas-em-andamento.js";

// ASSINAR SEM LOGIN (Fase 4, etapa 4.7, passo 4 — billing.md → *Assinar sem conta*). O que estes
// testes protegem — é a fronteira de dinheiro, aberta a quem não entrou:
//   - FORA DO AR em produção até o operador ligar a chave (passo 8): nada responde, nada vai à Stripe;
//   - o e-mail que já tem conta é mandado entrar ANTES da Stripe (decisão do operador, 21/10/2026);
//   - o CPF ou CNPJ errado recusa o pedido antes da Stripe; o certo vai ao cliente, e só a ele;
//   - a ficha de espera: um e-mail é UM cliente; o corpo não escolhe preço, cliente nem conta;
//   - a TENTATIVA: o novo clique com o código dela segue com a mesma (um cartão recusado não cria
//     outra); sem o código — outra pessoa que saiba o e-mail —, nunca recebe o segredo do pagamento
//     dela: a anterior é cancelada e nasce outra; o CPF trocado também não segue com a antiga;
//   - quem já pagou (o aviso atrasou) e clica de novo: a conta nasce na sincronia, e "já tem conta";
//   - dois cliques do mesmo e-mail ao mesmo tempo: o segundo ouve "ocupada" na hora, sem esperar;
//   - "o pagamento já valeu?": só sim ou não, só pelo código da tentativa;
//   - os limites sem login: por e-mail, por endereço, a prévia com teto por dia (decisão de
//     21/10/2026) e os e-mails novos do dia — que contam CLIENTES criados, nunca pedidos.

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
const PRECOS: PrecoDoPlano[] = [
  { plano: "mensal", precoId: "price_mensal", centavos: 9990, moeda: "brl" },
  { plano: "anual", precoId: "price_anual", centavos: 99500, moeda: "brl" },
];
const CEM_PARA_SEMPRE: CodigoPromocional = { id: "promo_cem", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } };
const CPF = "529.982.247-25";
const OUTRO_CPF = "111.444.777-35";
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "NODE_ENV", "ASSINAR_SEM_LOGIN"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));

let n = 0;
const novoEmail = () => `visitante-${++n}-${S}@teste.local`;

/** A "Stripe de mentira": as assinaturas de cada cliente, como a Stripe as listaria. */
type NaStripe = AssinaturaNoCheckout & { cliente: string };
/** O resumo que a ficha e a Stripe guardam (passo 6b): o SHA-256 da tentativa, em hexadecimal — calculado aqui, à parte. */
const sha256 = (texto: string) => createHash("sha256").update(texto, "utf8").digest("hex");
let naStripe: NaStripe[] = [];

const assinar = (corpo: object, endereco = "198.51.100.20") => request(servidor).post("/api/billing/visitante/assinatura").set("x-forwarded-for", endereco).send(corpo);
const confirmar = (tentativa: unknown) => request(servidor).post("/api/billing/visitante/confirmacao").send({ tentativa });
const pedido = (email: string, extra: object = {}) => ({ email, documento: CPF, plano: "mensal", novidades: false, ...extra });
const ficha = (email: string) => prisma.guestCheckout.findUnique({ where: { email: email.toLowerCase() } });

/** A assinatura do visitante como a Stripe diria agora — paga, com a ficha e a escolha. */
const paga = (sub: string, f: { id: string; stripeCustomerId: string }): AssinaturaNaStripe => ({
  id: sub,
  status: "active",
  pagoAte: new Date(Date.now() + 30 * DIA),
  clienteId: f.stripeCustomerId,
  userId: null,
  pedido: f.id,
  doVisitante: { novidades: false, origem: null, campanha: null },
  livemode: false,
});

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_local";
});

// O número fiscal de cada cliente na Stripe agora; a fatura de cada assinatura nasce com ele (como na Stripe).
let numeros = new Map<string, string>();

beforeEach(() => {
  naStripe = [];
  numeros = new Map<string, string>();
  let cliente = 0;
  let sub = 0;
  buscarPrecos.mockReset().mockResolvedValue(PRECOS);
  buscarCodigo.mockReset().mockResolvedValue(CEM_PARA_SEMPRE);
  calcularPrevia.mockReset().mockResolvedValue({ centavosHoje: 0, moeda: "brl" });
  criarClienteDoVisitante.mockReset().mockImplementation(async (c) => {
    const id = `cus_${S}_${++cliente}_${n}`;
    numeros.set(id, chaveDoNumeroFiscal(c.documento));
    return { id, livemode: false };
  });
  acertarNumeroFiscal.mockReset().mockImplementation(async (clienteId, documento) => {
    numeros.set(clienteId, chaveDoNumeroFiscal(documento));
    return false;
  });
  assinaturasDoCliente.mockReset().mockImplementation(async (clienteId) => naStripe.filter((a) => a.cliente === clienteId));
  cancelarIncompleta.mockReset().mockImplementation(async (id) => {
    naStripe = naStripe.map((a) => (a.id === id ? { ...a, status: "incomplete_expired", segredoDoPagamento: null } : a));
    return "incomplete_expired";
  });
  criarAssinatura.mockReset().mockImplementation(async (p) => {
    const id = `sub_${S}_${++sub}_${n}`;
    const resumoDaTentativa = "visitante" in p ? p.visitante.resumoDaTentativa : null;
    const nova: NaStripe = { id, status: "incomplete", precoId: p.precoId, codigoId: p.codigoId, segredoDoPagamento: `pi_${id}_secret_x`, segredoDoCartao: null, resumoDaTentativa, numeroFiscalDaFatura: numeros.get(p.clienteId) ?? null, cliente: p.clienteId };
    naStripe.push(nova);
    return nova;
  });
  buscarAssinatura.mockReset().mockRejectedValue(new Error("a assinatura não devia ter sido buscada"));
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
  // Apagar a conta leva junto a ligação com a Stripe e a ficha dela (cascade); as fichas sem conta saem depois.
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("fora do ar no site até o dia de abrir (passo 8)", () => {
  it("só em produção depende da chave, e só o valor exato a liga", () => {
    expect(assinaturaSemLoginNoAr({ NODE_ENV: "production" })).toBe(false);
    expect(assinaturaSemLoginNoAr({ NODE_ENV: "production", ASSINAR_SEM_LOGIN: "sim" })).toBe(false);
    expect(assinaturaSemLoginNoAr({ NODE_ENV: "production", ASSINAR_SEM_LOGIN: "true" })).toBe(true);
    expect(assinaturaSemLoginNoAr({ NODE_ENV: "test" })).toBe(true);
    expect(assinaturaSemLoginNoAr({ NODE_ENV: "development" })).toBe(true);
  });

  it("em produção, sem a chave: as cinco rotas respondem 404, e nada vai à Stripe nem ao banco", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ASSINAR_SEM_LOGIN;
    try {
      const email = novoEmail();
      const respostas = [
        await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", "198.51.100.30"),
        await request(servidor).post("/api/billing/visitante/previa").set("x-forwarded-for", "198.51.100.30").send({ plano: "mensal", codigo: "X" }),
        await assinar(pedido(email), "198.51.100.30"),
        await confirmar("qualquer"),
        await request(servidor).post("/api/billing/visitante/senha").set("x-forwarded-for", "198.51.100.30").send({ tentativa: "qualquer", senha: "senha-qualquer-1" }),
      ];
      expect(respostas.map((r) => [r.status, r.body])).toEqual(Array(5).fill([404, { error: "NaoEncontrado" }]));
      expect(buscarPrecos).not.toHaveBeenCalled();
      expect(criarClienteDoVisitante).not.toHaveBeenCalled();
      expect(await ficha(email)).toBeNull();

      // Ligada a chave, a mesma rota responde.
      process.env.ASSINAR_SEM_LOGIN = "true";
      expect((await request(servidor).get("/api/billing/visitante/planos").set("x-forwarded-for", "198.51.100.30")).status).toBe(200);
    } finally {
      // `process.env.X = undefined` gravaria o TEXTO "undefined": devolve o valor, ou apaga.
      if (antes.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = antes.NODE_ENV;
      delete process.env.ASSINAR_SEM_LOGIN;
    }
  });
});

describe("em produção, sem o endereço de quem pede", () => {
  // DA REVISÃO DE SEGURANÇA DO PASSO (21/10/2026): com login, o pedido sem `x-forwarded-for` válido não conta por
  // endereço porque o teto da CONTA continua (passo 1). Sem login não há conta: não contar deixaria
  // as rotas sem limite nenhum. Contam todos juntos, numa contagem só — e o alerta de sempre.
  it("as rotas sem login contam todos juntos (o 21º pedido de prévia, de quem for, é recusado) — e o alerta sai uma vez", async () => {
    process.env.NODE_ENV = "production";
    process.env.ASSINAR_SEM_LOGIN = "true";
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const previa = () => request(servidor).post("/api/billing/visitante/previa").send({ plano: "mensal", codigo: "ADIVINHA" });
      for (let i = 0; i < 20; i++) expect((await previa()).status, `prévia ${i + 1}`).toBe(200);
      expect((await previa()).status).toBe(429);
      expect(alerta.mock.calls.filter(([linha]) => String(linha).includes("x-forwarded-for")).length).toBe(1);
    } finally {
      if (antes.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = antes.NODE_ENV;
      delete process.env.ASSINAR_SEM_LOGIN;
    }
  });
});

describe("os planos e a prévia, sem login", () => {
  it("os planos: o valor da Stripe e a chave publicável — o código do preço e a chave secreta não saem", async () => {
    const res = await request(servidor).get("/api/billing/visitante/planos");
    expect(res.status).toBe(200);
    expect(res.body.planos).toEqual([
      { plano: "mensal", centavos: 9990, moeda: "brl" },
      { plano: "anual", centavos: 99500, moeda: "brl" },
    ]);
    expect(res.body.chavePublicavel).toBe("pk_test_da_suite_local");
    expect(res.text).not.toContain("price_");
    expect(res.text).not.toContain("sk_test");
  });

  it("a prévia: a conta é da Stripe, para o preço do plano pedido; código que não vale, a mesma recusa", async () => {
    calcularPrevia.mockResolvedValue({ centavosHoje: 49750, moeda: "brl" });
    const res = await request(servidor).post("/api/billing/visitante/previa").send({ plano: "anual", codigo: " CORTESIA-K7Q2 ", precoId: "price_barato" });
    expect([res.status, res.body.centavosHoje]).toEqual([200, 49750]);
    expect(calcularPrevia).toHaveBeenCalledWith("price_anual", "promo_cem");
    expect(buscarCodigo).toHaveBeenCalledWith("CORTESIA-K7Q2");
    expect(res.text).not.toContain("promo_cem");

    buscarCodigo.mockResolvedValue(null);
    const ruim = await request(servidor).post("/api/billing/visitante/previa").send({ plano: "anual", codigo: "NAOEXISTE" });
    expect([ruim.status, ruim.body]).toEqual([400, { error: "CodigoInvalido" }]);
  });
});

describe("assinar sem login — antes da Stripe", () => {
  it("o e-mail que JÁ TEM CONTA (digitado em maiúsculas): 409 JaTemConta, e nada vai à Stripe", async () => {
    const res = await assinar(pedido(String(process.env.SEED_MEMBER_EMAIL).toUpperCase()));
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
  });

  // O GATILHO DE REABERTURA do "quem digita um e-mail descobre se ele tem conta" (decisão do operador,
  // 21/10/2026) só pode ser visto com a recusa no registro — P2 da revisão de segurança do passo 6.
  it("cada recusa \"já tem conta\" deixa uma linha no registro, com o endereço só como MARCA: a mesma para o mesmo endereço, sem IP nem e-mail", async () => {
    const linhas = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const email = String(process.env.SEED_MEMBER_EMAIL);
      for (const endereco of ["198.51.100.171", "198.51.100.171", "198.51.100.172"]) await assinar(pedido(email), endereco);
      const recusas = linhas.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[api] assinar sem login: e-mail com conta, recusado"));
      expect(recusas).toHaveLength(3);
      const marcas = recusas.map((texto) => /endereço ([0-9a-f]{16})\)$/.exec(texto)?.[1]);
      expect(marcas.every(Boolean)).toBe(true);
      expect(marcas[0]).toBe(marcas[1]);
      expect(marcas[2]).not.toBe(marcas[0]);
      expect(recusas.join(" ")).not.toContain("198.51.100");
      expect(recusas.join(" ")).not.toContain(email);
    } finally {
      linhas.mockRestore();
    }
  });

  it("o CPF ou CNPJ errado: 400, sem repetir o número, e nada vai à Stripe nem ao banco", async () => {
    const email = novoEmail();
    for (const documento of ["529.982.247-24", "11.222.333/0001-82", "", "abc"]) {
      const res = await assinar(pedido(email, { documento }));
      expect(res.status, documento).toBe(400);
      expect(res.body.error).toBe("ValidationError");
      if (documento.length > 3) expect(res.text).not.toContain(documento.slice(0, 7));
    }
    expect(buscarPrecos).not.toHaveBeenCalled();
    expect(await ficha(email)).toBeNull();
  });

  it("nada fica em cache, e o pedido que vem de OUTRO SITE é recusado antes de qualquer coisa", async () => {
    const deFora = await request(servidor).post("/api/billing/visitante/assinatura").set("Sec-Fetch-Site", "cross-site").send(pedido(novoEmail()));
    expect([deFora.status, deFora.body]).toEqual([403, { error: "OutroSite" }]);
    expect(buscarPrecos).not.toHaveBeenCalled();
    const planos = await request(servidor).get("/api/billing/visitante/planos");
    expect(planos.headers["cache-control"]).toBe("private, no-store");
  });

  // A conta pode nascer DEPOIS da primeira conferência (o aviso de um pagamento que já tinha
  // passado): as conferências COM a trava — a da ficha e a da decisão — é que seguram.
  it("a conta nasce no meio, antes da ficha: 'já tem conta', sem cliente nem assinatura", async () => {
    const email = novoEmail();
    buscarPrecos.mockImplementationOnce(async () => {
      await prisma.user.create({ data: { id: `conta-${S}-meio-1`, email } });
      return PRECOS;
    });
    const res = await assinar(pedido(email));
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("a conta nasce no meio, depois da ficha: 'já tem conta', sem assinatura nova", async () => {
    const email = novoEmail();
    await assinar(pedido(email));
    // A ficha já existe: o que segura agora é a conferência COM a trava, na decisão.
    buscarPrecos.mockImplementationOnce(async () => {
      await prisma.user.create({ data: { id: `conta-${S}-meio-2`, email } });
      return PRECOS;
    });
    const res = await assinar(pedido(email));
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(criarAssinatura).toHaveBeenCalledTimes(1);
    expect(assinaturasDoCliente).toHaveBeenCalledTimes(1);
  });

  // DA REVISÃO DE SEGURANÇA DO PASSO (21/10/2026): a ficha que já virou conta é tratada como conta,
  // e não só pelo e-mail — no dia em que a conta puder trocar de e-mail, quem souber o antigo nunca
  // opera no cliente da Stripe dela.
  it("a ficha que já virou conta (e a conta trocou de e-mail): 'já tem conta', e nada vai à Stripe", async () => {
    const email = novoEmail();
    await assinar(pedido(email));
    const conta = await prisma.user.create({ data: { id: `conta-${S}-trocou`, email: novoEmail() } });
    await prisma.guestCheckout.update({ where: { email }, data: { userId: conta.id } });
    criarAssinatura.mockClear();
    assinaturasDoCliente.mockClear();
    acertarNumeroFiscal.mockClear();
    const res = await assinar(pedido(email, { documento: OUTRO_CPF }));
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(assinaturasDoCliente).not.toHaveBeenCalled();
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("o código promocional que não vale: 400, e nenhum cliente nasce na Stripe", async () => {
    buscarCodigo.mockResolvedValue(null);
    const email = novoEmail();
    const res = await assinar(pedido(email, { codigo: "NAOEXISTE" }));
    expect([res.status, res.body]).toEqual([400, { error: "CodigoInvalido" }]);
    expect(criarClienteDoVisitante).not.toHaveBeenCalled();
    expect(await ficha(email)).toBeNull();
  });
});

describe("assinar sem login — a ficha e a tentativa", () => {
  it("um e-mail novo: a ficha nasce (e-mail em minúsculas) com UM cliente da Stripe, que leva o CPF; a resposta, o segredo e o código da tentativa", async () => {
    const email = novoEmail().replace("visitante", "Visitante");
    const res = await assinar(pedido(email, { novidades: true, origem: "youtube", campanha: "video-excel" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: "pagar", segredo: expect.stringMatching(/^pi_sub_/), tipo: "pagamento", tentativa: expect.any(String) });
    expect(res.body.tentativa.length).toBeGreaterThanOrEqual(32);

    const f = await ficha(email);
    expect(f?.email).toBe(email.toLowerCase());
    // A FICHA GUARDA SÓ O RESUMO (passo 6b): a tentativa, que abre a conta, não fica no banco.
    expect(f?.tentativa).toBe(sha256(res.body.tentativa));
    expect(f?.tentativa).not.toContain(res.body.tentativa);
    expect(f?.userId).toBeNull();
    expect(criarClienteDoVisitante).toHaveBeenCalledWith({ pedido: f?.id, email: email.toLowerCase(), documento: { tipo: "cpf", numero: "52998224725" } });
    expect(f?.stripeCustomerId).toBe((await criarClienteDoVisitante.mock.results[0]?.value)?.id);
    // A assinatura leva a ficha, a tentativa e a escolha de quem a fez — e nenhum userId.
    const enviado = criarAssinatura.mock.calls[0]?.[0];
    // E a Stripe também só o resumo: o painel e os avisos dela nunca levam a tentativa.
    expect(enviado && "visitante" in enviado ? enviado.visitante : null).toEqual({ pedido: f?.id, resumoDaTentativa: sha256(res.body.tentativa), escolha: { novidades: true, origem: "youtube", campanha: "video-excel" } });
    expect(JSON.stringify(enviado)).not.toContain(res.body.tentativa);
    expect(enviado && "userId" in enviado).toBe(false);
    // Nada da Stripe além do segredo vai ao navegador.
    expect(res.text).not.toContain("cus_");
    expect(res.text).not.toContain("price_");
  });

  it("o corpo não escolhe preço, cliente nem conta: o que vai à Stripe é do servidor", async () => {
    const email = novoEmail();
    await assinar(pedido(email, { plano: "anual", precoId: "price_barato", valor: 1, clienteId: "cus_de_outra_pessoa", userId: "conta-de-outra-pessoa" }));
    const enviado = criarAssinatura.mock.calls[0]?.[0];
    expect(enviado?.precoId).toBe("price_anual");
    expect(enviado?.clienteId).toBe((await ficha(email))?.stripeCustomerId);
    expect(enviado && "userId" in enviado).toBe(false);
  });

  it("o NOVO CLIQUE com o código da tentativa (o cartão foi recusado): segue com a MESMA — nem cliente, nem assinatura novos", async () => {
    const email = novoEmail();
    const primeiro = await assinar(pedido(email));
    const segundo = await assinar(pedido(email, { tentativa: primeiro.body.tentativa }));
    expect(segundo.status).toBe(200);
    expect([segundo.body.segredo, segundo.body.tentativa]).toEqual([primeiro.body.segredo, primeiro.body.tentativa]);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(1);
    expect(criarAssinatura).toHaveBeenCalledTimes(1);
    expect(cancelarIncompleta).not.toHaveBeenCalled();
    // O cliente que já existe recebe o número fiscal desta tentativa (igual: nada muda).
    expect(acertarNumeroFiscal).toHaveBeenCalledWith((await ficha(email))?.stripeCustomerId, { tipo: "cpf", numero: "52998224725" });
  });

  // A3 DA REVISÃO DA ETAPA (28/10/2026): a tentativa PAGA entre a lista e o cancelamento (outra aba, no
  // mesmo instante) — o número do pedido novo NÃO pode ir para a ficha de quem acabou de pagar.
  it("a tentativa foi PAGA no meio (outra aba): 409 'já tem conta', e o CPF do pedido novo NÃO vai para a ficha", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const email = novoEmail();
    expect((await assinar(pedido(email))).status).toBe(200);
    cancelarIncompleta.mockResolvedValueOnce("active");
    const outra = await assinar(pedido(email, { documento: OUTRO_CPF }));
    expect([outra.status, outra.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(criarAssinatura).toHaveBeenCalledTimes(1);
  });

  it("SEM o código da tentativa (outra pessoa que sabe o e-mail): NUNCA recebe o segredo da tentativa em andamento — ela é cancelada e nasce outra", async () => {
    const email = novoEmail();
    const dona = await assinar(pedido(email));
    const outra = await assinar(pedido(email));
    expect(outra.status).toBe(200);
    expect(outra.body.segredo).not.toBe(dona.body.segredo);
    expect(outra.body.tentativa).not.toBe(dona.body.tentativa);
    expect(cancelarIncompleta).toHaveBeenCalledTimes(1);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(1);
    // O código antigo não serve mais para nada: nem para seguir, nem para perguntar.
    expect((await ficha(email))?.tentativa).toBe(sha256(outra.body.tentativa));
    const comOAntigo = await assinar(pedido(email, { tentativa: dona.body.tentativa }));
    expect(comOAntigo.body.segredo).not.toBe(outra.body.segredo);
  });

  it("outro plano, ou o CPF trocado, mesmo com o código: a tentativa anterior é cancelada e nasce outra (a fatura dela leva o plano e o número antigos)", async () => {
    const email = novoEmail();
    const primeiro = await assinar(pedido(email));
    const outroPlano = await assinar(pedido(email, { plano: "anual", tentativa: primeiro.body.tentativa }));
    expect(outroPlano.body.tentativa).not.toBe(primeiro.body.tentativa);

    acertarNumeroFiscal.mockResolvedValue(true);
    const outroCpf = await assinar(pedido(email, { plano: "anual", documento: OUTRO_CPF, tentativa: outroPlano.body.tentativa }));
    expect(outroCpf.body.tentativa).not.toBe(outroPlano.body.tentativa);
    expect(acertarNumeroFiscal).toHaveBeenLastCalledWith((await ficha(email))?.stripeCustomerId, { tipo: "cpf", numero: "11144477735" });
    expect(cancelarIncompleta).toHaveBeenCalledTimes(2);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(1);
  });

  // P2 DA REVISÃO DE SEGURANÇA DO PASSO 6: um clique anterior trocou o número na ficha e falhou antes de
  // cancelar a incompleta — a ficha diz "não mudou" (o dublê de `acertarNumeroFiscal` responde `false`),
  // mas a fatura dela saiu com o número antigo. Quem decide é o número DA FATURA.
  it("a tentativa cuja FATURA saiu com outro número não segue, mesmo com a ficha já igual ao pedido — é cancelada e nasce outra", async () => {
    const email = novoEmail();
    const antiga = await assinar(pedido(email, { documento: OUTRO_CPF }));
    expect(antiga.status).toBe(200);
    const nova = await assinar(pedido(email, { tentativa: antiga.body.tentativa }));
    expect(nova.status).toBe(200);
    expect(nova.body.segredo).not.toBe(antiga.body.segredo);
    expect(nova.body.tentativa).not.toBe(antiga.body.tentativa);
    expect(cancelarIncompleta).toHaveBeenCalledTimes(1);
  });

  it("o número fiscal só muda COM a trava: depois de conferir que ninguém pagou, e antes de a assinatura nascer", async () => {
    const email = novoEmail();
    await assinar(pedido(email));
    assinaturasDoCliente.mockClear();
    acertarNumeroFiscal.mockClear();
    criarAssinatura.mockClear();
    await assinar(pedido(email, { documento: OUTRO_CPF }));
    const [lista, numero, criar] = [assinaturasDoCliente, acertarNumeroFiscal, criarAssinatura].map((f) => f.mock.invocationCallOrder[0] ?? 0);
    expect(lista).toBeGreaterThan(0);
    expect(numero).toBeGreaterThan(lista);
    expect(criar).toBeGreaterThan(numero);
  });

  // A STRIPE CANCELA o pagamento depois de 10 recusas (medido na área restrita, 21/10/2026), e a
  // tentativa continua aberta: entregar o mesmo segredo prenderia a pessoa num pagamento morto.
  it("o pagamento que a Stripe cancelou (10 recusas): o novo clique, mesmo com o código, ganha OUTRA tentativa", async () => {
    const email = novoEmail();
    const primeiro = await assinar(pedido(email));
    naStripe = naStripe.map((a) => ({ ...a, pagamentoCancelado: true }));
    const depois = await assinar(pedido(email, { tentativa: primeiro.body.tentativa }));
    expect(depois.status).toBe(200);
    expect(depois.body.segredo).not.toBe(primeiro.body.segredo);
    expect(depois.body.tentativa).not.toBe(primeiro.body.tentativa);
    expect(cancelarIncompleta).toHaveBeenCalledTimes(1);
  });

  it("o código de 100% para sempre: a assinatura já nasce ativa — 'ativa', com o código da tentativa, e nada a pagar", async () => {
    criarAssinatura.mockImplementation(async (p) => ({ id: `sub_${S}_cem_${n}`, status: "active", precoId: p.precoId, codigoId: p.codigoId, segredoDoPagamento: null, segredoDoCartao: null }));
    const res = await assinar(pedido(novoEmail(), { codigo: "CORTESIA-K7Q2X9" }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: "ativa", tentativa: expect.any(String) });
  });

  it("a Stripe recusou o CPF ou CNPJ que o core aceitou: 400 DocumentoInvalido — e o alerta, porque precisa de gente", async () => {
    criarClienteDoVisitante.mockRejectedValue(new DocumentoRecusado("cnpj"));
    const alerta = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = novoEmail();
    const res = await assinar(pedido(email, { documento: "12.ABC.345/01DE-35" }));
    expect([res.status, res.body]).toEqual([400, { error: "DocumentoInvalido" }]);
    expect(alerta.mock.calls.some(([linha]) => String(linha).includes("recusou o CNPJ"))).toBe(true);
    expect(await ficha(email)).toBeNull();
  });
});

describe("assinar sem login — quem já pagou, e os dois cliques", () => {
  it("o pagamento passou e o aviso atrasou: o novo clique SINCRONIZA — a conta nasce — e responde 'já tem conta', sem assinatura nova", async () => {
    const email = novoEmail();
    await assinar(pedido(email));
    const f = await ficha(email);
    const sub = naStripe[0];
    expect(f && sub).toBeTruthy();
    if (!f || !sub) return;
    // Pagou: na Stripe ela está ativa.
    naStripe = naStripe.map((a) => ({ ...a, status: "active", segredoDoPagamento: null }));
    buscarAssinatura.mockResolvedValue(paga(sub.id, f));

    // Outra pessoa, que sabe o e-mail, manda OUTRO CPF: o número fiscal de quem pagou não muda.
    const res = await assinar(pedido(email, { documento: OUTRO_CPF }));
    expect([res.status, res.body]).toEqual([409, { error: "JaTemConta" }]);
    expect(acertarNumeroFiscal).not.toHaveBeenCalled();
    expect(criarAssinatura).toHaveBeenCalledTimes(1);
    expect(cancelarIncompleta).not.toHaveBeenCalled();
    // A conta NASCEU (e não só "nada aconteceu"): ela existe, e o espelho é dela.
    const conta = await prisma.user.findUnique({ where: { email } });
    expect(conta).not.toBeNull();
    expect((await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } }))?.ownerUserId).toBe(conta?.id);
    expect(buscarAssinatura).toHaveBeenCalledWith(sub.id);
  });

  it("DOIS CLIQUES do mesmo e-mail ao mesmo tempo: o segundo ouve 'ocupada' sem esperar — e o seguinte segue com a MESMA tentativa", async () => {
    const email = novoEmail();
    let dentro!: () => void;
    let soltar!: () => void;
    const entrou = new Promise<void>((ok) => (dentro = ok));
    const segura = new Promise<void>((ok) => (soltar = ok));
    // O primeiro pedido fica PARADO com a trava do e-mail na mão (a Stripe de mentira segura a lista).
    assinaturasDoCliente.mockImplementationOnce(async (clienteId) => {
      dentro();
      await segura;
      return naStripe.filter((a) => a.cliente === clienteId);
    });
    const primeiro = assinar(pedido(email)).then((res) => res);
    await entrou;

    const segundo = await assinar(pedido(email));
    expect([segundo.status, segundo.body]).toEqual([409, { error: "Ocupada" }]);

    soltar();
    const a = await primeiro;
    expect(a.status).toBe(200);
    const depois = await assinar(pedido(email, { tentativa: a.body.tentativa }));
    expect(depois.body.segredo).toBe(a.body.segredo);
    expect(criarAssinatura).toHaveBeenCalledTimes(1);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(1);
  });

  // O TETO é o de todas as assinaturas da cópia: as ligações menos 2 (passo 6 — 10 ligações, 8 assinaturas).
  it("no máximo o teto em andamento, somando todos os endereços: o seguinte ouve 'muitos ao mesmo tempo' na hora (a tela pede para aguardar), sem ir à Stripe nem abrir transação", async () => {
    const TETO = assinaturasAoMesmoTempo();
    expect(TETO).toBe(8);
    let soltar!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    let entraram = 0;
    let todos!: () => void;
    const cheios = new Promise<void>((ok) => (todos = ok));
    // Os do teto ficam PARADOS na primeira ida à Stripe (os preços).
    buscarPrecos.mockImplementation(async () => {
      if (++entraram === TETO) todos();
      await segura;
      return PRECOS;
    });
    const parados = Array.from({ length: TETO }, (_, i) => assinar(pedido(novoEmail()), `198.51.100.${121 + i}`).then((res) => res));
    await cheios;
    const quarto = await assinar(pedido(novoEmail()), "198.51.100.89");
    // Um código próprio, e não o "ocupada" das duas abas: a tela diz "Aguarde um instante e tente novamente."
    expect([quarto.status, quarto.body]).toEqual([409, { error: "MuitosAoMesmoTempo" }]);
    expect(Number(quarto.headers["retry-after"])).toBeGreaterThan(0);
    expect(buscarPrecos).toHaveBeenCalledTimes(TETO);
    soltar();
    expect((await Promise.all(parados)).map((r) => r.status)).toEqual(Array.from({ length: TETO }, () => 200));
    // Terminados, a vaga volta.
    buscarPrecos.mockResolvedValue(PRECOS);
    expect((await assinar(pedido(novoEmail()), "198.51.100.89")).status).toBe(200);
  });

  it("o e-mail ocupado (outro pedido dele assinando): 409 'ocupada' na hora, e NADA vai à Stripe — com a ficha ainda por criar e com a ficha já criada", async () => {
    const email = novoEmail();
    let soltar!: () => void;
    let travou!: () => void;
    const segura = new Promise<void>((ok) => (soltar = ok));
    const travada = new Promise<void>((ok) => (travou = ok));
    const outro = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assinar-email:${email}`}))`;
      travou();
      await segura;
    }, { timeout: 20_000 });
    await travada;
    try {
      const semFicha = await assinar(pedido(email));
      expect([semFicha.status, semFicha.body]).toEqual([409, { error: "Ocupada" }]);
      await prisma.guestCheckout.create({ data: { id: `ficha-${S}-ocupada`, email, stripeCustomerId: `cus_${S}_ocupada`, livemode: false } });
      const comFicha = await assinar(pedido(email));
      expect([comFicha.status, comFicha.body]).toEqual([409, { error: "Ocupada" }]);
      expect(criarClienteDoVisitante).not.toHaveBeenCalled();
      expect(acertarNumeroFiscal).not.toHaveBeenCalled();
      expect(assinaturasDoCliente).not.toHaveBeenCalled();
      expect(criarAssinatura).not.toHaveBeenCalled();
    } finally {
      soltar();
      await outro;
    }
  });
});

describe("o pagamento já valeu? — sem login", () => {
  it("só sim ou não, e só pelo código da tentativa: desconhecido não; sem pagamento não; com a conta nascida e com acesso, sim", async () => {
    expect((await confirmar("codigo-que-ninguem-recebeu")).body).toEqual({ confirmada: false });

    const email = novoEmail();
    const res = await assinar(pedido(email));
    const tentativa: string = res.body.tentativa;
    expect((await confirmar(tentativa)).body).toEqual({ confirmada: false });

    // O aviso da Stripe chega: a conta nasce.
    const f = await ficha(email);
    const sub = naStripe[0];
    if (!f || !sub) throw new Error("a tentativa não nasceu");
    buscarAssinatura.mockResolvedValue(paga(sub.id, f));
    await sincronizarAssinatura(sub.id);

    const sim = await confirmar(tentativa);
    expect([sim.status, sim.body]).toEqual([200, { confirmada: true }]);
    // Nada sobre a conta, o e-mail ou a assinatura.
    expect(sim.text).not.toContain(email);
    expect(sim.text).not.toContain("sub_");
  });

  it("a conta que nasceu e perdeu o acesso (reembolso): não", async () => {
    const email = novoEmail();
    const res = await assinar(pedido(email));
    const f = await ficha(email);
    const sub = naStripe[0];
    if (!f || !sub) throw new Error("a tentativa não nasceu");
    buscarAssinatura.mockResolvedValue(paga(sub.id, f));
    await sincronizarAssinatura(sub.id);
    buscarAssinatura.mockResolvedValue({ ...paga(sub.id, f), status: "canceled", pagoAte: new Date(Date.now() - DIA) });
    await sincronizarAssinatura(sub.id);
    expect((await confirmar(res.body.tentativa)).body).toEqual({ confirmada: false });
  });

  it("sem o código: 400", async () => {
    expect((await request(servidor).post("/api/billing/visitante/confirmacao").send({})).status).toBe(400);
  });
});

describe("os limites sem login", () => {
  it("por E-MAIL, no mesmo endereço: o 6º pedido em 15 minutos é recusado — maiúsculas e espaços contam junto", async () => {
    const email = novoEmail();
    const grafias = [email, email.toUpperCase(), ` ${email} `, email.replace("visitante", "VISITANTE"), `\t${email}`];
    for (let i = 0; i < 5; i++) expect((await assinar(pedido(grafias[i] ?? email), "198.51.100.40")).status, `pedido ${i + 1}`).toBe(200);
    const recusa = await assinar(pedido(email.toUpperCase()), "198.51.100.40");
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(0);
  });

  // DA REVISÃO DE SEGURANÇA DO PASSO (21/10/2026): contado só pelo e-mail, quem soubesse o de alguém
  // o trancaria de qualquer lugar, com pedidos de propósito. Com o endereço junto, trancar exige estar
  // no endereço da pessoa.
  it("pedidos de propósito com o e-mail de outra pessoa, de outro endereço, NÃO trancam esse e-mail para ela", async () => {
    const vitima = novoEmail();
    for (let i = 0; i < 6; i++) await assinar({ email: vitima }, "198.51.100.41");
    expect((await assinar({ email: vitima }, "198.51.100.41")).status).toBe(429);
    expect((await assinar(pedido(vitima), "198.51.100.42")).status).toBe(200);
  });

  it("por ENDEREÇO: e-mails diferentes do mesmo endereço param juntos no 11º pedido; de outro endereço, passa", async () => {
    const endereco = "198.51.100.50";
    for (let i = 0; i < 10; i++) expect((await assinar(pedido(novoEmail()), endereco)).status, `pedido ${i + 1}`).toBe(200);
    expect((await assinar(pedido(novoEmail()), endereco)).status).toBe(429);
    expect((await assinar(pedido(novoEmail()), "198.51.100.51")).status).toBe(200);
  });

  it("os E-MAILS NOVOS do dia (10 por endereço): contam clientes criados, nunca pedidos — quem erra o CPF ou volta com o mesmo e-mail não gasta nada; cheio, a recusa é a mesma para todos", async () => {
    expect(LIMITES_DO_VISITANTE.emailsNovosPorDia).toBe(10);
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const endereco = "198.51.100.60";
    const primeiro = novoEmail();
    // O CPF errado, várias vezes: recusado antes, não conta.
    for (let i = 0; i < 3; i++) expect((await assinar(pedido(primeiro, { documento: "529.982.247-24" }), endereco)).status).toBe(400);
    // Dez e-mails novos, em rodadas que respeitam a janela de 15 minutos do endereço.
    const emails = [primeiro, ...Array.from({ length: 9 }, novoEmail)];
    for (let i = 0; i < emails.length; i++) {
      if (i > 0 && i % 5 === 0) vi.setSystemTime(Date.now() + 16 * 60_000);
      expect((await assinar(pedido(emails[i]), endereco)).status, `e-mail ${i + 1}`).toBe(200);
    }
    vi.setSystemTime(Date.now() + 16 * 60_000);
    const decimoPrimeiro = novoEmail();
    const recusa = await assinar(pedido(decimoPrimeiro), endereco);
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(15 * 60);
    expect(await ficha(decimoPrimeiro)).toBeNull();
    // Um e-mail que JÁ tem ficha, do mesmo endereço: a MESMA recusa — recusar só o novo diria a quem
    // sonda que aquele e-mail começou uma assinatura (achado da revisão de segurança do passo).
    const comFicha = await assinar(pedido(emails[0] ?? ""), endereco);
    expect([comFicha.status, comFicha.body]).toEqual([429, { error: "MuitasTentativas" }]);
    expect(criarClienteDoVisitante).toHaveBeenCalledTimes(10);
    // De outro endereço, o mesmo e-mail com ficha segue: quem parou foi o dia do endereço.
    expect((await assinar(pedido(emails[0] ?? ""), "198.51.100.61")).status).toBe(200);
  });

  it("o assinar que traz código conta no MESMO teto do dia da prévia (40 conferências por endereço, não 80)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const endereco = "198.51.100.75";
    const previa = () => request(servidor).post("/api/billing/visitante/previa").set("x-forwarded-for", endereco).send({ plano: "mensal", codigo: "ADIVINHA" });
    for (let i = 0; i < 20; i++) expect((await previa()).status, `prévia ${i + 1}`).toBe(200);
    vi.setSystemTime(Date.now() + 16 * 60_000);
    for (let i = 0; i < 15; i++) expect((await previa()).status, `prévia ${21 + i}`).toBe(200);
    const comCodigo = Array.from({ length: 6 }, novoEmail);
    for (let i = 0; i < 5; i++) expect((await assinar(pedido(comCodigo[i] ?? "", { codigo: "ADIVINHA" }), endereco)).status, `assinar com código ${i + 1}`).toBe(200);
    // 35 prévias + 5 assinar com código = 40: o dia acabou para conferir código — nas duas rotas.
    vi.setSystemTime(Date.now() + 16 * 60_000);
    expect((await assinar(pedido(comCodigo[5] ?? "", { codigo: "ADIVINHA" }), endereco)).status).toBe(429);
    expect((await previa()).status).toBe(429);
    // Sem código, assinar não confere código nenhum: segue.
    expect((await assinar(pedido(comCodigo[0] ?? ""), endereco)).status).toBe(200);
  });

  it("a PRÉVIA do código: 20 a cada 15 minutos e 40 POR DIA por endereço (decisão do operador, 21/10/2026)", async () => {
    expect(LIMITES_DO_VISITANTE.previa.endereco).toEqual({ porJanela: 20, porDia: 40 });
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    const previa = () => request(servidor).post("/api/billing/visitante/previa").set("x-forwarded-for", "198.51.100.70").send({ plano: "mensal", codigo: "ADIVINHA" });
    for (let rodada = 0; rodada < 2; rodada++) {
      for (let i = 0; i < 20; i++) expect((await previa()).status, `rodada ${rodada}, ${i + 1}`).toBe(200);
      expect((await previa()).status, `rodada ${rodada}, a 21ª`).toBe(429);
      vi.setSystemTime(Date.now() + 16 * 60_000);
    }
    // A janela recomeçou, mas o dia já tem 40: recusada, até o dia virar.
    const recusa = await previa();
    expect(recusa.status).toBe(429);
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(15 * 60);
  });
});
