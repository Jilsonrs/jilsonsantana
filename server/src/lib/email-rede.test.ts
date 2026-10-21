import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { pt } from "@jilson/core";
import { enviarEmail, type PedidoDeEmail } from "./email.js";

// O BALCÃO DE CORREIO (etapa 4.7, passo 3) com a biblioteca do Resend DE VERDADE e só a rede
// trocada por dublê: é assim que o teste prova o que de fato sai pelo fio — o remetente, o
// "responder", a chave contra e-mail repetido —, e não o que um dublê da biblioteca aceitaria.
// Sem chave de fornecedor: a chave é de mentira e é devolvida no fim (o CI não tem nenhuma).
// O topo e o rodapé vêm do dicionário pelo `getDict()`, do banco de teste — como em produção.

const ALUNA = "aluna.de.teste@example.com";
const PEDIDO: PedidoDeEmail = {
  para: ALUNA,
  tipo: "prova",
  referencia: "conta:conta_1 evento:evt_1",
  mensagem: { assunto: "Assunto reservado", paragrafos: ["conteúdo reservado"] },
};

type PedidoNaRede = { url: string; init: RequestInit };
let naRede: PedidoNaRede[];
const original = { chave: process.env.RESEND_API_KEY, ambiente: process.env.NODE_ENV, base: process.env.RESEND_BASE_URL };
let erro: MockInstance<typeof console.error>;
let aviso: MockInstance<typeof console.warn>;
let info: MockInstance<typeof console.info>;

/** A rede responde sempre com este status e este corpo. */
function rede(status: number, corpo: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit) => {
      naRede.push({ url, init });
      return Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } }));
    }),
  );
}

/** As linhas NOSSAS (`[email] …`) que saíram por um canal do console. */
function nossas(canal: { mock: { calls: unknown[][] } }): string[] {
  return canal.mock.calls.map((args) => args.map(String).join(" ")).filter((linha) => linha.startsWith("[email]"));
}
const todasAsNossas = (): string[] => [...nossas(erro), ...nossas(aviso), ...nossas(info)];

const corpoDo = (pedido: PedidoNaRede): Record<string, unknown> => JSON.parse(String(pedido.init.body)) as Record<string, unknown>;

beforeEach(() => {
  naRede = [];
  process.env.RESEND_API_KEY = "re_da_suite_local";
  delete process.env.RESEND_BASE_URL;
  erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
  aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  info = vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const [nome, valor] of [["RESEND_API_KEY", original.chave], ["NODE_ENV", original.ambiente], ["RESEND_BASE_URL", original.base]] as const) {
    if (valor === undefined) delete process.env[nome];
    else process.env[nome] = valor;
  }
});

describe("enviarEmail — o que sai pelo fio", () => {
  it("sai do subdomínio da escola, com a resposta indo para o suporte (decisões do operador, 20/10/2026)", async () => {
    rede(200, { id: "email_da_prova" });

    expect(await enviarEmail(PEDIDO)).toEqual({ enviado: true, id: "email_da_prova" });

    expect(naRede).toHaveLength(1);
    expect(naRede[0].url).toBe("https://api.resend.com/emails");
    expect(naRede[0].init.method).toBe("POST");
    expect(new Headers(naRede[0].init.headers).get("authorization")).toBe("Bearer re_da_suite_local");
    const corpo = corpoDo(naRede[0]);
    expect(corpo).toMatchObject({
      from: "Jilson Santana <suporte@alunos.jilsonsantana.com>",
      reply_to: "suporte@jilsonsantana.com",
      to: [ALUNA],
      subject: "Assunto reservado",
    });
    // O modelo da escola, montado aqui dentro com os textos do dicionário.
    for (const versao of [String(corpo.html), String(corpo.text)]) {
      expect(versao).toContain("conteúdo reservado");
      expect(versao).toContain(pt.app.email.rodape);
    }
  });

  it("vai sempre para a API do Resend, mesmo com uma RESEND_BASE_URL esquecida no ambiente", async () => {
    rede(200, { id: "email_1" });
    process.env.RESEND_BASE_URL = "https://outro-servidor.example.com";

    await enviarEmail(PEDIDO);

    expect(naRede.map((p) => p.url)).toEqual(["https://api.resend.com/emails"]);
  });

  it("a chave vai junto: o mesmo aviso da Stripe, entregue duas vezes, não manda dois e-mails", async () => {
    rede(200, { id: "email_1" });

    await enviarEmail({ ...PEDIDO, chave: "prova/evt_1" });
    await enviarEmail(PEDIDO);

    expect(new Headers(naRede[0].init.headers).get("idempotency-key")).toBe("prova/evt_1");
    expect(new Headers(naRede[1].init.headers).get("idempotency-key")).toBeNull();
  });

  it("o registro do envio leva o tipo, a referência e o id — nunca o destinatário nem o conteúdo", async () => {
    rede(200, { id: "email_da_prova" });

    await enviarEmail(PEDIDO);

    expect(nossas(info)).toEqual(['[email] o e-mail "prova" (conta:conta_1 evento:evt_1) foi entregue ao Resend (email_da_prova)']);
    expect(nossas(erro)).toEqual([]);
  });

  it("uma referência com cara de e-mail não entra no registro", async () => {
    rede(200, { id: "email_1" });

    await enviarEmail({ ...PEDIDO, referencia: `conta de ${ALUNA}` });

    expect(nossas(info)).toEqual(['[email] o e-mail "prova" (referência fora do formato) foi entregue ao Resend (email_1)']);
  });
});

describe("enviarEmail — quando dá errado, quem chamou segue e alguém fica sabendo", () => {
  it("o Resend recusa: devolve 'não enviado', sem lançar, e vira ALERTA com a referência e sem o destinatário", async () => {
    rede(422, { name: "validation_error", statusCode: 422, message: `Invalid \`to\` field: ${ALUNA}` });

    expect(await enviarEmail(PEDIDO)).toEqual({ enviado: false, motivo: "falhou" });

    expect(nossas(erro)).toEqual(['[email] o e-mail "prova" (conta:conta_1 evento:evt_1) não saiu: validation_error, status 422']);
    for (const linha of todasAsNossas()) {
      expect(linha).not.toContain(ALUNA);
      expect(linha).not.toContain("reservado");
    }
  });

  it("não espera o Resend para sempre: em 10 s desiste, sem lançar, e vira alerta", async () => {
    const controle = new AbortController();
    const tempoLimite = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controle.signal);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, rejeitar) => {
            init.signal?.addEventListener("abort", () => rejeitar(init.signal?.reason));
          }),
      ),
    );

    const envio = enviarEmail(PEDIDO);
    await vi.waitFor(() => expect(tempoLimite).toHaveBeenCalledWith(10_000));
    controle.abort(new DOMException("tempo esgotado", "TimeoutError"));

    expect(await envio).toEqual({ enviado: false, motivo: "falhou" });
    expect(nossas(erro)).toHaveLength(1);
  });

  it("sem rede: não lança, e vira alerta", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("fetch failed"))));

    expect(await enviarEmail(PEDIDO)).toEqual({ enviado: false, motivo: "falhou" });
    expect(nossas(erro)).toHaveLength(1);
  });

  it("um e-mail montado errado (botão sem http) não derruba quem chamou: não sai, e vira alerta", async () => {
    rede(200, { id: "nao_deveria" });

    const envio = await enviarEmail({ ...PEDIDO, mensagem: { ...PEDIDO.mensagem, botao: { texto: "Criar senha", endereco: "www.jilsonsantana.com/criar-senha" } } });

    expect(envio).toEqual({ enviado: false, motivo: "falhou" });
    expect(nossas(erro)).toEqual(['[email] o e-mail "prova" (conta:conta_1 evento:evt_1) não saiu: falha inesperada (Error)']);
    expect(naRede).toEqual([]);
  });

  it("só para UM endereço válido, como o da conta — o resto não sai", async () => {
    rede(200, { id: "nao_deveria" });

    for (const para of ["Fulano <outra@example.com>", `${ALUNA}, outra@example.com`, "Aluna@Example.com", ` ${ALUNA}`, "sem-arroba", `${"a".repeat(250)}@example.com`]) {
      expect(await enviarEmail({ ...PEDIDO, para })).toEqual({ enviado: false, motivo: "falhou" });
    }

    expect(naRede).toEqual([]);
    expect(nossas(erro)).toHaveLength(6);
    expect(nossas(erro)[0]).toBe('[email] o e-mail "prova" (conta:conta_1 evento:evt_1) não saiu: o destinatário não é um endereço único e válido');
  });

  it("a resposta sem o id do envio conta como falha", async () => {
    rede(200, null);

    expect(await enviarEmail(PEDIDO)).toEqual({ enviado: false, motivo: "falhou" });
    expect(nossas(erro)).toEqual(['[email] o e-mail "prova" (conta:conta_1 evento:evt_1) não saiu: o Resend respondeu sem o id do envio']);
  });

  it("duas entregas do mesmo aviso ao mesmo tempo: 'duplicado', não falha — e é aviso, não alerta", async () => {
    rede(409, { name: "concurrent_idempotent_requests", statusCode: 409, message: "outro em andamento" });

    expect(await enviarEmail({ ...PEDIDO, chave: "prova/evt_1" })).toEqual({ enviado: false, motivo: "duplicado" });
    expect(nossas(aviso)).toHaveLength(1);
    expect(nossas(erro)).toEqual([]);
  });

  it("sem a chave da conta: em PRODUÇÃO é alerta; fora dela, só aviso — e nada vai ao Resend", async () => {
    rede(200, { id: "nao_deveria" });
    delete process.env.RESEND_API_KEY;

    process.env.NODE_ENV = "production";
    expect(await enviarEmail(PEDIDO)).toEqual({ enviado: false, motivo: "falhou" });
    expect(nossas(erro)).toEqual(['[email] o e-mail "prova" (conta:conta_1 evento:evt_1) não saiu: falta a RESEND_API_KEY']);

    process.env.NODE_ENV = "test";
    expect(await enviarEmail(PEDIDO)).toEqual({ enviado: false, motivo: "falhou" });
    expect(nossas(aviso)).toHaveLength(1);
    expect(nossas(erro)).toHaveLength(1);

    expect(naRede).toEqual([]);
  });
});

describe("a porta única", () => {
  it("só o balcão (lib/email.ts) usa a biblioteca do Resend — em qualquer forma de import", () => {
    const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
    const arquivos = (readdirSync(raiz, { recursive: true }) as string[]).filter((f) => /\.(?:[mc]?ts|[mc]?js)$/.test(f));
    const usaResend = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']resend(?:\/[^"']*)?["']/;
    expect(arquivos.length).toBeGreaterThan(50);
    expect(arquivos.filter((f) => usaResend.test(readFileSync(join(raiz, f), "utf8")))).toEqual([join("lib", "email.ts")]);
  });
});
