// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { avisoDeLegenda } from "./legenda-lembrada";

// O SCRIPT DA LEGENDA LEMBRADA (Bloco AULA, etapa 6; refeito em 07/10/2026 para o player
// novo do Bunny). Ele não mora no site: o operador cola no HTML personalizado do player do
// Bunny, e o texto oficial é o do `docs/bunny.md`. Este teste roda ESSE texto, tirado do
// documento, num navegador simulado — se alguém mexer nele (ou no aviso que a página aceita)
// e os dois deixarem de combinar, reprova. O que ele protege:
//   - a legenda mudando SEM um pedido de quem assiste (o player abrindo com ela pelo
//     endereço) não avisa;
//   - o pedido do aluno (botão CC, menu, tecla C) avisa "ligou" ou "desligou", só para
//     www.jilsonsantana.com, UMA vez por clique, com o estado final;
//   - o aviso tem exatamente o formato que a página aceita (`avisoDeLegenda`).
// A simulação imita o player novo MEDIDO num Chrome de verdade em 07/10/2026 (bunny.md): o
// pedido sai do controle, subindo pela página; o player marca a legenda no atributo
// `mediasubtitlesshowing` do `media-controller` ~12 ms depois; e o "Desligado" do menu
// dispara dois pedidos seguidos.

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const doc = readFileSync(join(RAIZ, "docs", "bunny.md"), "utf8");
const bloco = doc.match(/```html\n([\s\S]*?jilsonsantana\.com — a legenda lembrada[\s\S]*?)```/)?.[1] ?? "";
const codigo = bloco
  .split("\n")
  .map((linha) => linha.replace(/^ {2}/, ""))
  .join("\n")
  .replace(/^\s*<script>\s*/, "")
  .replace(/\s*<\/script>\s*$/, "");

const ESCOLA = "https://www.jilsonsantana.com";
const PORTUGUES = "cc:pt:Portugu%C3%AAs";
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

let controle: HTMLElement;
let botao: HTMLElement;
/** O player marcando a legenda (ou nenhuma) — como ele faz ~12 ms depois de um pedido. */
const mostrar = (faixa: string | null) =>
  faixa ? controle.setAttribute("mediasubtitlesshowing", faixa) : controle.removeAttribute("mediasubtitlesshowing");
/** Um pedido de legenda saindo de um controle do player, subindo pela página (como o player faz). */
const pedido = (tipo: string, detail?: unknown) => botao.dispatchEvent(new CustomEvent(tipo, { bubbles: true, composed: true, detail }));
const esperar = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  document.body.innerHTML = "";
  controle = document.createElement("media-controller");
  botao = document.createElement("media-captions-button");
  controle.append(botao);
  document.body.append(controle);
  enviado.mockReset();
  // Na simulação a janela "de cima" é a própria: o envio é observado nela.
  vi.spyOn(window, "postMessage").mockImplementation(enviado);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  for (const [tipo, ouvinte, opcoes] of ouvintes.splice(0)) document.removeEventListener(tipo, ouvinte, opcoes);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("o script da legenda lembrada (o texto do bunny.md)", () => {
  it("o documento traz o script", () => {
    expect(codigo).toContain("mediatogglesubtitlesrequest");
    expect(codigo).toContain(`"${ESCOLA}"`);
  });

  it("o player abrindo com a legenda ligada, sem pedido de quem assiste, não avisa nada", () => {
    rodarScript();
    mostrar(PORTUGUES);
    esperar(1000);
    mostrar(null);
    esperar(1000);

    expect(enviado).not.toHaveBeenCalled();
  });

  it("o botão CC: avisa 'ligou' e 'desligou', só para a escola, depois de o player assentar, no formato que a página aceita", () => {
    rodarScript();

    pedido("mediatogglesubtitlesrequest");
    esperar(12);
    mostrar(PORTUGUES);
    expect(enviado).not.toHaveBeenCalled();
    esperar(400);
    pedido("mediatogglesubtitlesrequest");
    esperar(12);
    mostrar(null);
    esperar(400);

    expect(enviado.mock.calls.map(([, destino]) => destino)).toEqual([ESCOLA, ESCOLA]);
    const [ligou, desligou] = enviado.mock.calls.map(([dado]) => dado);
    const comoAPaginaRecebe = (data: unknown) => avisoDeLegenda({ origin: "https://player.mediadelivery.net", source: window, data }, window);
    expect(comoAPaginaRecebe(ligou)).toBe(true);
    expect(comoAPaginaRecebe(desligou)).toBe(false);
  });

  it("o 'Desligado' do menu (dois pedidos seguidos): UM aviso, com o estado final", () => {
    mostrar(PORTUGUES);
    rodarScript();

    pedido("mediadisablesubtitlesrequest", [{ kind: "captions", language: "pt", label: "Português" }]);
    esperar(1);
    pedido("mediashowsubtitlesrequest", "off");
    esperar(14);
    mostrar(null);
    esperar(400);

    expect(enviado).toHaveBeenCalledTimes(1);
    expect(enviado.mock.calls[0][0]).toEqual({ origem: "jilsonsantana-legenda", ligada: false });
  });

  it("o 'Português' do menu: avisa 'ligou'", () => {
    rodarScript();

    pedido("mediashowsubtitlesrequest", PORTUGUES);
    esperar(14);
    mostrar(PORTUGUES);
    esperar(400);

    expect(enviado).toHaveBeenCalledTimes(1);
    expect(enviado.mock.calls[0][0]).toEqual({ origem: "jilsonsantana-legenda", ligada: true });
  });
});
