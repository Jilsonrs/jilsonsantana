// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { avisoDeLegenda } from "./legenda-lembrada";

// O SCRIPT DA LEGENDA LEMBRADA (Bloco AULA, etapa 6, 07/10/2026). Ele não mora no site:
// o operador cola no HTML personalizado do player do Bunny, e o texto oficial é o do
// `docs/bunny.md`. Este teste roda ESSE texto, tirado do documento, num navegador
// simulado — se alguém mexer nele (ou no aviso que a página aceita) e os dois deixarem
// de combinar, reprova. O que ele protege:
//   - a mudança da legenda SEM um toque do aluno (o player se preparando) não avisa;
//   - com o toque, avisa "ligou" e "desligou", só para www.jilsonsantana.com;
//   - o aviso tem exatamente o formato que a página aceita (`avisoDeLegenda`).

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const doc = readFileSync(join(RAIZ, "docs", "bunny.md"), "utf8");
const bloco = doc.match(/```html\n([\s\S]*?jilsonsantana\.com — a legenda lembrada[\s\S]*?)```/)?.[1] ?? "";
const codigo = bloco
  .split("\n")
  .map((linha) => linha.replace(/^ {2}/, ""))
  .join("\n")
  .replace(/^\s*<script>\s*/, "")
  .replace(/\s*<\/script>\s*$/, "");

const enviado = vi.fn();
const tique = () => new Promise((r) => setTimeout(r, 0));
/** Roda o script como o player do Bunny rodaria, no `<head>` da página dele. */
// Seguro: o texto é o do documento do repositório, conferido pelo teste acima dele.
const rodarScript = () => new Function(codigo)();

beforeEach(() => {
  document.body.innerHTML = "";
  enviado.mockReset();
  // Na simulação a janela "de cima" é a própria: o envio é observado nela.
  vi.spyOn(window, "postMessage").mockImplementation(enviado);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("o script da legenda lembrada (o texto do bunny.md)", () => {
  it("o documento traz o script", () => {
    expect(codigo).toContain("mediasubtitlesshowing");
    expect(codigo).toContain('"https://www.jilsonsantana.com"');
  });

  it("sem toque do aluno, a legenda mudando (o player se preparando) não avisa nada", async () => {
    const controle = document.createElement("media-controller");
    document.body.append(controle);
    rodarScript();

    controle.setAttribute("mediasubtitlesshowing", "cc:pt:Português");
    await tique();
    controle.removeAttribute("mediasubtitlesshowing");
    await tique();

    expect(enviado).not.toHaveBeenCalled();
  });

  it("com o toque do aluno no CC: avisa 'ligou' e 'desligou', só para a escola, no formato que a página aceita", async () => {
    const controle = document.createElement("media-controller");
    document.body.append(controle);
    rodarScript();

    document.dispatchEvent(new Event("pointerdown"));
    controle.setAttribute("mediasubtitlesshowing", "cc:pt:Português");
    await tique();
    document.dispatchEvent(new Event("keydown"));
    controle.setAttribute("mediasubtitlesshowing", "");
    await tique();

    expect(enviado.mock.calls.map(([, destino]) => destino)).toEqual(["https://www.jilsonsantana.com", "https://www.jilsonsantana.com"]);
    const [ligou, desligou] = enviado.mock.calls.map(([dado]) => dado);
    const comoAPaginaRecebe = (data: unknown) => avisoDeLegenda({ origin: "https://iframe.mediadelivery.net", source: window, data }, window);
    expect(comoAPaginaRecebe(ligou)).toBe(true);
    expect(comoAPaginaRecebe(desligou)).toBe(false);
  });

  it("o toque de muito tempo atrás não conta", async () => {
    const controle = document.createElement("media-controller");
    document.body.append(controle);
    rodarScript();

    document.dispatchEvent(new Event("pointerdown"));
    vi.setSystemTime(new Date("2026-10-07T12:00:10Z"));
    controle.setAttribute("mediasubtitlesshowing", "cc:pt:Português");
    await tique();

    expect(enviado).not.toHaveBeenCalled();
  });

  it("o player que monta o controlador DEPOIS do script: ele espera e passa a ouvir", async () => {
    rodarScript();
    const controle = document.createElement("media-controller");
    document.body.append(controle);
    await tique();

    document.dispatchEvent(new Event("touchstart"));
    controle.setAttribute("mediasubtitlesshowing", "cc:pt:Português");
    await tique();

    expect(enviado).toHaveBeenCalledTimes(1);
  });
});
