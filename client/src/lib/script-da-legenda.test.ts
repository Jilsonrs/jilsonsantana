// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { avisoDeLegenda } from "./legenda-lembrada";

// O SCRIPT DA LEGENDA LEMBRADA (Bloco AULA, etapa 6; refeito em 07/10/2026 para o player
// que o Bunny serve de verdade, o PLYR). Ele não mora no site: o operador cola no HTML
// personalizado do player do Bunny, e o texto oficial é o do `docs/bunny.md`. Este teste
// roda ESSE texto, tirado do documento, num navegador simulado — se alguém mexer nele (ou
// no aviso que a página aceita) e os dois deixarem de combinar, reprova. O que ele protege:
//   - a memória de legenda do próprio player neste aparelho sai antes de ele começar (quem
//     decide é a conta), e o resto do que ele lembra (volume) fica;
//   - a mudança da legenda SEM um toque do aluno (o player se preparando) não avisa;
//   - com o toque, avisa "ligou" e "desligou", só para www.jilsonsantana.com, UMA vez por
//     clique, com o estado final (o menu do player liga e desliga mais de uma vez num clique);
//   - o aviso tem exatamente o formato que a página aceita (`avisoDeLegenda`).
// Os eventos imitam o Plyr do Bunny, MEDIDO num Chrome de verdade em 07/10/2026 (bunny.md):
// cada mudança sai duas vezes — no vídeo, sem subir, e repetida na moldura do player, subindo —,
// e o "Desativado" do menu dispara desligou → (14 ms) → ligou, desligou.

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const doc = readFileSync(join(RAIZ, "docs", "bunny.md"), "utf8");
const bloco = doc.match(/```html\n([\s\S]*?jilsonsantana\.com — a legenda lembrada[\s\S]*?)```/)?.[1] ?? "";
const codigo = bloco
  .split("\n")
  .map((linha) => linha.replace(/^ {2}/, ""))
  .join("\n")
  .replace(/^\s*<script>\s*/, "")
  .replace(/\s*<\/script>\s*$/, "");

const MEMORIA_DO_PLAYER = "plyr--lib-762605";
const ESCOLA = "https://www.jilsonsantana.com";
const enviado = vi.fn();
// O que o script passou a ouvir na página: sai depois de cada teste, senão o script de um
// teste continua ouvindo (e avisando) no seguinte.
const ouvintes: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = [];
/** Roda o script como o player do Bunny rodaria, no `<head>` da página dele. */
const rodarScript = () => {
  const ouvir = document.addEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation((tipo, ouvinte, opcoes) => {
    ouvintes.push([tipo, ouvinte, opcoes]);
    ouvir(tipo, ouvinte, opcoes);
  });
  // Seguro: o texto é o do documento do repositório, conferido pelo primeiro teste.
  new Function(codigo)();
};

let moldura: HTMLDivElement;
let video: HTMLVideoElement;
/** O Plyr avisando que a legenda mudou: no vídeo (sem subir) e na moldura dele (subindo). */
const plyr = (ligada: boolean) => {
  const tipo = ligada ? "captionsenabled" : "captionsdisabled";
  video.dispatchEvent(new CustomEvent(tipo));
  moldura.dispatchEvent(new CustomEvent(tipo, { bubbles: true }));
};
const toque = (tipo = "pointerdown") => document.dispatchEvent(new Event(tipo));
const assentar = () => vi.advanceTimersByTime(400);

beforeEach(() => {
  document.body.innerHTML = "";
  moldura = document.createElement("div");
  video = document.createElement("video");
  moldura.append(video);
  document.body.append(moldura);
  localStorage.clear();
  enviado.mockReset();
  // Na simulação a janela "de cima" é a própria: o envio é observado nela.
  vi.spyOn(window, "postMessage").mockImplementation(enviado);
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
});

afterEach(() => {
  for (const [tipo, ouvinte, opcoes] of ouvintes.splice(0)) document.removeEventListener(tipo, ouvinte, opcoes);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("o script da legenda lembrada (o texto do bunny.md)", () => {
  it("o documento traz o script", () => {
    expect(codigo).toContain("captionsenabled");
    expect(codigo).toContain(`"${ESCOLA}"`);
  });

  it("apaga a memória de legenda do player neste aparelho e deixa o resto", () => {
    localStorage.setItem(MEMORIA_DO_PLAYER, JSON.stringify({ captions: true, language: "en", volume: 0.4 }));
    localStorage.setItem("outra-coisa", JSON.stringify({ captions: true }));
    localStorage.setItem("plyr-quebrado", "{não é json");
    rodarScript();

    expect(JSON.parse(localStorage.getItem(MEMORIA_DO_PLAYER) ?? "null")).toEqual({ volume: 0.4 });
    expect(JSON.parse(localStorage.getItem("outra-coisa") ?? "null")).toEqual({ captions: true });
    expect(localStorage.getItem("plyr-quebrado")).toBe("{não é json");
  });

  it("sem toque do aluno, a legenda mudando (o player se preparando) não avisa nada", () => {
    rodarScript();
    plyr(true);
    plyr(false);
    assentar();

    expect(enviado).not.toHaveBeenCalled();
  });

  it("com o toque do aluno no CC: avisa 'ligou' e 'desligou', só para a escola, no formato que a página aceita", () => {
    rodarScript();

    toque();
    plyr(true);
    expect(enviado).not.toHaveBeenCalled();
    assentar();
    toque("keydown");
    plyr(false);
    assentar();

    expect(enviado.mock.calls.map(([, destino]) => destino)).toEqual([ESCOLA, ESCOLA]);
    const [ligou, desligou] = enviado.mock.calls.map(([dado]) => dado);
    const comoAPaginaRecebe = (data: unknown) => avisoDeLegenda({ origin: "https://iframe.mediadelivery.net", source: window, data }, window);
    expect(comoAPaginaRecebe(ligou)).toBe(true);
    expect(comoAPaginaRecebe(desligou)).toBe(false);
  });

  it("o menu do player desligando, ligando e desligando num clique só: UM aviso, com o estado final", () => {
    rodarScript();

    toque();
    plyr(false);
    vi.advanceTimersByTime(14);
    plyr(true);
    plyr(false);
    assentar();

    expect(enviado).toHaveBeenCalledTimes(1);
    expect(enviado.mock.calls[0][0]).toEqual({ origem: "jilsonsantana-legenda", ligada: false });
  });

  it("o toque de muito tempo atrás não conta", () => {
    rodarScript();

    toque("touchstart");
    vi.setSystemTime(new Date("2026-10-07T12:00:10Z"));
    plyr(true);
    assentar();

    expect(enviado).not.toHaveBeenCalled();
  });

  it("com o armazenamento da moldura bloqueado (Chrome, em algumas configurações), continua avisando", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("bloqueado", "SecurityError");
      },
    });
    try {
      rodarScript();
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
    }

    toque();
    plyr(true);
    assentar();

    expect(enviado).toHaveBeenCalledTimes(1);
  });
});
