// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

const adminGetMensagensDosCursos = vi.fn();
vi.mock("@/lib/api", () => ({ adminGetMensagensDosCursos: () => adminGetMensagensDosCursos() }));

import { MensagensAutomaticasPage } from "./MensagensAutomaticasPage";

// COMUNICAÇÃO → MENSAGENS AUTOMÁTICAS (bloco C1, 06/10/2026): a boas-vindas e os
// parabéns de cada curso, com o caminho para editar no curso.

beforeEach(() => {
  adminGetMensagensDosCursos.mockReset().mockResolvedValue([
    { courseId: 4, courseTitle: "Excel com IA", status: "PUBLISHED", boasVindas: "Que **bom** ter você!", parabens: null },
  ]);
});

const abrir = () => renderWithProviders(<MensagensAutomaticasPage />, { route: "/admin/comunicacao/mensagens-automaticas" });

describe("Mensagens automáticas", () => {
  it("carregando, erro e vazio", async () => {
    adminGetMensagensDosCursos.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    unmount();
    adminGetMensagensDosCursos.mockRejectedValueOnce(new Error("rede"));
    const segundo = abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as mensagens.");
    segundo.unmount();
    adminGetMensagensDosCursos.mockResolvedValueOnce([]);
    abrir();
    expect(await screen.findByText("Nenhum curso ainda.")).toBeTruthy();
  });

  it("cada curso com as duas mensagens (sem as marcas) e o link para o passo Mensagens", async () => {
    abrir();
    const item = (await screen.findByText(/Excel com IA/)).closest("li") as HTMLElement;
    expect(item.textContent).toContain("Publicado");
    expect(item.textContent).toContain("Boas-vindas: Que bom ter você!");
    expect(item.textContent).toContain("Parabéns: sem mensagem (nada é enviado)");
    expect(screen.getByRole("link", { name: "Editar as mensagens de Excel com IA" }).getAttribute("href")).toBe("/admin/cursos/4/mensagens");
  });
});
