// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErroDaTela } from "./ErroDaTela";
import { pagina } from "@/lib/recarregar";

// A TELA DE ERRO no lugar da página em branco (05/10/2026).

function Quebra({ erro }: { erro: Error }): never {
  throw erro;
}

let recarregou: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  sessionStorage.clear();
  recarregou = vi.spyOn(pagina, "recarregar").mockImplementation(() => {});
  // O React anuncia o erro no console; o teste não precisa do barulho.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("ErroDaTela", () => {
  it("tela que quebra: a mensagem e o botão no lugar do branco; o botão recarrega", () => {
    render(
      <ErroDaTela chave="/aluno/aula/1">
        <Quebra erro={new Error("Cannot read properties of undefined")} />
      </ErroDaTela>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Algo deu errado ao abrir esta tela.");
    expect(recarregou).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recarregar a página" }));
    expect(recarregou).toHaveBeenCalledTimes(1);
  });

  it("pedaço do app de uma versão anterior: recarrega sozinho, uma vez", () => {
    render(
      <ErroDaTela chave="/aluno/aula/1">
        <Quebra erro={new TypeError("Failed to fetch dynamically imported module: /assets/MarkdownText-velho.js")} />
      </ErroDaTela>,
    );
    expect(recarregou).toHaveBeenCalledTimes(1);
  });

  it("trocar de tela limpa o erro", () => {
    const { rerender } = render(
      <ErroDaTela chave="/aluno/aula/1">
        <Quebra erro={new Error("x")} />
      </ErroDaTela>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    rerender(
      <ErroDaTela chave="/aluno/aula/2">
        <p>a outra aula</p>
      </ErroDaTela>,
    );
    expect(screen.getByText("a outra aula")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
