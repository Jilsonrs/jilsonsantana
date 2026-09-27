import { describe, it, expect, afterEach } from "vitest";
import { assinaturaDeEnvio, enderecoDoPlayer } from "../lib/bunny-stream.js";

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
