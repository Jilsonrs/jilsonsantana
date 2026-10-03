// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { Salvos } from "@/lib/api";

const getSalvos = vi.fn();
const alternarSalvo = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getSalvos: (...args: unknown[]) => getSalvos(...args),
  alternarSalvo: (...args: unknown[]) => alternarSalvo(...args),
}));

import { SalvosPage } from "./SalvosPage";

// SALVOS (decisão do operador, 03/10/2026, "como no LinkedIn"): cursos e aulas
// salvos para depois, com os estados de carregando, erro e vazio; cada item tira
// dos salvos pelo mesmo botão da aula e do curso.

const CHEIO: Salvos = {
  cursos: [{ id: 1, slug: "excel", title: "Excel + IA", subtitle: null, level: null, thumbnailUrl: null }],
  aulas: [{ id: 11, title: "Abertura", kind: "VIDEO", curso: { slug: "excel", title: "Excel + IA" } }],
};

beforeEach(() => {
  getSalvos.mockReset().mockResolvedValue(CHEIO);
  alternarSalvo.mockReset().mockResolvedValue(undefined);
});

const abrir = () => renderWithProviders(<SalvosPage />, { route: "/aluno/salvos" });

describe("SalvosPage — estados", () => {
  it("carregando", () => {
    getSalvos.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Salvos" })).toBeTruthy();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    getSalvos.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os salvos.");
  });

  it("vazio: diz o que fazer", async () => {
    getSalvos.mockResolvedValue({ cursos: [], aulas: [] });
    abrir();
    expect(await screen.findByText("Nada salvo ainda. Salve aulas e cursos para assistir depois.")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });
});

describe("SalvosPage — a lista", () => {
  it("o curso leva à primeira aula; a aula, à página dela, com o nome do curso", async () => {
    abrir();
    await screen.findByRole("heading", { level: 2, name: "Cursos" });
    expect(screen.queryByText("Nada salvo ainda. Salve aulas e cursos para assistir depois.")).toBeNull();

    // Os cursos primeiro, depois as aulas.
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/aluno/curso/excel", "/aluno/aula/11"]);
    const aula = screen.getByRole("link", { name: /Abertura/ });
    expect(aula.getAttribute("href")).toBe("/aluno/aula/11");
    expect(aula.textContent).toContain("Excel + IA");
  });

  it("tirar dos salvos: o curso e a aula, pelo botão de cada um", async () => {
    abrir();
    const aula = await screen.findByRole("button", { name: "Salvar para depois: Abertura" });
    const curso = screen.getByRole("button", { name: "Salvar curso: Excel + IA" });
    expect(aula.getAttribute("aria-pressed")).toBe("true");
    expect(curso.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(aula);
    await waitFor(() => expect(alternarSalvo).toHaveBeenCalledWith("aulas", 11, false));
    fireEvent.click(curso);
    await waitFor(() => expect(alternarSalvo).toHaveBeenCalledWith("cursos", 1, false));
  });

  it("só aulas salvas: sem a seção de cursos", async () => {
    getSalvos.mockResolvedValue({ cursos: [], aulas: CHEIO.aulas });
    abrir();
    const aulas = await screen.findByRole("heading", { level: 2, name: "Aulas" });
    expect(aulas).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "Cursos" })).toBeNull();
    expect(screen.getByRole("link", { name: /Abertura/ })).toBeTruthy();
  });
});
