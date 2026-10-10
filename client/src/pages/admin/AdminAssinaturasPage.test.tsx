// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AssinaturaConferida, SincroniaDaConta } from "@jilson/core";

const adminSincronizarConta = vi.fn<(email: string) => Promise<SincroniaDaConta>>();
vi.mock("@/lib/api", () => ({
  adminSincronizarConta: (email: string) => adminSincronizarConta(email),
}));

import { AdminAssinaturasPage } from "./AdminAssinaturasPage";

// ADMIN → ASSINATURAS (Fase 4, etapa 4.4 — operador, 10/10/2026): conferir na Stripe a
// assinatura de um aluno. O que estes testes protegem: a tela manda só o e-mail (aparado), diz
// o que a Stripe respondeu e se a conta ficou com acesso, e nunca deixa na tela o resultado de
// uma conferência anterior quando a nova falha — o operador leria o acesso de OUTRO aluno.

const conferida = (extra: Partial<AssinaturaConferida> = {}): AssinaturaConferida => ({
  id: "sub_1",
  resultado: "atualizada",
  status: "active",
  pagoAte: "2026-11-10T15:00:00.000Z",
  ...extra,
});
const recusa = (motivo: string) => ({ response: { data: { error: motivo } } });

function conferir(email: string) {
  fireEvent.change(screen.getByLabelText("E-mail do aluno"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Conferir na Stripe" }));
}

beforeEach(() => {
  adminSincronizarConta.mockReset().mockResolvedValue({ temAcesso: true, assinaturas: [conferida()] });
});

describe("Assinaturas do admin — conferir na Stripe", () => {
  it("de início: só o campo e o botão — nada conferido, e o servidor não é chamado", () => {
    renderWithProviders(<AdminAssinaturasPage />);
    expect(screen.getByRole("heading", { name: "Assinaturas" })).toBeTruthy();
    expect(screen.getByLabelText("E-mail do aluno")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(adminSincronizarConta).not.toHaveBeenCalled();
  });

  it("manda o e-mail digitado, aparado nas pontas, e mostra o que a Stripe diz e que a conta tem acesso", async () => {
    renderWithProviders(<AdminAssinaturasPage />);
    conferir("  aluno@exemplo.com ");
    const resultado = await screen.findByRole("status");
    expect(adminSincronizarConta).toHaveBeenCalledTimes(1);
    expect(adminSincronizarConta).toHaveBeenCalledWith("aluno@exemplo.com");
    expect(resultado.textContent).toContain("Esta conta tem acesso.");
    expect(resultado.textContent).toContain("sub_1");
    expect(resultado.textContent).toContain("Ativa · paga até 10/11/2026");
  });

  it("carregando: enquanto confere, o botão diz Conferindo… e fica desligado — sem resultado na tela", async () => {
    let responder: (r: SincroniaDaConta) => void = () => {};
    adminSincronizarConta.mockReturnValue(new Promise((ok) => (responder = ok)));
    renderWithProviders(<AdminAssinaturasPage />);
    conferir("aluno@exemplo.com");
    const botao = (await screen.findByRole("button", { name: "Conferindo…" })) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
    responder({ temAcesso: false, assinaturas: [] });
    expect((await screen.findByRole("status")).textContent).toContain("Esta conta está sem acesso.");
    expect((screen.getByRole("button", { name: "Conferir na Stripe" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sem acesso: cada assinatura com a situação em português — e as que precisam de gente dizem por quê", async () => {
    adminSincronizarConta.mockResolvedValue({
      temAcesso: false,
      assinaturas: [
        conferida({ id: "sub_cancelada", status: "canceled", pagoAte: "2026-09-01T15:00:00.000Z" }),
        conferida({ id: "sub_tentativa", status: "incomplete_expired", pagoAte: null }),
        conferida({ id: "sub_sem_dono", resultado: "sem-conta" }),
        conferida({ id: "sub_sumida", resultado: "nao-encontrada", status: null, pagoAte: null }),
        conferida({ id: "sub_nova", status: "status_que_a_stripe_inventou", pagoAte: null }),
      ],
    });
    renderWithProviders(<AdminAssinaturasPage />);
    conferir("aluno@exemplo.com");
    const resultado = await screen.findByRole("status");
    expect(resultado.textContent).toContain("Esta conta está sem acesso.");
    const linha = (id: string) => (screen.getByText(id).closest("li") as HTMLElement).textContent;
    expect(linha("sub_cancelada")).toContain("Cancelada · paga até 01/09/2026");
    expect(linha("sub_tentativa")).toContain("Primeiro pagamento não concluído");
    expect(linha("sub_tentativa")).not.toContain("paga até");
    expect(linha("sub_sem_dono")).toContain("a Stripe não diz de que conta ela é");
    expect(linha("sub_sumida")).toContain("A Stripe não conhece esta assinatura.");
    expect(linha("sub_nova")).toContain("status_que_a_stripe_inventou");
  });

  it("vazio: a conta nunca passou pela Stripe", async () => {
    adminSincronizarConta.mockResolvedValue({ temAcesso: false, assinaturas: [] });
    renderWithProviders(<AdminAssinaturasPage />);
    conferir("aluno@exemplo.com");
    const resultado = await screen.findByRole("status");
    expect(resultado.textContent).toContain("Esta conta está sem acesso.");
    expect(resultado.textContent).toContain("Esta conta não tem nenhuma assinatura na Stripe.");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("erro: conta que não existe, Stripe não configurada e qualquer outra falha — cada uma com a sua frase", async () => {
    const casos: [unknown, string][] = [
      [recusa("ContaNaoEncontrada"), "Não existe conta com esse e-mail."],
      [recusa("NaoConfigurado"), "A Stripe não está configurada neste ambiente."],
      [new Error("Network Error"), "Não foi possível conferir na Stripe. Tente de novo."],
    ];
    renderWithProviders(<AdminAssinaturasPage />);
    for (const [falha, frase] of casos) {
      adminSincronizarConta.mockRejectedValueOnce(falha);
      conferir("aluno@exemplo.com");
      await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(frase));
      expect(screen.queryByRole("status")).toBeNull();
    }
  });

  it("o que não é e-mail: avisa no campo e não chama o servidor", async () => {
    renderWithProviders(<AdminAssinaturasPage />);
    for (const digitado of ["", "   ", "nao-e-email"]) {
      conferir(digitado);
      expect((await screen.findByRole("alert")).textContent).toBe("Informe um e-mail válido.");
    }
    expect(adminSincronizarConta).not.toHaveBeenCalled();
  });

  it("o resultado de UM aluno não fica na tela quando a conferência do seguinte falha", async () => {
    renderWithProviders(<AdminAssinaturasPage />);
    conferir("primeiro@exemplo.com");
    expect((await screen.findByRole("status")).textContent).toContain("Esta conta tem acesso.");

    // Enquanto a do segundo corre, o acesso do primeiro já saiu da tela.
    let falhar: (motivo: unknown) => void = () => {};
    adminSincronizarConta.mockReturnValueOnce(new Promise((_, recusar) => (falhar = recusar)));
    conferir("segundo@exemplo.com");
    await screen.findByRole("button", { name: "Conferindo…" });
    expect(screen.queryByRole("status")).toBeNull();
    falhar(recusa("ContaNaoEncontrada"));
    expect((await screen.findByRole("alert")).textContent).toBe("Não existe conta com esse e-mail.");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Esta conta tem acesso.")).toBeNull();
  });
});
