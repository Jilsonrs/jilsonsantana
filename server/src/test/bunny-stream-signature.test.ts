import { describe, it, expect, afterEach } from "vitest";
import { assinaturaDeEnvio, enderecoAssinado, enderecoDoPlayer, interpretarEstado, tokenDoPlayer, VALIDADE_DO_PLAYER } from "../lib/bunny-stream.js";

// Unidade GENUÍNA (função pura, sem rede): a exceção que o CLAUDE.md → Testing
// permite. A assinatura errada não dá erro nenhum no nosso lado — o Bunny só
// recusa o envio. Por isso a ordem dos campos fica presa num valor conhecido.

describe("assinatura do envio retomável", () => {
  it("é SHA-256 de biblioteca + chave + validade + id, nessa ordem", () => {
    // Calculado uma vez, à parte, a partir da fórmula da doc do Bunny (27/09/2026).
    expect(assinaturaDeEnvio("762605", "chave-de-teste", 1790000000, "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe")).toBe(
      "0d6c3019117f5167b19edeb4803de8b54d87c9f4d20fd88e8cc1aff046ec0f32",
    );
  });

  it("muda quando muda o vídeo (uma assinatura não serve para outro)", () => {
    const a = assinaturaDeEnvio("762605", "k", 1, "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe");
    const b = assinaturaDeEnvio("762605", "k", 1, "00000000-0000-0000-0000-000000000000");
    expect(a).not.toBe(b);
  });
});

describe("endereço do player da apresentação", () => {
  const antes = { id: process.env.BUNNY_STREAM_INTRO_LIBRARY_ID, chave: process.env.BUNNY_STREAM_INTRO_API_KEY };
  afterEach(() => {
    process.env.BUNNY_STREAM_INTRO_LIBRARY_ID = antes.id;
    process.env.BUNNY_STREAM_INTRO_API_KEY = antes.chave;
  });

  it("sem a biblioteca configurada (o computador do operador): nenhum endereço", () => {
    delete process.env.BUNNY_STREAM_INTRO_LIBRARY_ID;
    delete process.env.BUNNY_STREAM_INTRO_API_KEY;
    expect(enderecoDoPlayer("apresentacao", "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe")).toBeNull();
  });

  it("configurada: o player do Bunny com a biblioteca e o vídeo", () => {
    process.env.BUNNY_STREAM_INTRO_LIBRARY_ID = "999";
    process.env.BUNNY_STREAM_INTRO_API_KEY = "k";
    expect(enderecoDoPlayer("apresentacao", "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe")).toBe(
      "https://iframe.mediadelivery.net/embed/999/eb1c4f77-0cda-46be-b47d-1118ad7c2ffe",
    );
    expect(enderecoDoPlayer("apresentacao", null)).toBeNull();
  });
});

describe("estado do vídeo no Bunny (a prévia do admin atualiza sozinha)", () => {
  it("pronto: status 4, ou processamento em 100%", () => {
    expect(interpretarEstado({ status: 4 })).toEqual({ pronto: true, falhou: false });
    expect(interpretarEstado({ status: 3, encodeProgress: 100 })).toEqual({ pronto: true, falhou: false });
  });

  it("ainda processando: nem 4 nem 100%", () => {
    expect(interpretarEstado({ status: 2, encodeProgress: 40 })).toEqual({ pronto: false, falhou: false });
    expect(interpretarEstado({ status: 1 })).toEqual({ pronto: false, falhou: false });
  });

  it("falhou: 5 ou envio que falhou (8)", () => {
    expect(interpretarEstado({ status: 5 }).falhou).toBe(true);
    expect(interpretarEstado({ status: 8 }).falhou).toBe(true);
  });

  it("resposta estranha (sem números) nunca vira pronto", () => {
    expect(interpretarEstado({ status: "4", encodeProgress: "100" })).toEqual({ pronto: false, falhou: false });
    expect(interpretarEstado({})).toEqual({ pronto: false, falhou: false });
  });
});

// O TOKEN DO PLAYER das aulas (Bloco U, etapa 3). Formato confirmado na doc via
// context7 em 28/09/2026: SHA256_HEX(token key + id do vídeo + expires). O valor
// esperado foi calculado FORA do nosso código (hashlib do Python), com a fórmula
// da doc — o teste não compara a função com ela mesma.
describe("token do player das aulas", () => {
  it("é SHA-256 de token key + id do vídeo + validade, nessa ordem", () => {
    expect(tokenDoPlayer("chave-de-token", "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe", 1790000000)).toBe(
      "8e8ef2555bfef9bde43d9baf16188e73f80f584bac0a04d75d67f69b672021aa",
    );
  });

  const antes = {
    id: process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID,
    chave: process.env.BUNNY_STREAM_LESSONS_API_KEY,
    token: process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY,
  };
  // Restaurar APAGANDO o que não existia: em Node, `process.env.X = undefined`
  // grava o TEXTO "undefined", e a biblioteca pareceria configurada depois.
  const restaurar = (nome: string, valor: string | undefined) =>
    valor === undefined ? delete process.env[nome] : (process.env[nome] = valor);
  afterEach(() => {
    restaurar("BUNNY_STREAM_LESSONS_LIBRARY_ID", antes.id);
    restaurar("BUNNY_STREAM_LESSONS_API_KEY", antes.chave);
    restaurar("BUNNY_STREAM_LESSONS_TOKEN_KEY", antes.token);
  });

  it("o endereço assinado leva o token e a validade de 6 h", () => {
    process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
    process.env.BUNNY_STREAM_LESSONS_API_KEY = "api";
    process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "chave-de-token";
    const agora = (1790000000 - VALIDADE_DO_PLAYER) * 1000;

    expect(enderecoAssinado("eb1c4f77-0cda-46be-b47d-1118ad7c2ffe", agora)).toBe(
      "https://iframe.mediadelivery.net/embed/762605/eb1c4f77-0cda-46be-b47d-1118ad7c2ffe" +
        "?token=8e8ef2555bfef9bde43d9baf16188e73f80f584bac0a04d75d67f69b672021aa&expires=1790000000",
    );
  });

  // A janela é de 6 a 12 h (Ago 2026): encurtar faz o vídeo parar no meio da aula.
  it("a validade fica dentro da janela decidida", () => {
    expect(VALIDADE_DO_PLAYER).toBeGreaterThanOrEqual(6 * 3600);
    expect(VALIDADE_DO_PLAYER).toBeLessThanOrEqual(12 * 3600);
  });

  it("sem a token key (ou sem a biblioteca): nenhum endereço", () => {
    process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
    process.env.BUNNY_STREAM_LESSONS_API_KEY = "api";
    delete process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY;
    expect(enderecoAssinado("eb1c4f77-0cda-46be-b47d-1118ad7c2ffe")).toBeNull();
    process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "k";
    delete process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID;
    expect(enderecoAssinado("eb1c4f77-0cda-46be-b47d-1118ad7c2ffe")).toBeNull();
  });
});
