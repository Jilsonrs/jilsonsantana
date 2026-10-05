// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HighlightIcon } from "./HighlightIcon";

// O ícone de um Destaque na página do curso (05/10/2026): os 55 de sempre saem
// na hora; os outros do Lucide chegam sob demanda; nome desconhecido vira o Brilho.
const desenho = (container: HTMLElement) => container.querySelector("svg")?.getAttribute("class") ?? "";

describe("HighlightIcon", () => {
  it("um dos 55 de sempre sai na hora, com o desenho do registro (não o do Lucide de mesmo nome)", () => {
    const { container } = render(<HighlightIcon token="wand" />);
    expect(desenho(container)).toContain("lucide-wand-sparkles");
  });

  it("um ícone novo chega sob demanda", async () => {
    const { container } = render(<HighlightIcon token="hard-hat" className="h-6 w-6" />);
    await waitFor(() => expect(desenho(container)).toContain("lucide-hard-hat"));
    expect(desenho(container)).toContain("h-6 w-6");
  });

  it("nome desconhecido vira o Brilho", async () => {
    const { container } = render(<HighlightIcon token="nao-existe" />);
    await waitFor(() => expect(desenho(container)).toContain("lucide-sparkles"));
  });
});
