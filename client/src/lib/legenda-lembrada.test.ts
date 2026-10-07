import { describe, it, expect } from "vitest";
import { avisoDeLegenda } from "./legenda-lembrada";

// O AVISO DE LEGENDA (Bloco AULA, etapa 6 — decisão do operador, 07/10/2026). A
// mensagem chega pelo navegador, e qualquer página aberta pode mandar uma: ela é dado
// NÃO CONFIÁVEL. Função pura — o que estes testes protegem é que só vale o aviso do
// nosso script, vindo do player desta moldura, na origem do Bunny.

// Seguro: o teste só compara a identidade da janela; nenhum método dela é usado.
const janelaDoPlayer = {} as Window;
const outraJanela = {} as Window;
const doPlayer = (data: unknown, origin = "https://iframe.mediadelivery.net", source: Window = janelaDoPlayer) => ({ origin, source, data });

describe("o aviso de legenda", () => {
  it("o nosso script, do player desta moldura: ligou e desligou", () => {
    expect(avisoDeLegenda(doPlayer({ origem: "jilsonsantana-legenda", ligada: true }), janelaDoPlayer)).toBe(true);
    expect(avisoDeLegenda(doPlayer({ origem: "jilsonsantana-legenda", ligada: false }), janelaDoPlayer)).toBe(false);
    // O endereço novo do player, da doc do Bunny, também.
    expect(avisoDeLegenda(doPlayer({ origem: "jilsonsantana-legenda", ligada: true }, "https://player.mediadelivery.net"), janelaDoPlayer)).toBe(true);
  });

  it("de outra moldura, de outra origem, ou sem a moldura: ignorado", () => {
    const certo = { origem: "jilsonsantana-legenda", ligada: true };
    expect(avisoDeLegenda(doPlayer(certo, "https://iframe.mediadelivery.net", outraJanela), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer(certo, "https://evil.example"), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer(certo, "https://iframe.mediadelivery.net.evil.example"), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer(certo), null)).toBeNull();
  });

  it("formato estranho: ignorado (inclusive as mensagens do player.js, que são texto)", () => {
    expect(avisoDeLegenda(doPlayer('{"context":"player.js","event":"timeupdate"}'), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer({ origem: "outra-coisa", ligada: true }), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer({ origem: "jilsonsantana-legenda", ligada: "sim" }), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer({ origem: "jilsonsantana-legenda" }), janelaDoPlayer)).toBeNull();
    expect(avisoDeLegenda(doPlayer(null), janelaDoPlayer)).toBeNull();
  });
});
