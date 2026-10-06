// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AdminAviso } from "@/lib/api";

const adminGetAvisos = vi.fn();
const adminApagarAviso = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetAvisos: () => adminGetAvisos(),
  adminApagarAviso: (id: number) => adminApagarAviso(id),
}));

import { AvisosPage } from "./AvisosPage";

// COMUNICAÇÃO → NOTIFICAÇÕES (bloco C1 — decisões do operador, 06/10/2026): a lista
// dos avisos, rascunhos e enviados, com para quem e quantos leram.

const aviso = (extra: Partial<AdminAviso> = {}): AdminAviso => ({
  id: 1,
  title: "Aula ao vivo",
  body: "Hoje às 20h",
  audience: "TODOS",
  course: null,
  sentAt: "2026-10-06T12:00:00.000Z",
  createdAt: "2026-10-06T11:00:00.000Z",
  updatedAt: "2026-10-06T12:00:00.000Z",
  recebidas: 40,
  lidas: 12,
  ...extra,
});

beforeEach(() => {
  adminGetAvisos.mockReset().mockResolvedValue([
    aviso(),
    aviso({ id: 2, title: "Material novo", audience: "CURSO", course: { id: 3, title: "Excel com IA" }, sentAt: null, recebidas: 0, lidas: 0 }),
  ]);
  adminApagarAviso.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

const abrir = () => renderWithProviders(<AvisosPage />, { route: "/admin/comunicacao/notificacoes" });

describe("Notificações do admin — estados", () => {
  it("carregando", () => {
    adminGetAvisos.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: avisa", async () => {
    adminGetAvisos.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar as notificações.");
  });

  it("vazio: diz como começar", async () => {
    adminGetAvisos.mockResolvedValue([]);
    abrir();
    expect(await screen.findByText(/Nenhuma notificação ainda/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Nova notificação" }).getAttribute("href")).toBe("/admin/comunicacao/notificacoes/nova");
  });
});

describe("Notificações do admin — a lista", () => {
  it("cada uma com para quem, se é rascunho ou quando foi enviada, e quantos leram", async () => {
    abrir();
    const enviada = (await screen.findByRole("link", { name: "Aula ao vivo" })).closest("li") as HTMLElement;
    expect(enviada.textContent).toContain("Todo mundo com conta");
    expect(enviada.textContent).toMatch(/Enviada em \d{2}\/\d{2}\/2026/);
    expect(enviada.textContent).toContain("12 de 40 leram");
    const rascunho = screen.getByRole("link", { name: "Material novo" }).closest("li") as HTMLElement;
    expect(rascunho.textContent).toContain("Alunos de: Excel com IA");
    expect(rascunho.textContent).toContain("Rascunho");
    expect(rascunho.textContent).not.toContain("leram");
    expect(screen.getByRole("link", { name: "Editar: Material novo" }).getAttribute("href")).toBe("/admin/comunicacao/notificacoes/2");
  });

  it("apagar pede confirmação; confirmado, apaga", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Apagar: Aula ao vivo" }));
    expect(confirmar.mock.calls[0][0]).toContain("some do sino de todos");
    expect(adminApagarAviso).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apagar: Aula ao vivo" }));
    await waitFor(() => expect(adminApagarAviso).toHaveBeenCalledWith(1));
  });
});
