import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";

// O CAMPO DE PAGAMENTO QUE NÃO ABRIU (E3 da revisão ampla da cobrança, 29/10/2026). O que protege: a tela avisa, sem
// login, e o servidor ALERTA o operador quando o campo falha para vários endereços (é defeito nosso) — no máximo um
// alerta a cada 6 h por cópia (a cota de alertas é por cópia), o resto no registro; o corpo é de listas fechadas (texto
// livre não chega ao registro); e o teto por endereço segura o robô. O relógio de mentira (só a data) fica longe dos
// outros testes.

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
  // C2 e R2 das revisões do grupo 1 (29/10/2026): o relato chega sem login, então um robô o manda à vontade. O alerta
  // sai quando, numa janela de 6 h, os relatos vêm de 3 endereços diferentes (é o que diz "defeito nosso"); um endereço
  // só fica no registro. No máximo UM alerta a cada 6 h por cópia; no registro, a marca do endereço, nunca o IP.
  it("sem login: 204; de um endereço só, só no registro (com a marca); o 3º endereço diferente em 6 h faz UM alerta; os seguintes, em menos de 6 h, só no registro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    const inicio = new Date("2033-01-10T12:00:00Z").getTime();
    vi.setSystemTime(inicio);
    const primeiro = novoEndereco();
    expect((await avisar({ tela: "trocar-cartao", motivo: "erro-ao-carregar" }, primeiro)).status).toBe(204);
    expect((await avisar({ tela: "assinar", motivo: "nao-carregou" }, primeiro)).status).toBe(204);
    expect(alertas(erro)).toEqual([]);
    const linhas = registro.mock.calls.map(([texto]) => String(texto)).filter((texto) => texto.startsWith("[stripe] site:"));
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatch(/na tela trocar-cartao \(erro-ao-carregar\), endereço [0-9a-f]{16}$/);
    expect(linhas.join(" ")).not.toContain(primeiro);

    vi.setSystemTime(inicio + 60 * 60_000);
    expect((await avisar({ tela: "assinar", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toEqual([]);
    vi.setSystemTime(inicio + 5 * 60 * 60_000);
    expect((await avisar({ tela: "assinar-sem-login", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toHaveLength(1);
    expect(alertas(erro)[0]).toContain("para 3 endereços diferentes em menos de 6 h (4 relato(s))");
    expect(alertas(erro)[0]).toContain("na tela assinar-sem-login (nao-carregou)");

    // Mais 3 endereços diferentes, ainda dentro das 6 h do alerta: só no registro.
    vi.setSystemTime(inicio + 5 * 60 * 60_000 + 60_000);
    for (let i = 0; i < 3; i++) expect((await avisar({ tela: "assinar", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toHaveLength(1);

    // Passadas as 6 h, a janela recomeça: de novo 3 endereços diferentes fazem o alerta.
    vi.setSystemTime(inicio + 11 * 60 * 60_000 + 2 * 60_000);
    for (let i = 0; i < 3; i++) expect((await avisar({ tela: "assinar", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toHaveLength(2);
  });

  // R2: a janela é de 6 h — alunos sozinhos em dias diferentes (o bloqueador de cada um) não somam um "defeito nosso".
  it("relatos espalhados: dois endereços, e o terceiro 7 h depois — nenhum alerta (a janela recomeçou)", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    const inicio = new Date("2035-01-10T12:00:00Z").getTime();
    vi.setSystemTime(inicio);
    for (let i = 0; i < 2; i++) expect((await avisar({ tela: "assinar", motivo: "nao-carregou" })).status).toBe(204);
    vi.setSystemTime(inicio + 7 * 60 * 60_000);
    expect((await avisar({ tela: "assinar", motivo: "nao-carregou" })).status).toBe(204);
    expect(alertas(erro)).toEqual([]);
  });

  // R3 da revisão das correções (29/10/2026): o endereço conta pela chave do limite — o IPv6 pelo bloco /56. Um robô
  // num bloco, trocando de endereço a cada relato, é um endereço só, e não forja o "defeito nosso".
  it("um robô num bloco IPv6 (/56) trocando de endereço a cada relato: um endereço só — nenhum alerta", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2034-01-10T12:00:00Z"));
    for (const fim of ["1", "2", "3", "4"]) expect((await avisar({ tela: "assinar", motivo: "nao-carregou" }, `2001:db8:c0:ab00::${fim}`)).status).toBe(204);
    expect(alertas(erro)).toEqual([]);
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
