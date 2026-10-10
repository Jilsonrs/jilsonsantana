import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import * as Sentry from "@sentry/node";
import type { PrecoDoPlano } from "../lib/stripe.js";

// A Stripe na NOSSA fronteira, só para um erro escapar de uma rota de verdade.
const buscarPrecos = vi.fn<() => Promise<PrecoDoPlano[]>>();
vi.mock("../lib/stripe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/stripe.js")>()),
  buscarPrecos: () => buscarPrecos(),
}));

import servidor from "./servidor.js";
import { avisarQueSubiu, criarLimite, esvaziarMonitor, ligarMonitor, limparEvento, mascarar, monitorLigado } from "../lib/monitor.js";

// O ALERTA DE ERRO (Sentry — `lib/monitor.ts`; plano → Fase 7). O Sentry de verdade roda aqui,
// com um TRANSPORTE DE MENTIRA no lugar da rede: o que estes testes olham é o que SAIRIA do
// servidor. O que protegem:
//   - só liga em produção e com o endereço configurado;
//   - vira alerta a linha de erro com etiqueta NOSSA — e não a de biblioteca de terceiro (o
//     Better Auth registra senha errada como erro: um robô gastaria a cota do mês), nem o aviso;
//   - o que sai é o texto, mascarado: nunca e-mail, chave, segredo de pagamento, o que vem
//     depois do "?" de um endereço, cabeçalho, cookie, corpo, usuário;
//   - a cota: um defeito que se repete não manda mais que o limite;
//   - o Sentry só é importado em `lib/monitor.ts`.

const DSN = "https://chavepublica@o0.ingest.sentry.io/0";
const enviados: string[] = [];
const transporte = (opcoes: Parameters<typeof Sentry.createTransport>[0]) =>
  Sentry.createTransport(opcoes, async (pedido) => {
    enviados.push(typeof pedido.body === "string" ? pedido.body : Buffer.from(pedido.body).toString("utf8"));
    return { statusCode: 200 };
  });

type Evento = { message?: string; level?: string; logger?: string; release?: string; server_name?: string; tags?: Record<string, string>; [campo: string]: unknown };

/** Os eventos que sairiam: cada envelope é texto em linhas; a do evento vem depois do cabeçalho `{"type":"event"}`. */
async function eventos(): Promise<Evento[]> {
  await esvaziarMonitor();
  const achados: Evento[] = [];
  for (const envelope of enviados) {
    const linhas = envelope.split("\n");
    linhas.forEach((linha, i) => {
      if (linha.startsWith('{"type":"event"')) achados.push(JSON.parse(linhas[i + 1]) as Evento);
    });
  }
  return achados;
}
const tudoQueSaiu = () => enviados.join("\n");

// O REGISTRO DESTE ARQUIVO: gravadores postos no lugar do `console` ANTES de o Sentry ligar, e
// nunca devolvidos. O Sentry embrulha o `console` uma vez só, na primeira vez que liga; um
// espião do Vitest posto depois ficaria POR CIMA do embrulho (o Sentry deixaria de ouvir), e
// devolvê-lo arrancaria o embrulho junto. Cada arquivo de teste roda no seu processo: nada
// disto chega aos outros.
const gritos: string[] = [];
const avisos: string[] = [];
const juntar = (partes: unknown[]) => partes.map(String).join(" ");
console.error = (...partes: unknown[]) => void gritos.push(juntar(partes));
console.warn = (...partes: unknown[]) => void avisos.push(juntar(partes));
console.info = () => {};
let member: string[] = [];

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email: process.env.SEED_MEMBER_EMAIL, password: process.env.SEED_MEMBER_PASSWORD });
  member = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  expect(member.length).toBeGreaterThan(0);
});
afterEach(() => {
  enviados.length = 0;
  gritos.length = 0;
  avisos.length = 0;
});

/** Liga de novo, com o limite que o teste pedir (ligar outra vez troca o cliente do Sentry). */
const ligar = (limite?: () => boolean) => ligarMonitor({ dsn: DSN, producao: true, versao: "versao-de-teste" }, { transporte, limite });

describe("quando o alerta liga", () => {
  it("fora de produção não liga, mesmo com o endereço: no computador e nos testes os erros ficam no terminal", () => {
    expect(ligarMonitor({ dsn: DSN, producao: false, versao: null }, { transporte })).toBe(false);
    expect(monitorLigado()).toBe(false);
  });

  it("em produção sem o endereço: não liga, e diz isso no registro", () => {
    expect(ligarMonitor({ dsn: undefined, producao: true, versao: null }, { transporte })).toBe(false);
    expect(ligarMonitor({ dsn: "", producao: true, versao: null }, { transporte })).toBe(false);
    expect(monitorLigado()).toBe(false);
    // As DUAS recusas são a de "não configurado": o endereço vazio nem chega ao Sentry.
    expect(avisos.filter((linha) => linha.includes("[monitor] desligado: SENTRY_DSN não configurado")).length).toBe(2);
  });

  it("em produção com um endereço malformado: não liga, e diz isso — nunca um alerta mudo", () => {
    expect(ligarMonitor({ dsn: "isto-nao-e-um-endereco", producao: true, versao: null }, { transporte })).toBe(false);
    expect(avisos.join("\n")).toContain("SENTRY_DSN não é um endereço válido");
    expect(monitorLigado()).toBe(false);
  });

  it("em produção com o endereço: liga", () => {
    expect(ligar()).toBe(true);
    expect(monitorLigado()).toBe(true);
  });
});

describe("o que vira alerta", () => {
  it("a linha de erro com etiqueta nossa: sai o texto, o nível, a versão e a origem", async () => {
    ligar();
    console.error("[stripe] checkout: a conta abc tem a assinatura sub_1 (active) na Stripe e segue sem acesso: o assinante está trancado fora");
    const [evento, ...resto] = await eventos();
    expect(resto).toEqual([]);
    expect(evento.message).toBe("[stripe] checkout: a conta abc tem a assinatura sub_1 (active) na Stripe e segue sem acesso: o assinante está trancado fora");
    expect(evento.level).toBe("error");
    expect(evento.release).toBe("versao-de-teste");
    expect(evento.server_name).toBe("servidor");
    expect(evento.tags?.origem).toBe("stripe");
  });

  it("a linha de erro de uma biblioteca de terceiro NÃO vai (senha errada no Better Auth não pode gastar a cota)", async () => {
    ligar();
    console.error("2026-10-10T12:00:00.000Z ERROR [Better Auth]: Invalid password");
    console.error(new Error("um erro solto, sem etiqueta"));
    console.error("texto solto");
    expect(await eventos()).toEqual([]);
  });

  it("aviso e informação com etiqueta nossa NÃO alertam: só o erro precisa de gente", async () => {
    ligar();
    console.warn("[stripe] aviso recusado (a assinatura não confere)");
    console.info("[stripe] aviso evt_1: atualizada");
    expect(await eventos()).toEqual([]);
  });

  it("o erro que escapa de uma rota de verdade chega com o endereço — sem o que vem depois do \"?\"", async () => {
    ligar();
    buscarPrecos.mockReset().mockRejectedValue(new Error("a Stripe caiu"));
    const res = await request(servidor).get("/api/billing/planos?token=nao_sai_do_servidor").set("Cookie", member);
    expect(res.status).toBe(500);
    const [evento, ...resto] = await eventos();
    expect(resto).toEqual([]);
    expect(evento.message).toContain("[api] GET /api/billing/planos falhou");
    expect(evento.message).toContain("a Stripe caiu");
    expect(evento.tags?.origem).toBe("api");
    expect(tudoQueSaiu()).not.toContain("nao_sai_do_servidor");
  });

  it("a cada subida do servidor sai um aviso com a versão: é a prova de que a ligação funciona", async () => {
    ligar();
    avisarQueSubiu("mv2vto41-b161cf53");
    const [evento, ...resto] = await eventos();
    expect(resto).toEqual([]);
    expect(evento.message).toBe("[servidor] no ar, versão mv2vto41-b161cf53");
    expect(evento.level).toBe("info");
    expect(evento.tags?.origem).toBe("servidor");
  });
});

describe("o que NUNCA sai do servidor", () => {
  it("num texto: e-mail, chave, segredo de pagamento e o que vem depois do \"?\" de um endereço saem mascarados", async () => {
    ligar();
    console.error(
      '[api] POST /api/x falhou: Error: Invalid `prisma.user.findUnique()` { where: { email: "ana.souza@exemplo.com.br" } } ' +
        "chave sk_live_ABC123def e whsec_XYZ789 e rk_test_QWE456, segredo pi_3ABC_secret_DEF456, " +
        "vídeo https://player.mediadelivery.net/embed/1/abc?token=TOKEN_DO_VIDEO&expires=123",
    );
    const [evento] = await eventos();
    expect(evento.message).toContain("[api] POST /api/x falhou");
    for (const segredo of ["ana.souza", "exemplo.com.br", "sk_live_ABC123def", "whsec_XYZ789", "rk_test_QWE456", "pi_3ABC_secret_DEF456", "TOKEN_DO_VIDEO", "expires=123"]) {
      expect(tudoQueSaiu()).not.toContain(segredo);
    }
    expect(evento.message).toContain("[e-mail]");
    expect(evento.message).toContain("https://player.mediadelivery.net/embed/1/abc?[…]");
  });

  it("a máscara não estraga o que não é segredo: ids, status e caminho de pacote ficam", () => {
    expect(mascarar("[stripe] aviso evt_1 (assinatura sub_2 do cliente cus_3) falhou em node_modules/@prisma/client/x.js")).toBe(
      "[stripe] aviso evt_1 (assinatura sub_2 do cliente cus_3) falhou em node_modules/@prisma/client/x.js",
    );
  });

  it("num evento: o pedido (cabeçalho, cookie, corpo), o usuário, o rastro anterior, os pacotes e os extras são tirados", () => {
    const limpo = limparEvento({
      type: undefined,
      message: "[stripe] algo falhou para dona@exemplo.com",
      request: { url: "https://site/api/x?token=1", headers: { cookie: "sessao=SEGREDO_DO_COOKIE", authorization: "Bearer X" }, data: { senha: "SENHA_DIGITADA" }, cookies: { sessao: "SEGREDO_DO_COOKIE" } },
      user: { id: "u1", email: "dona@exemplo.com", ip_address: "200.1.2.3" },
      breadcrumbs: [{ message: "GET https://api.stripe.com/v1/customers/cus_1" }],
      modules: { express: "5.0.1" },
      extra: { arguments: ["[stripe] algo falhou para dona@exemplo.com"] },
      contexts: { runtime: { name: "node", version: "v20" }, device: { name: "maquina-da-railway" }, os: { name: "Linux" } },
      server_name: "maquina-da-railway",
    });
    const texto = JSON.stringify(limpo);
    for (const proibido of ["SEGREDO_DO_COOKIE", "SENHA_DIGITADA", "Bearer", "dona@exemplo.com", "200.1.2.3", "api.stripe.com", "maquina-da-railway", "express", "token=1"]) {
      expect(texto).not.toContain(proibido);
    }
    expect(limpo?.message).toBe("[stripe] algo falhou para [e-mail]");
    expect(limpo?.contexts).toEqual({ runtime: { name: "node", version: "v20" } });
  });

  it("o erro que derrubaria o processo passa (não vem do console), com a mensagem mascarada", () => {
    const limpo = limparEvento({ type: undefined, exception: { values: [{ type: "Error", value: "falhou para dona@exemplo.com" }] } });
    expect(limpo?.exception?.values?.[0]?.value).toBe("falhou para [e-mail]");
    expect(limpo?.tags?.origem).toBe("processo");
  });
});

describe("a cota", () => {
  it("o limite por janela: 30 em 10 minutos; o 31º espera a janela andar", () => {
    let agora = 1_000_000;
    const pode = criarLimite(undefined, () => agora);
    for (let i = 0; i < 30; i++) expect(pode()).toBe(true);
    expect(pode()).toBe(false);
    agora += 10 * 60_000 - 1;
    expect(pode()).toBe(false);
    agora += 1;
    expect(pode()).toBe(true);
  });

  it("o limite do dia: 150; depois disso só no dia seguinte", () => {
    let agora = 1_000_000;
    const pode = criarLimite(undefined, () => agora);
    let enviados150 = 0;
    for (let janela = 0; janela < 10; janela++) {
      for (let i = 0; i < 30; i++) if (pode()) enviados150++;
      agora += 10 * 60_000;
    }
    expect(enviados150).toBe(150);
    expect(pode()).toBe(false);
    agora += 24 * 60 * 60_000;
    expect(pode()).toBe(true);
  });

  it("ligado: o defeito que se repete não manda mais que o limite — o resto fica no registro, com um aviso só", async () => {
    let restam = 2;
    ligar(() => restam-- > 0);
    for (let i = 1; i <= 5; i++) console.error(`[api] GET /api/x falhou: a mesma falha, vez ${i}`);
    const saiu = await eventos();
    expect(saiu.map((e) => e.message)).toEqual(["[api] GET /api/x falhou: a mesma falha, vez 1", "[api] GET /api/x falhou: a mesma falha, vez 2"]);
    // As cinco linhas continuam no registro do servidor.
    expect(gritos.length).toBe(5);
    expect(avisos.filter((linha) => linha.includes("[monitor] limite de envios atingido")).length).toBe(1);
  });

  it("a linha que não é nossa não gasta o limite", async () => {
    let perguntas = 0;
    ligar(() => {
      perguntas++;
      return true;
    });
    console.error("ERROR [Better Auth]: Invalid password");
    console.error("[stripe] uma falha nossa");
    await eventos();
    expect(perguntas).toBe(1);
  });
});

describe("o Sentry atrás de um arquivo só", () => {
  it("`@sentry/node` só é importado em lib/monitor.ts: trocar de fornecedor custa um arquivo", () => {
    const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const arquivos = readdirSync(raiz, { recursive: true, encoding: "utf8" }).filter((nome) => nome.endsWith(".ts") && !nome.endsWith(".test.ts") && !nome.startsWith("test"));
    expect(arquivos.length).toBeGreaterThan(50);
    const comSentry = arquivos.filter((nome) => /from\s+["']@sentry\//.test(readFileSync(path.join(raiz, nome), "utf8")));
    expect(comSentry).toEqual([path.join("lib", "monitor.ts")]);
  });
});
