import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";

// A CONFERÊNCIA DA COBRANÇA NA SUBIDA (E4 da revisão ampla da cobrança, 29/10/2026). O que protege: as chaves de
// modos diferentes e o endereço de avisos desligado, ausente ou sem um aviso que o site trata viram ALERTA — antes,
// eram silêncio até um aluno reclamar —, e o registro nunca leva a chave nem a mensagem crua da Stripe. Só a rede
// é dublê (a lista dos endereços); as funções rodam de verdade.
const falsa = { webhookEndpoints: { list: vi.fn() } };
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { conferirCobrancaNaSubida, modoDaChave, problemaDasChaves, problemaDoEndereco, versaoServeAoSite, type EnderecoDeAvisos } from "./conferencia-da-cobranca.js";
import { AVISOS_DO_ENDERECO, VERSAO_DA_API } from "./stripe.js";

const URL_DOS_AVISOS = "https://www.escola.teste/api/stripe/webhook";
const endereco = (dados: Partial<EnderecoDeAvisos> = {}): EnderecoDeAvisos => ({ id: "we_1", url: URL_DOS_AVISOS, status: "enabled", enabled_events: [...AVISOS_DO_ENDERECO], api_version: VERSAO_DA_API, ...dados });
const AMBIENTE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "BETTER_AUTH_URL"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));
// As chaves de mentira, com a forma das de verdade — e o teste confere que nenhuma vai ao registro.
const SK = "sk_live_da_suite_SEGREDO";
const PK = "pk_live_da_suite_publica";

beforeEach(() => {
  falsa.webhookEndpoints.list.mockReset().mockResolvedValue({ data: [endereco()] });
  process.env.STRIPE_SECRET_KEY = SK;
  process.env.STRIPE_PUBLISHABLE_KEY = PK;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_da_suite";
  process.env.BETTER_AUTH_URL = "https://www.escola.teste";
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
});

describe("as chaves da Stripe", () => {
  it("o modo vem do prefixo (live_ ou test_), só para o tipo pedido; o resto não é chave", () => {
    expect(modoDaChave("pk_live_x", ["pk"])).toBe("live");
    expect(modoDaChave("sk_test_x", ["sk", "rk"])).toBe("test");
    expect(modoDaChave("rk_live_x", ["sk", "rk"])).toBe("live");
    expect(modoDaChave("sk_live_x", ["pk"])).toBeNull();
    expect(modoDaChave("whsec_x", ["sk", "rk"])).toBeNull();
    expect(modoDaChave("sk_x", ["sk"])).toBeNull();
    expect(modoDaChave(undefined, ["pk"])).toBeNull();
  });

  it("do mesmo modo (inclusive a restrita): nada a dizer; de modos diferentes, ou uma ausente: o problema — sem a chave no texto", () => {
    expect(problemaDasChaves("pk_live_a", "sk_live_b")).toBeNull();
    expect(problemaDasChaves("pk_test_a", "sk_test_b")).toBeNull();
    expect(problemaDasChaves("pk_live_a", "rk_live_b")).toBeNull();
    const trocadas = problemaDasChaves("pk_live_a", "sk_test_SEGREDO");
    expect(trocadas).toContain("modos diferentes");
    expect(trocadas).toContain("a publicável é live, a secreta é test");
    expect(trocadas).not.toContain("SEGREDO");
    expect(problemaDasChaves(undefined, "sk_live_b")).toContain("ausente ou malformada");
    // A secreta colada no lugar da publicável: o campo de pagamento não abre (`chavePublicavel` a recusa).
    expect(problemaDasChaves("sk_live_colada_no_lugar_errado", "sk_live_b")).toContain("a publicável: ausente ou malformada");
    expect(problemaDasChaves("pk_live_a", "pk_live_colada_no_lugar_errado")).toContain("a secreta: ausente ou malformada");
  });
});

describe("o endereço de avisos", () => {
  it("ligado e com todos os avisos que o site trata (ou com 'todos os eventos'): nada a dizer — também com a barra no fim e o domínio em maiúsculas", () => {
    expect(problemaDoEndereco([endereco()], URL_DOS_AVISOS)).toBeNull();
    expect(problemaDoEndereco([endereco({ enabled_events: ["*"] })], URL_DOS_AVISOS)).toBeNull();
    expect(problemaDoEndereco([endereco({ url: "https://WWW.escola.teste/api/stripe/webhook/" })], URL_DOS_AVISOS)).toBeNull();
  });

  it("nenhum endereço para o site (os outros não contam), ou desligado: o problema", () => {
    expect(problemaDoEndereco([], URL_DOS_AVISOS)).toContain("nenhum endereço de avisos");
    expect(problemaDoEndereco([endereco({ url: "https://outro.site/api/stripe/webhook" })], URL_DOS_AVISOS)).toContain("nenhum endereço de avisos");
    expect(problemaDoEndereco([endereco({ status: "disabled" })], URL_DOS_AVISOS)).toContain("está desligado");
  });

  // C3 da revisão do grupo 1 (29/10/2026): o aviso chega na versão da API do endereço, e o site lê a da biblioteca —
  // serve a mesma linha numa versão igual ou mais nova (as mensais de uma linha não quebram nada).
  // R1 da revisão das correções (29/10/2026): qualquer versão da mesma linha — inclusive a mais velha que a da
  // biblioteca, que é o endereço de hoje depois de uma atualização pequena da `stripe`.
  it("a versão do endereço: qualquer uma da linha da biblioteca serve (mais nova ou mais velha); de outra linha, sem linha ou a padrão da conta, não", () => {
    const SITE = "2026-09-30.endive";
    expect(versaoServeAoSite(SITE, SITE)).toBe(true);
    expect(versaoServeAoSite("2026-10-28.endive", SITE)).toBe(true);
    expect(versaoServeAoSite("2026-09-30.endive", "2026-10-28.endive")).toBe(true);
    expect(versaoServeAoSite("2026-03-31.dahlia", SITE)).toBe(false);
    expect(versaoServeAoSite("2027-03-31.fig", SITE)).toBe(false);
    expect(versaoServeAoSite("2024-06-20", SITE)).toBe(false);
    expect(versaoServeAoSite(null, SITE)).toBe(false);
    expect(versaoServeAoSite("endive", SITE)).toBe(false);
    // A da própria biblioteca tem a forma que a regra lê (senão, depois de uma atualização, todo endereço daria alarme).
    expect(versaoServeAoSite(VERSAO_DA_API)).toBe(true);
  });

  it("o endereço numa versão que o site não lê: o problema, com a versão (ou a padrão da conta); na do site ou numa mensal mais nova, nada", () => {
    expect(problemaDoEndereco([endereco()], URL_DOS_AVISOS)).toBeNull();
    expect(problemaDoEndereco([endereco({ api_version: "2026-10-28.endive" })], URL_DOS_AVISOS, "2026-09-30.endive")).toBeNull();
    const antiga = problemaDoEndereco([endereco({ api_version: "2024-06-20" })], URL_DOS_AVISOS);
    expect(antiga).toContain("we_1 (versão 2024-06-20)");
    expect(antiga).toContain(`numa versão da API que o site lê (a linha ${VERSAO_DA_API.split(".")[1]}, como a ${VERSAO_DA_API})`);
    expect(problemaDoEndereco([endereco({ api_version: null })], URL_DOS_AVISOS)).toContain("versão padrão da conta");
    expect(problemaDoEndereco([endereco({ enabled_events: ["*"], api_version: "2024-06-20" })], URL_DOS_AVISOS)).toContain("numa versão da API que o site lê");
    // Na troca de um endereço pelo outro, o velho ainda entrega: ainda é problema, e só ele aparece; desligado, não conta.
    const naTroca = problemaDoEndereco([endereco({ id: "we_velho", api_version: "2025-09-30.clover" }), endereco({ id: "we_novo" })], URL_DOS_AVISOS);
    expect(naTroca).toContain("we_velho (versão 2025-09-30.clover)");
    expect(naTroca).not.toContain("we_novo");
    expect(problemaDoEndereco([endereco({ id: "we_velho", status: "disabled", api_version: "2025-09-30.clover" }), endereco({ id: "we_novo" })], URL_DOS_AVISOS)).toBeNull();
  });

  it("faltando avisos (o caso da P112): diz quais — e vale o que os ligados assinam JUNTOS; o desligado não conta", () => {
    const semOPix = AVISOS_DO_ENDERECO.filter((tipo) => tipo !== "payment_intent.succeeded");
    const problema = problemaDoEndereco([endereco({ enabled_events: semOPix })], URL_DOS_AVISOS);
    expect(problema).toContain("não assina payment_intent.succeeded");
    expect(problema).not.toContain("invoice.paid");
    expect(problemaDoEndereco([endereco({ enabled_events: semOPix }), endereco({ id: "we_2", enabled_events: ["payment_intent.succeeded"] })], URL_DOS_AVISOS)).toBeNull();
    expect(problemaDoEndereco([endereco({ enabled_events: semOPix }), endereco({ id: "we_2", status: "disabled", enabled_events: ["payment_intent.succeeded"] })], URL_DOS_AVISOS)).toContain("não assina payment_intent.succeeded");
  });
});

describe("a conferência da subida", () => {
  /** As linhas de erro da conferência, como sairiam no registro. */
  const alertas = (erro: { mock: { calls: unknown[][] } }) => erro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] subida:"));

  it("tudo certo: nenhum alerta, a lista vem da Stripe uma vez, e UMA linha diz que a cobrança confere (sem ela, nenhum alerta não distingue o certo do parado)", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await conferirCobrancaNaSubida()).toBe(true);
    expect(alertas(erro)).toEqual([]);
    expect(falsa.webhookEndpoints.list).toHaveBeenCalledTimes(1);
    const confere = info.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] subida: a cobrança confere"));
    expect(confere).toHaveLength(1);
    expect(confere[0]).toContain(`os ${AVISOS_DO_ENDERECO.length} avisos`);
  });

  it("o endereço sem um aviso: UM alerta, com o que falta — e nada de \"a cobrança confere\"", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    falsa.webhookEndpoints.list.mockResolvedValue({ data: [endereco({ enabled_events: AVISOS_DO_ENDERECO.filter((tipo) => tipo !== "payment_intent.succeeded") })] });
    expect(await conferirCobrancaNaSubida()).toBe(false);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("payment_intent.succeeded");
    expect(info.mock.calls.some(([texto]) => String(texto).includes("a cobrança confere"))).toBe(false);
  });

  it("as chaves de modos diferentes: alerta — e nenhuma chave no registro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_da_suite_publica";
    expect(await conferirCobrancaNaSubida()).toBe(false);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("modos diferentes");
    expect(erro.mock.calls.flat().join(" ")).not.toContain("SEGREDO");
    expect(erro.mock.calls.flat().join(" ")).not.toContain("da_suite_publica");
  });

  it("a Stripe recusou a lista: alerta, sem a mensagem crua dela", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    falsa.webhookEndpoints.list.mockRejectedValue(new Stripe.errors.StripePermissionError({ message: "mensagem crua da Stripe, com sk_live_abc", type: "invalid_request_error", statusCode: 403 }));
    expect(await conferirCobrancaNaSubida()).toBe(false);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("não consegui conferir o endereço de avisos");
    expect(alertas(erro)[0]).not.toContain("sk_live_abc");
  });

  it("sem a cobrança ou sem os avisos configurados: não confere nada; sem o endereço do site: só registro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.STRIPE_SECRET_KEY;
    expect(await conferirCobrancaNaSubida()).toBe(true);
    process.env.STRIPE_SECRET_KEY = SK;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(await conferirCobrancaNaSubida()).toBe(true);
    expect(falsa.webhookEndpoints.list).not.toHaveBeenCalled();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_da_suite";
    delete process.env.BETTER_AUTH_URL;
    expect(await conferirCobrancaNaSubida()).toBe(false);
    expect(falsa.webhookEndpoints.list).not.toHaveBeenCalled();
    expect(alertas(erro)).toEqual([]);
    expect(registro.mock.calls.some(([texto]) => String(texto).includes("BETTER_AUTH_URL"))).toBe(true);
  });
});
