// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AdminFaqPage } from "./AdminFaqPage";
import * as api from "@/lib/api";

// O editor é o mesmo dos depoimentos (coberto em AdminTestimonialsPage.test).
// Aqui o risco é outro: a FIAÇÃO — pergunta e resposta indo para os campos
// certos da API. Trocar os dois passaria em qualquer teste do editor.
vi.mock("@/lib/api");

const base = { createdAt: "2026-09-23T00:00:00Z", updatedAt: "2026-09-23T00:00:00Z" };
const lista: api.AdminHomeFaq[] = [
  { ...base, id: 7, language: "pt", question: "Serve para a minha área?", answer: "Sim.", displayOrder: 10, status: "PUBLISHED" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.adminGetHomeFaq).mockResolvedValue(lista);
  vi.mocked(api.adminCreateHomeFaq).mockResolvedValue(lista[0]);
  vi.mocked(api.adminUpdateHomeFaq).mockResolvedValue(lista[0]);
});

describe("Perguntas frequentes — fiação", () => {
  it("lista as perguntas com a resposta embaixo", async () => {
    renderWithProviders(<AdminFaqPage />);
    const ul = await screen.findByRole("list", { name: "Perguntas frequentes em português" });
    expect(within(ul).getByText("Serve para a minha área?")).toBeTruthy();
    expect(within(ul).getByText("Sim.")).toBeTruthy();
  });

  it("criar manda pergunta e resposta nos campos certos", async () => {
    renderWithProviders(<AdminFaqPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Nova pergunta" }));
    fireEvent.change(screen.getByLabelText("Pergunta"), { target: { value: "Tem certificado?" } });
    fireEvent.change(screen.getByLabelText("Resposta"), { target: { value: "Tem, ao concluir." } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(api.adminCreateHomeFaq).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.adminCreateHomeFaq).mock.calls[0][0]).toEqual({
      language: "pt",
      question: "Tem certificado?",
      answer: "Tem, ao concluir.",
      displayOrder: 20,
      status: "DRAFT",
    });
  });

  it("editar manda pergunta e resposta nos campos certos", async () => {
    renderWithProviders(<AdminFaqPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Resposta"), { target: { value: "Sim, em qualquer área." } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(api.adminUpdateHomeFaq).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.adminUpdateHomeFaq).mock.calls[0]).toEqual([
      7,
      { question: "Serve para a minha área?", answer: "Sim, em qualquer área.", displayOrder: 10, status: "PUBLISHED" },
    ]);
  });
});
