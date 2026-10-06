// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "@/test-utils";
import type { AdminAviso } from "@/lib/api";

const adminGetAviso = vi.fn();
const adminGetCourses = vi.fn();
const adminCriarAviso = vi.fn();
const adminSalvarAviso = vi.fn();
const adminEnviarAviso = vi.fn();
const adminContarDestinatarios = vi.fn();
vi.mock("@/lib/api", () => ({
  adminGetAviso: (id: number) => adminGetAviso(id),
  adminGetCourses: () => adminGetCourses(),
  adminCriarAviso: (v: unknown) => adminCriarAviso(v),
  adminSalvarAviso: (id: number, v: unknown) => adminSalvarAviso(id, v),
  adminEnviarAviso: (id: number) => adminEnviarAviso(id),
  adminContarDestinatarios: (a: string, c: number | null) => adminContarDestinatarios(a, c),
}));

import { AvisoEditorPage } from "./AvisoEditorPage";

// NOVA NOTIFICAÇÃO e EDITAR (bloco C1 — decisões do operador, 06/10/2026): rascunho,
// enviar com a contagem e a confirmação, e a enviada só com Salvar.

const criado = (extra: Partial<AdminAviso> = {}): AdminAviso => ({
  id: 9,
  title: "Aula ao vivo",
  body: "Hoje às 20h",
  audience: "TODOS",
  course: null,
  sentAt: null,
  createdAt: "2026-10-06T11:00:00.000Z",
  updatedAt: "2026-10-06T11:00:00.000Z",
  recebidas: 0,
  lidas: 0,
  ...extra,
});

beforeEach(() => {
  adminGetCourses.mockReset().mockResolvedValue([{ id: 3, title: "Excel com IA" }]);
  adminGetAviso.mockReset().mockResolvedValue(criado());
  adminCriarAviso.mockReset().mockResolvedValue(criado());
  adminSalvarAviso.mockReset().mockResolvedValue(criado());
  adminEnviarAviso.mockReset().mockResolvedValue({ enviadas: 3 });
  adminContarDestinatarios.mockReset().mockResolvedValue(3);
});

function abrir(rota = "/admin/comunicacao/notificacoes/nova") {
  renderWithProviders(<AvisoEditorPage />, {
    route: rota,
    path: "/admin/comunicacao/notificacoes/:id",
    extraRoutes: [{ path: "/admin/comunicacao/notificacoes", element: <p>a lista</p> }],
  });
}

async function preencher(titulo = "Aula ao vivo", texto = "Hoje às 20h") {
  fireEvent.change(await screen.findByLabelText("Título"), { target: { value: titulo } });
  fireEvent.change(screen.getByLabelText("Texto"), { target: { value: texto } });
}

describe("Nova notificação", () => {
  it("carregando enquanto os cursos não chegam", () => {
    adminGetCourses.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("título e texto obrigatórios: nada é salvo", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Salvar como rascunho" }));
    expect(await screen.findAllByText("Campo obrigatório.")).toHaveLength(2);
    expect(adminCriarAviso).not.toHaveBeenCalled();
  });

  it("salvar como rascunho: cria com o que está na tela, para todo mundo com conta, e diz Salvo", async () => {
    abrir();
    await preencher();
    fireEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }));
    await waitFor(() => expect(adminCriarAviso).toHaveBeenCalledWith({ title: "Aula ao vivo", body: "Hoje às 20h", audience: "TODOS", courseId: null }));
    expect(await screen.findByText("Salvo.")).toBeTruthy();
    expect(adminEnviarAviso).not.toHaveBeenCalled();
  });

  it("para os alunos de um curso: o curso é obrigatório; escolhido, vai junto", async () => {
    abrir();
    await preencher();
    fireEvent.click(screen.getByLabelText("Os alunos de um curso (quem já começou)"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }));
    expect(await screen.findByText("Escolha o curso.")).toBeTruthy();
    expect(adminCriarAviso).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Curso"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }));
    await waitFor(() => expect(adminCriarAviso).toHaveBeenCalledWith(expect.objectContaining({ audience: "CURSO", courseId: 3 })));
  });

  it("Enviar: salva, diz para quantas pessoas vai, e só envia ao confirmar", async () => {
    abrir();
    await preencher();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect((await screen.findByRole("alertdialog")).textContent).toContain("Vai para 3 pessoas.");
    expect(adminContarDestinatarios).toHaveBeenCalledWith("TODOS", null);
    expect(adminEnviarAviso).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar envio" }));
    await waitFor(() => expect(adminEnviarAviso).toHaveBeenCalledWith(9));
    expect(await screen.findByText("a lista")).toBeTruthy();
  });

  it("Cancelar na confirmação não envia", async () => {
    abrir();
    await preencher();
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(adminEnviarAviso).not.toHaveBeenCalled();
  });
});

describe("Editar uma notificação já enviada", () => {
  it("sem Enviar; o botão é Salvar; o 'para quem' fica travado; salvar atualiza", async () => {
    adminGetAviso.mockResolvedValue(criado({ sentAt: "2026-10-06T12:00:00.000Z" }));
    abrir("/admin/comunicacao/notificacoes/9");
    expect(await screen.findByDisplayValue("Aula ao vivo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar" })).toBeNull();
    // Travado pelo grupo (fieldset): o jsdom não marca `disabled` no próprio campo.
    expect(screen.getByLabelText("Todo mundo com conta").matches(":disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "Começa às 21h" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(adminSalvarAviso).toHaveBeenCalledWith(9, expect.objectContaining({ body: "Começa às 21h" })));
  });

  it("o servidor recusa trocar o 'para quem': a mensagem diz por quê", async () => {
    const headers = new AxiosHeaders();
    adminSalvarAviso.mockRejectedValue(
      new AxiosError("409", "ERR_BAD_REQUEST", undefined, undefined, { status: 409, statusText: "", headers, config: { headers }, data: { error: "AudienceLocked" } }),
    );
    abrir("/admin/comunicacao/notificacoes/9");
    await screen.findByDisplayValue("Aula ao vivo");
    fireEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }));
    expect((await screen.findByRole("alert")).textContent).toBe('Depois de enviada, o "para quem" não muda.');
  });

  it("não abre: avisa", async () => {
    adminGetAviso.mockRejectedValue(new Error("404"));
    abrir("/admin/comunicacao/notificacoes/9");
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível abrir esta notificação.");
  });
});
