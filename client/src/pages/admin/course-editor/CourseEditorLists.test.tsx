// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminCourseDetail } from "@/lib/api";
import { CURSO_DE_TESTE } from "./curso-de-teste";

const adminGetCourse = vi.fn();
const updateCourse = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetCourse: (...args: unknown[]) => adminGetCourse(...args),
  updateCourse: (...args: unknown[]) => updateCourse(...args),
}));

import { CourseEditorLayout } from "./CourseEditorLayout";
import { ROTAS_DO_EDITOR } from "./steps";

// AS TRÊS LISTAS do passo "Para quem é": um campo por item, com contador,
// lixeira e setas; até 160 caracteres cada (decisões do operador, 28/09/2026).

beforeEach(() => {
  adminGetCourse.mockReset();
  updateCourse.mockReset().mockResolvedValue(CURSO_DE_TESTE);
});

const APRENDER = "O que vai aprender (learnTags)";
const item = (lista: string, n: number) => screen.getByLabelText(`${lista}, item ${n}`) as HTMLInputElement;

async function abrir(curso: Partial<AdminCourseDetail> = {}) {
  adminGetCourse.mockResolvedValue({ ...CURSO_DE_TESTE, ...curso });
  renderWithProviders(<CourseEditorLayout />, {
    route: "/admin/cursos/1/para-quem-e",
    path: "/admin/cursos/:id",
    filhas: ROTAS_DO_EDITOR,
  });
  await screen.findByLabelText(`${APRENDER}, item 1`);
}

async function salvarEPegar() {
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await waitFor(() => expect(updateCourse).toHaveBeenCalled());
  return updateCourse.mock.calls[0][1] as Record<string, string[]>;
}

describe("Para quem é — um campo por item", () => {
  it("cada item gravado vira um campo, na ordem", async () => {
    await abrir({ learnTags: ["PROCX", "Tabelas dinâmicas"] });
    expect(item(APRENDER, 1).value).toBe("PROCX");
    expect(item(APRENDER, 2).value).toBe("Tabelas dinâmicas");
  });

  // Lista vazia abre com um campo em branco, que não vai no envio.
  it("lista vazia abre com um campo em branco, e campo em branco não é enviado", async () => {
    await abrir({ requirements: [] });
    expect(item("Pré-requisitos", 1).value).toBe("");

    expect((await salvarEPegar()).requirements).toEqual([]);
  });

  it("adicionar item: um campo novo no fim, e ele vai no envio", async () => {
    await abrir();
    fireEvent.click(screen.getAllByRole("button", { name: "Adicionar item" })[0]);
    fireEvent.change(item(APRENDER, 2), { target: { value: "Fórmulas" } });

    expect((await salvarEPegar()).learnTags).toEqual(["PROCX", "Fórmulas"]);
  });

  it("remover item: ele sai do envio", async () => {
    await abrir({ learnTags: ["A", "B", "C"] });
    fireEvent.click(screen.getAllByRole("button", { name: "Remover o item 2" })[0]);

    expect((await salvarEPegar()).learnTags).toEqual(["A", "C"]);
  });

  it("as setas mudam a ordem que vai no envio", async () => {
    await abrir({ learnTags: ["A", "B", "C"] });
    fireEvent.click(screen.getAllByRole("button", { name: "Descer o item 1" })[0]);

    expect((await salvarEPegar()).learnTags).toEqual(["B", "A", "C"]);
  });

  it("o primeiro não sobe e o último não desce", async () => {
    await abrir({ learnTags: ["A", "B"] });
    expect((screen.getAllByRole("button", { name: "Subir o item 1" })[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByRole("button", { name: "Descer o item 2" })[0] as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Para quem é — 160 caracteres por item", () => {
  it("o contador acompanha, e o campo trava em 160", async () => {
    await abrir();
    expect(item(APRENDER, 1).getAttribute("maxlength")).toBe("160");
    expect(screen.getByText("5/160")).toBeTruthy();

    fireEvent.change(item(APRENDER, 1), { target: { value: "PROCX e XLOOKUP" } });
    expect(screen.getByText("15/160")).toBeTruthy();
    // O contador é a descrição do campo: o leitor de tela ouve os números.
    expect(item(APRENDER, 1).getAttribute("aria-describedby")).toBe("learnTags-0-contador");
  });

  // Curso gravado antes do limite: o aviso aparece no próprio item, e nada sai.
  it("item antigo acima de 160: aviso no item, e o passo não salva", async () => {
    await abrir({ personas: ["x".repeat(161)] });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Use no máximo 160 caracteres.")).toBeTruthy();
    expect(item("Pra quem é (personas)", 1).getAttribute("aria-invalid")).toBe("true");
    expect(updateCourse).not.toHaveBeenCalled();
  });
});
