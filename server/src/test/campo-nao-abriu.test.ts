import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";

// O CAMPO DE PAGAMENTO QUE NÃO ABRIU (E3 da revisão ampla da cobrança, 29/10/2026). O que protege: a tela avisa, sem
// login, e o servidor ALERTA o operador — no máximo um alerta a cada 15 min por cópia (a cota de alertas é por cópia),
// o resto no registro; o corpo é de listas fechadas (texto livre não chega ao registro); e o teto por endereço segura
// o robô. O relógio de mentira (só a data) fica longe dos outros testes.

// 198.18.0.0/15 (a faixa de testes de rede): fora das faixas dos outros arquivos — a contagem por endereço é no banco, e os arquivos dividem o banco.
let enderecos = 0;
const novoEndereco = () => `198.18.0.${++enderecos}`;
const avisar = (corpo: object, endereco = novoEndereco()) => request(servidor).post("/api/billing/campo-nao-abriu").set("x-forwarded-for", endereco).send(corpo);
const alertas = (erro: { mock: { calls: unknown[][] } }) => erro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] site:"));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/billing/campo-nao-abriu", () => {
  it("sem login: 204 e UM alerta, com a tela e o motivo; o seguinte, em menos de 15 min, só no registro; depois, alerta de novo", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    const inicio = new Date("2033-01-10T12:00:00Z").getTime();
    vi.setSystemTime(inicio);
    expect((await avisar({ tela: "assinar-sem-login", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("na tela assinar-sem-login (nao-carregou)");

    vi.setSystemTime(inicio + 14 * 60_000);
    expect((await avisar({ tela: "trocar-cartao", motivo: "erro-ao-carregar" })).status).toBe(204);
    expect(alertas(erro)).toHaveLength(1);
    expect(registro.mock.calls.some(([texto]) => String(texto).includes("na tela trocar-cartao (erro-ao-carregar)"))).toBe(true);

    vi.setSystemTime(inicio + 16 * 60_000);
    expect((await avisar({ tela: "assinar", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toHaveLength(2);
  });

  it("o corpo fora das listas (outra tela, texto livre, vazio): 400, e nada no registro nem alerta", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const corpo of [{ tela: "home", motivo: "nao-carregou" }, { tela: "assinar", motivo: "<script>alert(1)</script>" }, {}]) {
      expect((await avisar(corpo)).status).toBe(400);
    }
    expect(alertas(erro)).toEqual([]);
    expect(registro.mock.calls.some(([texto]) => String(texto).startsWith("[stripe] site:"))).toBe(false);
  });

  it("o teto por endereço segura o robô: depois de 5 em 15 min, 429", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const endereco = novoEndereco();
    const teto = LIMITES_DO_VISITANTE.campoNaoAbriu.endereco.porJanela;
    for (let i = 0; i < teto; i++) expect((await avisar({ tela: "assinar", motivo: "nao-carregou" }, endereco)).status).toBe(204);
    expect((await avisar({ tela: "assinar", motivo: "nao-carregou" }, endereco)).status).toBe(429);
  });

  it("de outro site (Sec-Fetch-Site: cross-site): 403, como toda rota de /billing que muda alguma coisa", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await request(servidor).post("/api/billing/campo-nao-abriu").set("x-forwarded-for", novoEndereco()).set("Sec-Fetch-Site", "cross-site").send({ tela: "assinar", motivo: "nao-carregou" });
    expect([res.status, res.body]).toEqual([403, { error: "OutroSite" }]);
  });
});
