import { describe, it, expect, afterEach } from "vitest";
import {
  assinaturaDeEnvio,
  enderecoAssinado,
  interpretarEstado,
  interpretarResumo,
  duracaoDoVideo,
  tokenDoPlayer,
  VALIDADE_DO_PLAYER,
} from "../lib/bunny-stream.js";

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

// O TOKEN DO PLAYER (Bloco U, etapa 3) — de aula e de apresentação, que desde
// 28/09/2026 moram na MESMA biblioteca, com token (decisão do operador). Formato confirmado na doc via
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

  const configurar = () => {
    process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
    process.env.BUNNY_STREAM_LESSONS_API_KEY = "api";
    process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "chave-de-token";
  };

  it("o endereço assinado leva o token e a validade", () => {
    configurar();
    const agora = (1790000000 - VALIDADE_DO_PLAYER) * 1000;

    expect(enderecoAssinado("eb1c4f77-0cda-46be-b47d-1118ad7c2ffe", { tocarAoAbrir: true }, agora)).toBe(
      "https://iframe.mediadelivery.net/embed/762605/eb1c4f77-0cda-46be-b47d-1118ad7c2ffe" +
        "?token=8e8ef2555bfef9bde43d9baf16188e73f80f584bac0a04d75d67f69b672021aa&expires=1790000000&autoplay=true",
    );
  });

  // A aula toca sozinha; a apresentação abre pausada (decisão do operador,
  // 03/10/2026). O token é o mesmo nos dois: o `autoplay` não entra na assinatura.
  it("tocar ao abrir vai no endereço, sem mudar o token", () => {
    configurar();
    const agora = (1790000000 - VALIDADE_DO_PLAYER) * 1000;
    const id = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";

    const aula = enderecoAssinado(id, { tocarAoAbrir: true }, agora);
    const apresentacao = enderecoAssinado(id, { tocarAoAbrir: false }, agora);

    expect(aula).toMatch(/&autoplay=true$/);
    expect(apresentacao).toMatch(/&autoplay=false$/);
    expect(aula?.replace("&autoplay=true", "")).toBe(apresentacao?.replace("&autoplay=false", ""));
  });

  // 24 h para todo vídeo (operador, 28/09/2026, depois de comparar Bunny, Mux,
  // Cloudflare e plataformas de curso). Encurtar faz o aluno recarregar a página
  // depois de uma pausa longa; a proteção da aula é a trava de acesso.
  it("a validade é de 24 h", () => {
    expect(VALIDADE_DO_PLAYER).toBe(24 * 3600);
  });

  it("sem a token key (ou sem a biblioteca): nenhum endereço", () => {
    process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID = "762605";
    process.env.BUNNY_STREAM_LESSONS_API_KEY = "api";
    delete process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY;
    expect(enderecoAssinado("eb1c4f77-0cda-46be-b47d-1118ad7c2ffe", { tocarAoAbrir: true })).toBeNull();
    process.env.BUNNY_STREAM_LESSONS_TOKEN_KEY = "k";
    delete process.env.BUNNY_STREAM_LESSONS_LIBRARY_ID;
    expect(enderecoAssinado("eb1c4f77-0cda-46be-b47d-1118ad7c2ffe", { tocarAoAbrir: true })).toBeNull();
  });
});

// O RESUMO do vídeo no editor (como a Udemy: miniatura, nome, duração — operador,
// 28/09/2026). O que protege: a miniatura só existe com o vídeo PRONTO, e nada
// torto que venha do Bunny ou da variável vira pedaço de endereço.
describe("resumo do vídeo da aula", () => {
  const ID = "eb1c4f77-0cda-46be-b47d-1118ad7c2ffe";
  const HOST = "vz-a1b2c3d4-e5f.b-cdn.net";
  const pronto = { status: 4, title: "iniciando-o-curso.mp4", length: 111, thumbnailFileName: "thumbnail.jpg" };

  it("pronto: nome, duração e a miniatura no CDN da biblioteca", () => {
    expect(interpretarResumo(ID, pronto, HOST)).toEqual({
      pronto: true,
      falhou: false,
      nome: "iniciando-o-curso.mp4",
      duracaoEmSegundos: 111,
      miniaturaUrl: `https://${HOST}/${ID}/thumbnail.jpg`,
    });
  });

  it("ainda processando: sem miniatura (ela ainda não existe)", () => {
    expect(interpretarResumo(ID, { ...pronto, status: 2, encodeProgress: 40 }, HOST).miniaturaUrl).toBeNull();
  });

  it("sem o endereço das miniaturas, ou com um endereço torto: sem miniatura", () => {
    expect(interpretarResumo(ID, pronto, undefined).miniaturaUrl).toBeNull();
    expect(interpretarResumo(ID, pronto, "evil.com/x?").miniaturaUrl).toBeNull();
    expect(interpretarResumo(ID, pronto, "https://vz-a.b-cdn.net").miniaturaUrl).toBeNull();
  });

  it("nome de miniatura torto vira o padrão, nunca um caminho", () => {
    const resumo = interpretarResumo(ID, { ...pronto, thumbnailFileName: "../../outro/segredo.jpg" }, HOST);
    expect(resumo.miniaturaUrl).toBe(`https://${HOST}/${ID}/thumbnail.jpg`);
    expect(interpretarResumo(ID, { ...pronto, thumbnailFileName: "thumbnail_2.jpg" }, HOST).miniaturaUrl).toBe(
      `https://${HOST}/${ID}/thumbnail_2.jpg`,
    );
  });

  it("duração e nome só valem com o formato certo", () => {
    const torto = interpretarResumo(ID, { status: 4, title: 123, length: "111" }, HOST);
    expect(torto.nome).toBeNull();
    expect(torto.duracaoEmSegundos).toBeNull();
    expect(interpretarResumo(ID, { ...pronto, length: 0 }, HOST).duracaoEmSegundos).toBeNull();
    expect(interpretarResumo(ID, { ...pronto, length: 110.6 }, HOST).duracaoEmSegundos).toBe(111);
  });
});

// A duração que o Bunny informa (`length`, em segundos, inteiro — doc de
// 29/09/2026). Só número positivo vale: vira a soma do topo do editor.
describe("duracaoDoVideo", () => {
  it("lê o length em segundos", () => {
    expect(duracaoDoVideo({ length: 754 })).toBe(754);
    expect(duracaoDoVideo({ length: 12.6 })).toBe(13);
  });

  it("sem duração de verdade, devolve vazio", () => {
    for (const length of [0, -5, "754", null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(duracaoDoVideo({ length }), String(length)).toBeNull();
    }
  });
});
