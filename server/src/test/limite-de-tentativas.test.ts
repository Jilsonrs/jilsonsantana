import http from "node:http";
import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { tratarErroDaApi } from "../lib/erro-da-api.js";
import { LIMITES, LIMITES_DO_CODIGO, limiteDeTentativas } from "../lib/limite-de-tentativas.js";
import { LojaNoBanco } from "../lib/loja-de-tentativas.js";

// O LIMITE DE TENTATIVAS NAS ROTAS DE COBRANÇA (Fase 4, etapa 4.7, passo 1 — billing.md →
// *Limite de tentativas*). O que estes testes protegem:
//   - o teto é por CONTA (outra conta segue; trocar de endereço não escapa) e por ENDEREÇO, o
//     dobro (contas diferentes no mesmo endereço param juntas; o IPv6 conta pela faixa);
//   - recusado, o pedido NEM CHEGA à rota — aqui a rota responderia 503 (a cobrança não está
//     configurada neste arquivo, de propósito: nenhum pedido vai à Stripe);
//   - cada rota conta separado; a janela é de 15 minutos; nas rotas de cartão e de cobrança há
//     também o teto do dia;
//   - a pergunta "já tenho acesso?" (a tela de depois do pagamento, a cada 2 s) não tem limite;
//   - sem sessão continua 401, e não gasta a cota de ninguém;
//   - a recusa diz quando tentar de novo, e deixa UMA linha de aviso, sem o endereço.
// O `test/setup.ts` zera as contagens antes de cada teste.

const SEM_CHAVE = ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
const antes = Object.fromEntries(SEM_CHAVE.map((nome) => [nome, process.env[nome]]));
const TERCEIRA = { id: "limite-terceira", email: "limite-terceira@teste.local" };
const ENDERECO = "198.51.100.7";
const OUTRO_ENDERECO = "203.0.113.9";

let member: string[] = [];
let admin: string[] = [];
let terceira: string[] = [];

async function entrar(email?: string, senha?: string): Promise<string[]> {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({ email, password: senha });
  expect(res.status, `entrar como ${email}`).toBe(200);
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

/** Um pedido de cobrança, como o navegador faria, do endereço dado. */
function pedir(metodo: "get" | "post", caminho: string, cookies: string[], endereco = ENDERECO, corpo?: object) {
  const req = request(servidor)[metodo](`/api${caminho}`).set("Cookie", cookies).set("x-forwarded-for", endereco);
  return corpo ? req.send(corpo) : req;
}

/** Os status de `vezes` pedidos seguidos. */
async function status(vezes: number, faz: () => ReturnType<typeof pedir>): Promise<number[]> {
  const lista: number[] = [];
  for (let i = 0; i < vezes; i++) lista.push((await faz()).status);
  return lista;
}

const cartao = (cookies: string[], endereco?: string) => pedir("post", "/billing/cartao", cookies, endereco);

beforeAll(async () => {
  for (const nome of SEM_CHAVE) delete process.env[nome];
  member = await entrar(process.env.SEED_MEMBER_EMAIL, process.env.SEED_MEMBER_PASSWORD);
  admin = await entrar(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD);
  // A TERCEIRA CONTA, para o teto por endereço (que é o dobro do da conta): o cadastro é
  // fechado, então ela nasce com o MESMO cifrado de senha do member@ — entra com a senha dele.
  const daMember = await prisma.account.findFirst({ where: { user: { email: process.env.SEED_MEMBER_EMAIL }, providerId: "credential" }, select: { password: true } });
  await prisma.user.create({ data: { ...TERCEIRA, accounts: { create: { id: `${TERCEIRA.id}-conta`, accountId: TERCEIRA.id, providerId: "credential", password: daMember?.password } } } });
  terceira = await entrar(TERCEIRA.email, process.env.SEED_MEMBER_PASSWORD);
});

afterAll(async () => {
  for (const nome of SEM_CHAVE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
  await prisma.user.deleteMany({ where: { id: TERCEIRA.id } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("o teto por CONTA — guardar cartão ou cobrar: 5 a cada 15 minutos", () => {
  it("o 6º pedido é recusado com 429 MuitasTentativas, ANTES da rota (que responderia 503)", async () => {
    expect(LIMITES.cobranca.conta.porJanela).toBe(5);
    expect(await status(5, () => cartao(member))).toEqual([503, 503, 503, 503, 503]);

    const recusa = await cartao(member);
    expect([recusa.status, recusa.body]).toEqual([429, { error: "MuitasTentativas" }]);
    // Diz quando tentar de novo: até o fim da janela de 15 minutos, nunca depois.
    const segundos = Number(recusa.headers["retry-after"]);
    expect(segundos).toBeGreaterThan(0);
    expect(segundos).toBeLessThanOrEqual(15 * 60);
  });

  it("é da conta: outra conta, no mesmo endereço, continua passando", async () => {
    await status(6, () => cartao(member));
    expect((await cartao(admin)).status).toBe(503);
  });

  it("trocar de endereço não escapa do teto da conta", async () => {
    await status(5, () => cartao(member));
    expect((await cartao(member, OUTRO_ENDERECO)).status).toBe(429);
  });

  it("cada rota conta separado, no MESMO grupo: passar do teto em abrir o cartão não tranca o aplicar", async () => {
    await status(6, () => cartao(member));
    expect((await pedir("post", "/billing/cartao/aplicar", member)).status).toBe(503);
  });

  // O endereço como foi DIGITADO não abre outra contagem (achado P1 da revisão de segurança,
  // 19/10/2026): o Express aceita `/API/…` e `/Api/…`, e uma barra no fim.
  it("maiúsculas no endereço e a barra no fim contam junto com o endereço de sempre", async () => {
    await status(5, () => cartao(member));
    for (const grafia of ["/API/billing/cartao", "/Api/billing/cartao", "/api/BILLING/Cartao", "/api/billing/cartao/"]) {
      const res = await request(servidor).post(grafia).set("Cookie", member).set("x-forwarded-for", ENDERECO);
      expect(res.status, grafia).toBe(429);
    }
  });

  it("o mesmo teto nas outras rotas de cartão e de cobrança: assinar, aplicar o cartão, mudar de plano", async () => {
    const rotas: Array<[string, object | undefined]> = [
      ["/billing/assinatura", { plano: "mensal", documento: "529.982.247-25" }],
      ["/billing/cartao/aplicar", undefined],
      ["/billing/minha-assinatura/plano", { plano: "anual", valorMostrado: 89510 }],
    ];
    for (const [caminho, corpo] of rotas) {
      expect(await status(6, () => pedir("post", caminho, member, ENDERECO, corpo)), caminho).toEqual([503, 503, 503, 503, 503, 429]);
    }
  });
});

describe("o teto por ENDEREÇO — o dobro do da conta", () => {
  it("contas diferentes no mesmo endereço param juntas no 11º pedido; de outro endereço, passa", async () => {
    expect(LIMITES.cobranca.endereco.porJanela).toBe(10);
    expect(await status(5, () => cartao(member))).toEqual([503, 503, 503, 503, 503]);
    expect(await status(5, () => cartao(admin))).toEqual([503, 503, 503, 503, 503]);
    // A terceira conta nunca pediu — quem a para é o endereço.
    expect((await cartao(terceira)).status).toBe(429);
    expect((await cartao(terceira, OUTRO_ENDERECO)).status).toBe(503);
  });

  it("quem já passou do teto da PRÓPRIA conta não gasta a cota do endereço, que outras pessoas dividem", async () => {
    // 5 passam e 3 param no teto da conta: só os 5 contam no endereço.
    expect(await status(8, () => cartao(member))).toEqual([503, 503, 503, 503, 503, 429, 429, 429]);
    expect(await status(5, () => cartao(admin))).toEqual([503, 503, 503, 503, 503]);
  });

  it("o IPv6 conta pela faixa (/56): trocar de endereço dentro dela não escapa", async () => {
    const naFaixa = ["2001:db8:1:2::1", "2001:db8:1:2:ffff::9", "2001:db8:1:3::5"];
    expect(await status(5, () => cartao(member, naFaixa[0]))).toEqual([503, 503, 503, 503, 503]);
    expect(await status(5, () => cartao(admin, naFaixa[1]))).toEqual([503, 503, 503, 503, 503]);
    expect((await cartao(terceira, naFaixa[2])).status).toBe(429);
    // Outra faixa é outra pessoa.
    expect((await cartao(terceira, "2001:db8:1:200::1")).status).toBe(503);
  });

  it("forjar o começo do x-forwarded-for a cada pedido não escapa do teto do endereço real no fim", async () => {
    for (let i = 0; i < 5; i++) expect((await cartao(member, `198.51.100.${10 + i}, ${ENDERECO}`)).status).toBe(503);
    for (let i = 0; i < 5; i++) expect((await cartao(admin, `lixo-${i}, 198.51.100.${50 + i}, ${ENDERECO}`)).status).toBe(503);
    expect((await cartao(terceira, `198.51.100.99, ${ENDERECO}`)).status).toBe(429);
    expect((await cartao(terceira, `198.51.100.99, ${OUTRO_ENDERECO}`)).status).toBe(503);
  });
});

describe("as outras ações e as leituras", () => {
  it("aplicar o código promocional: 10 a cada 15 minutos", async () => {
    expect(LIMITES.acao.conta.porJanela).toBe(10);
    const previa = () => pedir("post", "/billing/previa", member, ENDERECO, { plano: "mensal", codigo: "TESTE" });
    expect(await status(10, previa)).toEqual(Array(10).fill(503));
    expect((await previa()).status).toBe(429);
  });

  it("cancelar, manter, reembolso e desistir da troca: 10 a cada 15 minutos, cada um", async () => {
    for (const caminho of ["/billing/minha-assinatura/cancelar", "/billing/minha-assinatura/manter", "/billing/minha-assinatura/reembolso", "/billing/minha-assinatura/plano/desistir"]) {
      expect(await status(11, () => pedir("post", caminho, member)), caminho).toEqual([...Array(10).fill(503), 429]);
    }
  });

  it("as leituras que vão à Stripe (os planos, a minha assinatura, a troca de plano): 60 a cada 15 minutos", async () => {
    expect(LIMITES.leitura.conta.porJanela).toBe(60);
    for (const caminho of ["/billing/planos", "/billing/minha-assinatura", "/billing/minha-assinatura/plano"]) {
      expect(await status(61, () => pedir("get", caminho, member)), caminho).toEqual([...Array(60).fill(503), 429]);
    }
  });

  it("o HEAD conta junto com o GET da mesma rota — não abre uma segunda cota", async () => {
    await status(60, () => pedir("get", "/billing/minha-assinatura", member));
    const head = await request(servidor).head("/api/billing/minha-assinatura").set("Cookie", member).set("x-forwarded-for", ENDERECO);
    expect(head.status).toBe(429);
  });

  it("a pergunta \"já tenho acesso?\" NÃO tem limite: a tela de depois do pagamento a repete a cada 2 s", async () => {
    const lista = await status(130, () => pedir("get", "/billing/assinatura", member));
    expect(lista.every((s) => s === 200)).toBe(true);
  });
});

describe("a janela e o dia", () => {
  it("passados 15 minutos a conta recomeça — e o teto do dia (20) segura quem espera a janela e volta", async () => {
    expect(LIMITES.cobranca.conta.porDia).toBe(20);
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    for (let rodada = 0; rodada < 4; rodada++) {
      expect(await status(5, () => cartao(member)), `rodada ${rodada}`).toEqual([503, 503, 503, 503, 503]);
      expect((await cartao(member)).status, `rodada ${rodada}, o 6º`).toBe(429);
      vi.setSystemTime(Date.now() + 16 * 60_000);
    }
    // A janela de 15 minutos recomeçou, mas o dia já tem 20: recusado.
    const recusa = await cartao(member);
    expect(recusa.status).toBe(429);
    // E o Retry-After passa a ser o do DIA, não o da janela.
    expect(Number(recusa.headers["retry-after"])).toBeGreaterThan(15 * 60);
  });

  it("o teto do dia por ENDEREÇO (40): duas contas gastam o dia inteiro do endereço, e a terceira para no primeiro pedido", async () => {
    expect(LIMITES.cobranca.endereco.porDia).toBe(40);
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    for (let rodada = 0; rodada < 4; rodada++) {
      expect(await status(5, () => cartao(member)), `rodada ${rodada}`).toEqual([503, 503, 503, 503, 503]);
      expect(await status(5, () => cartao(admin)), `rodada ${rodada}`).toEqual([503, 503, 503, 503, 503]);
      vi.setSystemTime(Date.now() + 16 * 60_000);
    }
    expect((await cartao(terceira)).status).toBe(429);
    // De outro endereço, a terceira passa: quem a parou foi o dia do endereço.
    expect((await cartao(terceira, OUTRO_ENDERECO)).status).toBe(503);
  });

  // A ordem dos tetos inclui o do DIA (achado da revisão de segurança, 19/10/2026): a conta que
  // já gastou o dia é recusada antes de chegar à contagem do endereço.
  it("a conta que já gastou o dia não gasta a cota do endereço: quem vem depois, no mesmo endereço, passa", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() });
    for (let rodada = 0; rodada < 4; rodada++) {
      await status(5, () => cartao(member));
      vi.setSystemTime(Date.now() + 16 * 60_000);
    }
    expect(await status(5, () => cartao(member))).toEqual([429, 429, 429, 429, 429]);
    expect(await status(5, () => cartao(admin))).toEqual([503, 503, 503, 503, 503]);
    expect((await cartao(terceira)).status).toBe(503);
  });
});

describe("o endereço que não é um endereço", () => {
  it("fora de produção, sem cabeçalho (ou com um que não termina em IP) vale a conexão — todos aqui são 127.0.0.1", async () => {
    const semCabecalho = (cookies: string[], valor?: string) => {
      const req = request(servidor).post("/api/billing/cartao").set("Cookie", cookies);
      return valor === undefined ? req : req.set("x-forwarded-for", valor);
    };
    expect(await status(5, () => semCabecalho(member))).toEqual([503, 503, 503, 503, 503]);
    expect(await status(5, () => semCabecalho(admin, "abc"))).toEqual([503, 503, 503, 503, 503]);
    expect((await semCabecalho(terceira, "1.2.3.4, abc")).status).toBe(429);
  });

  // EM PRODUÇÃO o `x-forwarded-for` vem da frente do Cloud Run. Sem ele (ou com um que não termina
  // em IP válido), contar pela conexão juntaria a escola inteira na contagem do proxy: o pedido não
  // conta por endereço, o teto da CONTA continua, e vai UM alerta (achado da revisão de segurança, 19/10/2026).
  it("em produção, sem um x-forwarded-for válido: não conta por endereço, a conta continua contando, e UM alerta", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const antesDoAmbiente = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const estranho = (cookies: string[], valor?: string) => {
        const req = request(servidor).post("/api/billing/cartao").set("Cookie", cookies);
        return valor === undefined ? req : req.set("x-forwarded-for", valor);
      };
      expect(await status(5, () => estranho(member))).toEqual([503, 503, 503, 503, 503]);
      expect(await status(5, () => estranho(admin, "abc"))).toEqual([503, 503, 503, 503, 503]);
      // A terceira passa: não houve contagem por endereço (o último item não é IP).
      expect((await estranho(terceira, "1.2.3.4, abc")).status).toBe(503);
      // A conta continua: o 6º do member@ para.
      expect((await estranho(member)).status).toBe(429);
      const alertas = erro.mock.calls.map((chamada) => chamada.join(" ")).filter((linha) => linha.includes("x-forwarded-for"));
      expect(alertas).toEqual(["[api] limite de tentativas: pedido sem um x-forwarded-for válido — a contagem por endereço está parada (a frente do Cloud Run deixou de preencher o cabeçalho?)"]);
    } finally {
      process.env.NODE_ENV = antesDoAmbiente;
      erro.mockRestore();
    }
  });
});

describe("o limite fora do lugar", () => {
  // O limite por CONTA sem sessão juntaria todo mundo numa contagem só (achado da revisão de
  // segurança, 19/10/2026): montado sem o `requireAuth`, é erro — 500, e o alerta.
  it("montado sem o requireAuth: 500 ErroInterno e a linha que alerta, nunca uma contagem de todos", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const mini = express();
    mini.post("/api/rota-sem-login", ...limiteDeTentativas.acao, (_req, res) => {
      res.status(204).end();
    });
    mini.use("/api", tratarErroDaApi);
    const servidorMini = http.createServer(mini);
    await new Promise<void>((pronto) => servidorMini.listen(0, "127.0.0.1", () => pronto()));
    try {
      const res = await request(servidorMini).post("/api/rota-sem-login");
      expect([res.status, res.body]).toEqual([500, { error: "ErroInterno" }]);
      expect(erro.mock.calls.flat().join(" ")).toContain("[api] limite de tentativas por conta sem sessão: falta o requireAuth antes");
    } finally {
      servidorMini.close();
      erro.mockRestore();
    }
  });

  // Numa rota, zerar destravaria todo mundo: só os testes a chamam.
  it("zerarLimitesDeTentativas só é usada pelos testes", () => {
    const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const arquivos = readdirSync(raiz, { recursive: true, encoding: "utf8" }).filter((nome) => nome.endsWith(".ts") && !nome.endsWith(".test.ts") && !nome.startsWith("test"));
    expect(arquivos.length).toBeGreaterThan(50);
    const usam = arquivos.filter((nome) => readFileSync(path.join(raiz, nome), "utf8").includes("zerarLimitesDeTentativas"));
    expect(usam).toEqual([path.join("lib", "limite-de-tentativas.ts")]);
  });
});

describe("o que a recusa NÃO faz", () => {
  it("sem sessão continua 401 — e quem não entrou não gasta a cota de ninguém", async () => {
    expect(await status(12, () => cartao([]))).toEqual(Array(12).fill(401));
    expect(await status(5, () => cartao(member))).toEqual([503, 503, 503, 503, 503]);
  });

  it("deixa UMA linha de aviso por janela, com a conta e SEM o endereço — e nenhuma de erro (não alerta ninguém)", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await status(9, () => cartao(member));
      const linhas = aviso.mock.calls.map((chamada) => chamada.join(" ")).filter((linha) => linha.includes("limite de tentativas"));
      const memberId = (await prisma.user.findFirst({ where: { email: process.env.SEED_MEMBER_EMAIL }, select: { id: true } }))?.id;
      expect(linhas).toEqual([`[api] POST /api/billing/cartao passou do limite de tentativas (conta ${memberId})`]);
      expect(linhas.join(" ")).not.toContain(ENDERECO);
      expect(erro.mock.calls.flat().join(" ")).not.toContain("limite de tentativas");
    } finally {
      aviso.mockRestore();
      erro.mockRestore();
    }
  });
});

// A CONTAGEM NO BANCO (25/10/2026, revisão de segurança): o que acontece quando ela falha, e o que o
// visitante consegue escrever na chave.
describe("a contagem no banco — falhas e o que o visitante escreve", () => {
  it("a contagem falhou (o banco caiu): o pedido é recusado com 500 e nem chega à rota", async () => {
    const espiao = vi.spyOn(LojaNoBanco.prototype, "increment").mockRejectedValueOnce(new Error("banco fora do ar"));
    try {
      // A rota responderia 503 (a cobrança não está configurada neste arquivo): 500 é a recusa do limite.
      expect((await cartao(member)).status).toBe(500);
    } finally {
      espiao.mockRestore();
    }
  });

  it("pedir o código com um e-mail que o Postgres não grava (\\u0000): recusa normal (400), nunca 500", async () => {
    const res = await request(servidor).post("/api/conta/codigo").set("x-forwarded-for", "198.51.100.150").send({ email: "a\u0000b@teste.local", motivo: "entrar" });
    expect(res.status).toBe(400);
  });

  it("endereço já barrado: e-mails novos dele são recusados SEM gravar linha nova no banco", async () => {
    const endereco = "198.51.100.151";
    const pedirCom = (i: number) => request(servidor).post("/api/conta/codigo").set("x-forwarded-for", endereco).send({ email: `barrado-${i}@teste.local`, motivo: "entrar" });
    for (let i = 0; i < LIMITES_DO_CODIGO.endereco.porJanela; i++) expect((await pedirCom(i)).status).not.toBe(429);
    const contarLinhas = async () => (await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM limite_de_tentativa`)[0].n;
    const antes = await contarLinhas();

    for (let i = 100; i < 105; i++) expect((await pedirCom(i)).status).toBe(429);

    expect(await contarLinhas()).toBe(antes);
  });
});
