import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import http from "node:http";
import express from "express";
import request from "supertest";
import type { Dict } from "@jilson/core";

// O dicionário na NOSSA fronteira: é o que deixa a home FALHAR de verdade, pela rota de verdade.
let cair = false;
vi.mock("../lib/dict.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../lib/dict.js")>();
  return { ...real, getDict: (idioma: Parameters<typeof real.getDict>[0]): Promise<Dict> => (cair ? Promise.reject(new Error("o dicionário caiu")) : real.getDict(idioma)) };
});

import servidor from "./servidor.js";
import { anotarErroDoSite } from "../lib/erro-do-site.js";

// O ERRO FORA DE `/api` (`lib/erro-do-site.ts` — o alerta de erro, Fase 7). O que protege:
//   - a home (ou outra página pública) que quebra deixa uma linha de erro COM ETIQUETA — é a
//     etiqueta que a faz virar alerta (`lib/monitor.ts`); sem ela, só o visitante descobriria;
//   - a resposta continua sendo a de sempre do Express: este tratador só anota e passa adiante;
//   - o que não é defeito nosso (erro que já vem com 4xx) não é anotado.

let registro: MockInstance<typeof console.error>;
const linhas = () => registro.mock.calls.flat().join("\n");

beforeEach(() => {
  cair = false;
  registro = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => registro.mockRestore());

describe("a página pública que quebra", () => {
  it("a home falhando: 500, e a linha de erro leva a etiqueta [site], o endereço sem o \"?\" e o erro", async () => {
    cair = true;
    const res = await request(servidor).get("/?utm_source=nao_vai_para_o_registro");
    expect(res.status).toBe(500);
    expect(linhas()).toContain("[site] GET / falhou");
    expect(linhas()).toContain("o dicionário caiu");
    expect(linhas()).not.toContain("nao_vai_para_o_registro");
  });

  it("a home funcionando não anota nada", async () => {
    expect((await request(servidor).get("/")).status).toBe(200);
    expect(linhas()).not.toContain("[site]");
  });
});

describe("o tratador, sozinho", () => {
  /** Um app mínimo, em 127.0.0.1 como o servidor dos testes: uma rota que lança o que o teste pedir. */
  async function comOErro(erro: unknown, fn: (escuta: http.Server) => Promise<void>) {
    const mini = express();
    mini.get("/pagina", () => {
      throw erro;
    });
    mini.use(anotarErroDoSite);
    // Quem vem DEPOIS recebe o erro de verdade: este tratador não responde nem engole.
    const depois: express.ErrorRequestHandler = (recebido, _req, res, _next) => {
      res.status(recebido === erro ? 599 : 598).end();
    };
    mini.use(depois);
    const escuta = http.createServer(mini);
    await new Promise<void>((pronto) => escuta.listen(0, "127.0.0.1", () => pronto()));
    try {
      await fn(escuta);
    } finally {
      await new Promise((fechou) => escuta.close(fechou));
    }
  }

  it("anota e PASSA ADIANTE o mesmo erro: a resposta é de quem vem depois", async () => {
    await comOErro(new Error("quebrou ao montar a página"), async (escuta) => {
      expect((await request(escuta).get("/pagina?x=1")).status).toBe(599);
      expect(linhas()).toContain("[site] GET /pagina falhou");
      expect(linhas()).toContain("quebrou ao montar a página");
    });
  });

  it("o erro que já vem com 4xx não é defeito nosso: passa adiante sem anotar", async () => {
    for (const status of [400, 404, 416]) {
      await comOErro(Object.assign(new Error("pedido ruim"), { status }), async (escuta) => {
        expect((await request(escuta).get("/pagina")).status).toBe(599);
      });
    }
    expect(linhas()).toBe("");
  });

  it("o erro com status 5xx, ou sem status, é anotado — e o que não é um Error também", async () => {
    await comOErro(Object.assign(new Error("fora do ar"), { status: 503 }), async (escuta) => {
      await request(escuta).get("/pagina");
    });
    await comOErro({ qualquer: "coisa" }, async (escuta) => {
      await request(escuta).get("/pagina");
    });
    expect(linhas()).toContain("fora do ar");
    expect(linhas()).toContain("erro que não é Error (object)");
  });
});
