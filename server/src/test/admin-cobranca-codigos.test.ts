import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import Stripe from "stripe";

// OS CÓDIGOS PROMOCIONAIS PELO PAINEL (etapa 4.7b, bloco 6, passo 6d — decisão do operador, P142). Só a Stripe vira dublê
// (os cupons e os códigos, em memória, com a chave de repetição); a rota, a trava e o registro rodam de verdade. O que
// protege: só admin; a CORTESIA nasce 100%, para sempre, com o código sorteado e o limite de usos; o DESCONTO nasce com a
// validade no fim do dia de Brasília e sem limite de usos; os tipos que esperam a P125 não passam; o pedido repetido devolve
// o código que já criou (sem criar outro nem registrar em dobro); dois pedidos ao mesmo tempo não criam dois; reativar só o
// pausado; cada ação fica no registro, com quem fez.
type CupomFalso = { id: string; object: "coupon"; percent_off: number | null; duration: string; duration_in_months: number | null; valid: boolean; name: string | null; metadata: Record<string, string> };
type CodigoFalso = { id: string; object: "promotion_code"; code: string; active: boolean; max_redemptions: number | null; times_redeemed: number; expires_at: number | null; created: number; metadata: Record<string, string>; promotion: { type: "coupon"; coupon: CupomFalso } };
const S = `${Date.now()}`;
let n = 0;
const cupons: CupomFalso[] = [];
const codigos: CodigoFalso[] = [];
const repetidas = new Map<string, unknown>();
/** A lista da biblioteca: dá para esperar (`.data`) e para percorrer (`for await`). */
function lista<T>(itens: T[]) {
  return Object.assign(Promise.resolve({ data: itens, has_more: false }), {
    async *[Symbol.asyncIterator]() {
      yield* itens;
    },
  });
}
const naoAchou = () => new Stripe.errors.StripeInvalidRequestError({ message: "mensagem crua da Stripe, com sk_test_abc", type: "invalid_request_error", code: "resource_missing", statusCode: 404 });
const falsa = {
  coupons: {
    create: vi.fn(async (params: { percent_off: number; duration: string; name: string; metadata: Record<string, string> }, opcoes?: { idempotencyKey?: string }) => {
      const chave = opcoes?.idempotencyKey ? `cupom:${opcoes.idempotencyKey}` : null;
      if (chave && repetidas.has(chave)) return repetidas.get(chave);
      const cupom: CupomFalso = { id: `cupom_${S}_${++n}`, object: "coupon", percent_off: params.percent_off, duration: params.duration, duration_in_months: null, valid: true, name: params.name, metadata: params.metadata };
      cupons.push(cupom);
      if (chave) repetidas.set(chave, cupom);
      return cupom;
    }),
  },
  promotionCodes: {
    list: vi.fn((params: { code?: string; active?: boolean; created?: { gte: number } }) =>
      lista(
        codigos
          .filter((c) => (params.code === undefined || c.code.toUpperCase() === params.code.toUpperCase()) && (params.active === undefined || c.active === params.active) && (params.created === undefined || c.created >= params.created.gte))
          .sort((a, b) => b.created - a.created),
      ),
    ),
    create: vi.fn(async (params: { promotion: { coupon: string }; code: string; max_redemptions?: number; expires_at?: number; metadata: Record<string, string> }, opcoes?: { idempotencyKey?: string }) => {
      const chave = opcoes?.idempotencyKey ? `codigo:${opcoes.idempotencyKey}` : null;
      if (chave && repetidas.has(chave)) return repetidas.get(chave);
      const cupom = cupons.find((c) => c.id === params.promotion.coupon);
      if (!cupom) throw naoAchou();
      const codigo: CodigoFalso = { id: `promo_${S}x${++n}`, object: "promotion_code", code: params.code, active: true, max_redemptions: params.max_redemptions ?? null, times_redeemed: 0, expires_at: params.expires_at ?? null, created: Math.floor(Date.now() / 1000), metadata: params.metadata, promotion: { type: "coupon", coupon: cupom } };
      codigos.push(codigo);
      if (chave) repetidas.set(chave, codigo);
      return codigo;
    }),
    retrieve: vi.fn(async (id: string) => {
      const codigo = codigos.find((c) => c.id === id);
      if (!codigo) throw naoAchou();
      return codigo;
    }),
    update: vi.fn(async (id: string, params: { active: boolean }) => {
      const codigo = codigos.find((c) => c.id === id);
      if (!codigo) throw naoAchou();
      codigo.active = params.active;
      return codigo;
    }),
  },
};
vi.mock("../lib/stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { fimDoDia } from "../lib/codigos-do-painel.js";
import { codigoDeCortesia, paraCodigoDaLista } from "../lib/stripe-codigos.js";

const ANTES = process.env.STRIPE_SECRET_KEY;
let admin: string[] = [];
let member: string[] = [];
let adminId = "";
const DIA = 24 * 60 * 60 * 1000;
const amanha = () => new Date(Date.now() + 3 * DIA).toISOString().slice(0, 10);
const pedido = () => `${S.slice(-8)}${String(++n).padStart(24, "0")}`.slice(0, 32).replace(/[^0-9a-f]/g, "a");
const criar = (corpo: Record<string, unknown>, cookies: string[] = admin) => request(servidor).post("/api/admin/cobranca/codigos").set("Cookie", cookies).send(corpo);
const mudar = (corpo: Record<string, unknown>, cookies: string[] = admin) => request(servidor).post("/api/admin/cobranca/codigos/ativo").set("Cookie", cookies).send(corpo);
const linhasDoRegistro = (acao: string, texto: string) => prisma.billingLog.findMany({ where: { action: acao, detail: { startsWith: `${texto} · ` } } });

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  adminId = (await prisma.user.findUniqueOrThrow({ where: { email: (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase() }, select: { id: true } })).id;
});
beforeEach(() => {
  for (const funcao of [falsa.coupons.create, falsa.promotionCodes.list, falsa.promotionCodes.create, falsa.promotionCodes.retrieve, falsa.promotionCodes.update]) funcao.mockClear();
});
afterAll(async () => {
  await prisma.billingLog.deleteMany({ where: { action: { in: ["criar-codigo", "pausar-codigo", "reativar-codigo"] }, OR: codigos.map((c) => ({ detail: { startsWith: c.code } })) } });
  if (ANTES === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ANTES;
});

describe("os códigos promocionais pelo painel (passo 6d)", () => {
  it("só admin: sem login 401, aluno 403 — e nada vai à Stripe; sem a Stripe configurada, 503", async () => {
    for (const cookies of [[], member]) {
      expect((await request(servidor).get("/api/admin/cobranca/codigos").set("Cookie", cookies)).status).toBe(cookies.length ? 403 : 401);
      expect((await criar({ tipo: "cortesia", pedido: pedido(), usos: 1 }, cookies)).status).toBe(cookies.length ? 403 : 401);
      expect((await mudar({ id: "promo_qualquer", ativo: false }, cookies)).status).toBe(cookies.length ? 403 : 401);
    }
    expect(falsa.promotionCodes.list).not.toHaveBeenCalled();
    expect(falsa.coupons.create).not.toHaveBeenCalled();
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const res = await criar({ tipo: "cortesia", pedido: pedido(), usos: 1 });
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "NaoConfigurado" });
    } finally {
      process.env.STRIPE_SECRET_KEY = "sk_test_da_suite_local";
    }
    expect(falsa.coupons.create).not.toHaveBeenCalled();
  });

  it("a CORTESIA nasce 100%, para sempre, com o código sorteado e o limite de usos — e fica no registro, com quem fez", async () => {
    const meu = pedido();
    const res = await criar({ tipo: "cortesia", pedido: meu, usos: 3 });
    expect(res.status).toBe(200);
    expect(res.body.codigo).toMatch(/^PRESENTE-[A-HJ-NP-Z2-9]{6}$/);
    const criado = codigos.find((c) => c.code === res.body.codigo);
    expect(criado).toMatchObject({ max_redemptions: 3, expires_at: null, metadata: { criado_por: adminId, pedido: meu } });
    expect(criado?.promotion.coupon).toMatchObject({ percent_off: 100, duration: "forever", name: res.body.codigo });
    expect(res.body.detalhe).toBe(`${res.body.codigo} · 100% em todas as cobranças · até 3 usos`);
    const registro = await linhasDoRegistro("criar-codigo", res.body.codigo);
    expect(registro).toHaveLength(1);
    expect(registro[0]).toMatchObject({ who: "OPERADOR", actorUserId: adminId, userId: null, detail: res.body.detalhe });
  });

  it("o PEDIDO REPETIDO (a resposta que se perdeu) devolve o mesmo código: nada é criado de novo, nada é registrado em dobro", async () => {
    const meu = pedido();
    const primeira = await criar({ tipo: "cortesia", pedido: meu, usos: 1 });
    expect(primeira.status).toBe(200);
    falsa.coupons.create.mockClear();
    falsa.promotionCodes.create.mockClear();
    const segunda = await criar({ tipo: "cortesia", pedido: meu, usos: 1 });
    expect(segunda.status).toBe(200);
    expect(segunda.body.codigo).toBe(primeira.body.codigo);
    expect(falsa.coupons.create).not.toHaveBeenCalled();
    expect(falsa.promotionCodes.create).not.toHaveBeenCalled();
    expect(await linhasDoRegistro("criar-codigo", primeira.body.codigo)).toHaveLength(1);
    // Outro pedido com o mesmo conteúdo é OUTRO código: duas cortesias de 1 uso para duas pessoas.
    const outro = await criar({ tipo: "cortesia", pedido: pedido(), usos: 1 });
    expect(outro.status).toBe(200);
    expect(outro.body.codigo).not.toBe(primeira.body.codigo);
  });

  it("o pedido repetido cujo primeiro caiu antes de registrar: registra agora, uma vez", async () => {
    // O código já está na Stripe (o primeiro pedido chegou lá), e o registro não tem a linha dele.
    const meu = pedido();
    const cupom: CupomFalso = { id: `cupom_${S}_${++n}`, object: "coupon", percent_off: 100, duration: "forever", duration_in_months: null, valid: true, name: "PRESENTE-QUEDA2", metadata: {} };
    cupons.push(cupom);
    codigos.push({ id: `promo_${S}x${++n}`, object: "promotion_code", code: "PRESENTE-QUEDA2", active: true, max_redemptions: 2, times_redeemed: 0, expires_at: null, created: Math.floor(Date.now() / 1000), metadata: { criado_por: adminId, pedido: meu }, promotion: { type: "coupon", coupon: cupom } });
    expect((await criar({ tipo: "cortesia", pedido: meu, usos: 2 })).body.codigo).toBe("PRESENTE-QUEDA2");
    expect((await criar({ tipo: "cortesia", pedido: meu, usos: 2 })).body.codigo).toBe("PRESENTE-QUEDA2");
    expect(await linhasDoRegistro("criar-codigo", "PRESENTE-QUEDA2")).toHaveLength(1);
    expect(falsa.coupons.create).not.toHaveBeenCalled();
  });

  it("o DESCONTO nasce com o texto em maiúsculas, a validade no fim do dia de Brasília e SEM limite de usos", async () => {
    const dia = amanha();
    const res = await criar({ tipo: "desconto", pedido: pedido(), codigo: ` black-${S.slice(-6)} `, percentual: 30, duracao: "uma-vez", validoAte: dia });
    expect(res.status).toBe(200);
    const texto = `BLACK-${S.slice(-6)}`;
    expect(res.body.codigo).toBe(texto);
    const criado = codigos.find((c) => c.code === texto);
    expect(criado?.max_redemptions).toBeNull();
    expect(criado?.expires_at).toBe(Math.floor(new Date(`${dia}T23:59:59-03:00`).getTime() / 1000));
    expect(criado?.promotion.coupon).toMatchObject({ percent_off: 30, duration: "once" });
    const [ano, mes, d] = dia.split("-");
    expect(res.body.detalhe).toBe(`${texto} · 30% só na primeira cobrança · vale até ${d}/${mes}/${ano}`);
    // "Para sempre" vira forever.
    const sempre = await criar({ tipo: "desconto", pedido: pedido(), codigo: `SEMPRE${S.slice(-6)}`, percentual: 10, duracao: "para-sempre", validoAte: dia });
    expect(codigos.find((c) => c.code === sempre.body.codigo)?.promotion.coupon.duration).toBe("forever");
  });

  it("o desconto com um texto que já está ativo: 409, nada criado", async () => {
    const texto = `REPETE${S.slice(-6)}`;
    expect((await criar({ tipo: "desconto", pedido: pedido(), codigo: texto, percentual: 20, duracao: "uma-vez", validoAte: amanha() })).status).toBe(200);
    falsa.coupons.create.mockClear();
    const res = await criar({ tipo: "desconto", pedido: pedido(), codigo: texto.toLowerCase(), percentual: 25, duracao: "uma-vez", validoAte: amanha() });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "CodigoJaExiste" });
    expect(falsa.coupons.create).not.toHaveBeenCalled();
  });

  it("as regras que o formulário não deixa passar: 100% só na cortesia, cortesia com limite, desconto com validade, nada de 'por N meses', data que não existe ou que passou", async () => {
    const recusados: [Record<string, unknown>, number, string][] = [
      [{ tipo: "desconto", pedido: pedido(), codigo: "CEMPORCENTO", percentual: 100, duracao: "para-sempre", validoAte: amanha() }, 400, "ValidationError"],
      [{ tipo: "desconto", pedido: pedido(), codigo: "SEMDATA1", percentual: 20, duracao: "uma-vez" }, 400, "ValidationError"],
      [{ tipo: "desconto", pedido: pedido(), codigo: "MESES123", percentual: 20, duracao: "por-meses", validoAte: amanha() }, 400, "ValidationError"],
      [{ tipo: "desconto", pedido: pedido(), codigo: "COM ESPACO", percentual: 20, duracao: "uma-vez", validoAte: amanha() }, 400, "ValidationError"],
      [{ tipo: "cortesia", pedido: pedido() }, 400, "ValidationError"],
      [{ tipo: "cortesia", pedido: pedido(), usos: 21 }, 400, "ValidationError"],
      [{ tipo: "cortesia", pedido: pedido(), usos: 1, percentual: 50 }, 400, "ValidationError"],
      [{ tipo: "cortesia", pedido: pedido(), usos: 1, duracao: "uma-vez" }, 400, "ValidationError"],
      [{ tipo: "cortesia", pedido: "curto", usos: 1 }, 400, "ValidationError"],
      [{ tipo: "cortesia", pedido: pedido(), usos: 1, validoAte: "2026-02-31" }, 400, "DataInvalida"],
      [{ tipo: "desconto", pedido: pedido(), codigo: "ONTEM123", percentual: 20, duracao: "uma-vez", validoAte: new Date(Date.now() - DIA - 4 * 3600_000).toISOString().slice(0, 10) }, 400, "DataInvalida"],
    ];
    for (const [corpo, status, erro] of recusados) {
      const res = await criar(corpo);
      expect([res.status, res.body.error], JSON.stringify(corpo)).toEqual([status, erro]);
    }
    expect(falsa.coupons.create).not.toHaveBeenCalled();
    expect(falsa.promotionCodes.create).not.toHaveBeenCalled();
  });

  it("dois pedidos ao mesmo tempo: com a trava dos códigos ocupada, 409 Ocupada — e nada vai à Stripe", async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('codigos-promocionais'))`;
      const res = await criar({ tipo: "cortesia", pedido: pedido(), usos: 1 });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "Ocupada" });
    });
    expect(falsa.promotionCodes.list).not.toHaveBeenCalled();
    expect(falsa.coupons.create).not.toHaveBeenCalled();
  });

  it("pausar e reativar: o código muda na Stripe e fica no registro; o que já está assim é 409; o esgotado e o vencido não voltam", async () => {
    const res = await criar({ tipo: "cortesia", pedido: pedido(), usos: 2 });
    const codigo = codigos.find((c) => c.code === res.body.codigo);
    if (!codigo) throw new Error("o código não nasceu");
    const pausou = await mudar({ id: codigo.id, ativo: false });
    expect(pausou.status).toBe(200);
    expect(pausou.body).toEqual({ detalhe: `${codigo.code} pausado` });
    expect(codigo.active).toBe(false);
    expect(await prisma.billingLog.count({ where: { action: "pausar-codigo", detail: `${codigo.code} pausado`, actorUserId: adminId } })).toBe(1);
    expect((await mudar({ id: codigo.id, ativo: false })).body).toEqual({ error: "NadaAFazer" });
    const voltou = await mudar({ id: codigo.id, ativo: true });
    expect(voltou.status).toBe(200);
    expect(codigo.active).toBe(true);
    expect(await prisma.billingLog.count({ where: { action: "reativar-codigo", detail: `${codigo.code} reativado` } })).toBe(1);
    // Esgotado (a Stripe o desliga sozinha) e vencido: não voltam.
    codigo.times_redeemed = 2;
    codigo.active = false;
    falsa.promotionCodes.update.mockClear();
    const esgotado = await mudar({ id: codigo.id, ativo: true });
    expect([esgotado.status, esgotado.body.error]).toEqual([409, "NaoReativa"]);
    codigo.times_redeemed = 0;
    codigo.expires_at = Math.floor((Date.now() - DIA) / 1000);
    const vencido = await mudar({ id: codigo.id, ativo: true });
    expect([vencido.status, vencido.body.error]).toEqual([409, "NaoReativa"]);
    expect(falsa.promotionCodes.update).not.toHaveBeenCalled();
    // O que a Stripe não conhece: 404, sem a mensagem crua.
    const sumiu = await mudar({ id: "promo_naoexiste", ativo: false });
    expect([sumiu.status, sumiu.body]).toEqual([404, { error: "NaoEncontrada" }]);
    expect((await mudar({ id: "cupom_nao_e_codigo", ativo: false })).status).toBe(400);
  });

  // Revisão de segurança do bloco 6 (31/10/2026): o de 100% que não é cortesia (os tipos que esperam a P125), criado na
  // Stripe e pausado, não volta pelo painel.
  it("reativar o de 100% que não é cortesia (só a primeira, por meses, ou sem limite de usos): 409, e ele continua pausado", async () => {
    const naStripe = (duracao: string, maximo: number | null, percentual = 100) => {
      const cupom: CupomFalso = { id: `cupom_${S}_${++n}`, object: "coupon", percent_off: percentual, duration: duracao, duration_in_months: duracao === "repeating" ? 3 : null, valid: true, name: null, metadata: {} };
      cupons.push(cupom);
      const codigo: CodigoFalso = { id: `promo_${S}x${++n}`, object: "promotion_code", code: `FORA${S.slice(-6)}N${n}`, active: false, max_redemptions: maximo, times_redeemed: 0, expires_at: null, created: Math.floor(Date.now() / 1000), metadata: {}, promotion: { type: "coupon", coupon: cupom } };
      codigos.push(codigo);
      return codigo;
    };
    for (const codigo of [naStripe("once", 5), naStripe("repeating", 5), naStripe("forever", null)]) {
      const res = await mudar({ id: codigo.id, ativo: true });
      expect([res.status, res.body]).toEqual([409, { error: "ForaDasRegras" }]);
      expect(codigo.active).toBe(false);
    }
    expect(falsa.promotionCodes.update).not.toHaveBeenCalled();
    // A regra é só do 100%: o desconto parcial pausado volta, mesmo criado fora do painel; e a cortesia também.
    for (const codigo of [naStripe("once", null, 30), naStripe("forever", 5)]) {
      expect((await mudar({ id: codigo.id, ativo: true })).status).toBe(200);
      expect(codigo.active).toBe(true);
    }
  });

  it("a lista: do mais novo ao mais antigo, com quantos usaram, o desconto, a validade e a situação", async () => {
    const res = await request(servidor).get("/api/admin/cobranca/codigos").set("Cookie", admin);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    const ids = (res.body as { id: string }[]).map((c) => c.id);
    expect(ids).toEqual(codigos.slice().sort((a, b) => b.created - a.created).map((c) => c.id));
    const umaCortesia = (res.body as { codigo: string; percentual: number; duracao: string; usados: number; maximo: number | null; situacao: string }[]).find((c) => c.codigo.startsWith("PRESENTE-") && c.codigo !== "PRESENTE-QUEDA2");
    expect(umaCortesia).toMatchObject({ percentual: 100, duracao: "para-sempre", usados: 0 });
  });
});

describe("as peças sem rede (passo 6d)", () => {
  const base = (mudanca: Partial<CodigoFalso>): CodigoFalso => ({ id: "promo_x", object: "promotion_code", code: "X", active: true, max_redemptions: null, times_redeemed: 0, expires_at: null, created: 1_790_000_000, metadata: {}, promotion: { type: "coupon", coupon: { id: "c", object: "coupon", percent_off: 50, duration: "once", duration_in_months: null, valid: true, name: "X", metadata: {} } }, ...mudanca });
  const agora = new Date("2026-10-31T12:00:00Z");
  // Seguro: o dublê tem os campos que `paraCodigoDaLista` lê; o resto do tipo da Stripe ela não toca.
  const situacao = (mudanca: Partial<CodigoFalso>) => paraCodigoDaLista(base(mudanca) as unknown as Stripe.PromotionCode, agora).situacao;

  it("a situação: esgotado antes de vencido, vencido antes de pausado; o cupom que não vale mais é vencido", () => {
    expect(situacao({})).toBe("ativo");
    expect(situacao({ active: false })).toBe("pausado");
    expect(situacao({ max_redemptions: 2, times_redeemed: 2, active: false, expires_at: Math.floor(agora.getTime() / 1000) - 10 })).toBe("esgotado");
    expect(situacao({ expires_at: Math.floor(agora.getTime() / 1000) - 10, active: false })).toBe("vencido");
    expect(situacao({ max_redemptions: 2, times_redeemed: 1 })).toBe("ativo");
    expect(situacao({ promotion: { type: "coupon", coupon: { ...base({}).promotion.coupon, valid: false } } })).toBe("vencido");
  });

  it("o fim do dia é 23:59:59 em Brasília; o dia que não existe ou já passou não vale", () => {
    expect(fimDoDia("2026-11-05", agora)?.toISOString()).toBe("2026-11-06T02:59:59.000Z");
    expect(fimDoDia("2026-10-31", agora)?.toISOString()).toBe("2026-11-01T02:59:59.000Z");
    expect(fimDoDia("2026-10-30", agora)).toBeNull();
    expect(fimDoDia("2026-02-31", new Date("2026-01-01T00:00:00Z"))).toBeNull();
    expect(fimDoDia("2026-13-01", agora)).toBeNull();
  });

  it("o código de cortesia: PRESENTE- e 6 letras sem 0, O, 1 e I — cada um diferente", () => {
    const sorteados = new Set(Array.from({ length: 200 }, () => codigoDeCortesia()));
    for (const codigo of sorteados) expect(codigo).toMatch(/^PRESENTE-[A-HJ-NP-Z2-9]{6}$/);
    expect(sorteados.size).toBeGreaterThan(195);
  });
});
