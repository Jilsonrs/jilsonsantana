// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownText } from "./MarkdownText";

// A descrição do curso aceita negrito, itálico e listas (decisão do operador,
// 27/09/2026). O que estes testes protegem é o outro lado: o texto vem do painel
// e vai para a tela, então nada do que se digita pode virar HTML, link ou imagem.

describe("MarkdownText", () => {
  it("negrito, itálico e as duas listas viram formatação de verdade", () => {
    const { container } = render(
      <MarkdownText texto={"Um **forte** e um _leve_.\n\n- um\n- dois\n\n1. primeiro\n2. segundo"} />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("forte");
    expect(container.querySelector("em")?.textContent).toBe("leve");
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
  });

  it("HTML digitado aparece como texto e não cria nenhum elemento", () => {
    const { container } = render(
      <MarkdownText texto={'Oi <script>alert(1)</script> <img src="x" onerror="alert(1)"> <b>b</b>'} />,
    );

    expect(container.querySelector("script, img, b")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("link e imagem não saem: o texto do link fica, sem endereço", () => {
    const { container } = render(
      <MarkdownText texto={"[clique](javascript:alert(1)) [site](https://outro.com) ![foto](https://outro.com/x.png)"} />,
    );

    expect(container.querySelector("a, img")).toBeNull();
    expect(screen.getByText(/clique/).textContent).toContain("site");
  });

  it("título, código e citação ficam como texto comum", () => {
    const { container } = render(<MarkdownText texto={"# Grande\n\n`codigo`\n\n> citado"} />);

    expect(container.querySelector("h1, code, pre, blockquote")).toBeNull();
    expect(container.textContent).toContain("Grande");
    expect(container.textContent).toContain("codigo");
    expect(container.textContent).toContain("citado");
  });
});
