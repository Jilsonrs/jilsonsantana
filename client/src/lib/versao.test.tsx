// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import {
  VERSAO_DESTE_APP,
  anotarVersaoDoServidor,
  desviarLinksQuandoHouverVersaoNova,
  esquecerVersaoDoServidor,
  haVersaoNova,
  PEDACOS_DO_ALUNO,
  preCarregarPedacosDoAluno,
} from "./versao";
import { aoFalhar, aoResponder } from "./api";

// ATUALIZAR O SITE SEM ATRAPALHAR QUEM ESTÁ ESTUDANDO (decisão do operador,
// 06/10/2026 — "recarrega só se houver versão nova", como o Next.js).

beforeEach(() => esquecerVersaoDoServidor());
afterEach(() => vi.restoreAllMocks());

describe("a versão do servidor", () => {
  it("sem informação, ou a mesma versão: nada muda; outra versão: há versão nova", () => {
    expect(haVersaoNova()).toBe(false);
    anotarVersaoDoServidor(VERSAO_DESTE_APP);
    expect(haVersaoNova()).toBe(false);
    anotarVersaoDoServidor("outra-versao");
    expect(haVersaoNova()).toBe(true);
  });

  it("cabeçalho ausente não apaga o que já se sabe", () => {
    anotarVersaoDoServidor("outra-versao");
    anotarVersaoDoServidor(undefined);
    expect(haVersaoNova()).toBe(true);
  });

  it("toda resposta da API anota a versão — a boa e a de erro", async () => {
    aoResponder({ headers: { "x-versao-do-app": "outra-versao" } });
    expect(haVersaoNova()).toBe(true);

    esquecerVersaoDoServidor();
    const headers = new AxiosHeaders({ "x-versao-do-app": "outra-versao" });
    const erro = new AxiosError("404", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers,
      config: { headers },
      data: {},
    });
    await expect(aoFalhar(erro)).rejects.toBe(erro);
    expect(haVersaoNova()).toBe(true);
  });
});

function Onde() {
  return <p data-testid="onde">{useLocation().pathname}</p>;
}

function abrirComUmLink() {
  render(
    <MemoryRouter initialEntries={["/aluno/aula/1"]}>
      <Link to="/aluno/aula/2">Próxima aula</Link>
      <Routes>
        <Route path="*" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("os links", () => {
  let desligar: () => void;
  beforeEach(() => {
    desligar = desviarLinksQuandoHouverVersaoNova();
    // O jsdom avisa que não navega de verdade; o teste não precisa do barulho.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => desligar());

  it("sem versão nova: o app troca a tela por dentro, como hoje", () => {
    abrirComUmLink();
    fireEvent.click(screen.getByRole("link", { name: "Próxima aula" }));
    expect(screen.getByTestId("onde").textContent).toBe("/aluno/aula/2");
  });

  it("com versão nova: o clique não chega ao app, e o navegador segue o link carregando a página", () => {
    anotarVersaoDoServidor("outra-versao");
    abrirComUmLink();
    const seguiu = fireEvent.click(screen.getByRole("link", { name: "Próxima aula" }));
    expect(seguiu).toBe(true); // o navegador não foi impedido: ele carrega a página nova
    expect(screen.getByTestId("onde").textContent).toBe("/aluno/aula/1"); // o app não trocou por dentro
  });

  it("com versão nova, clique com Ctrl (nova aba) segue como sempre", () => {
    anotarVersaoDoServidor("outra-versao");
    abrirComUmLink();
    fireEvent.click(screen.getByRole("link", { name: "Próxima aula" }), { ctrlKey: true });
    expect(screen.getByTestId("onde").textContent).toBe("/aluno/aula/1");
  });
});

describe("o pré-carregamento do que o aluno usa", () => {
  it("baixa os pedaços num momento ocioso, não antes", () => {
    vi.useFakeTimers();
    const pedaco = vi.fn(() => Promise.resolve());
    // Sem requestIdleCallback (como no jsdom), espera alguns segundos.
    preCarregarPedacosDoAluno([pedaco]);
    expect(pedaco).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(pedaco).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("a lista inclui o leitor de texto da aula de texto", async () => {
    const modulos = await Promise.all(PEDACOS_DO_ALUNO.map((pedaco) => pedaco()));
    expect(modulos.some((m) => typeof (m as { MarkdownText?: unknown }).MarkdownText === "function")).toBe(true);
  });
});
