// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";

// Mock na NOSSA fronteira (`@/lib/auth-client`), nunca em `better-auth/react`:
// o teste sobrevive a trocar a biblioteca de auth.
const signInEmail = vi.fn();
const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args) },
  useSession: () => useSession(),
}));

import { LoginPage } from "./LoginPage";

/** Monta a tela com um destino real para `/conta`, para poder assertar navegação. */
function renderLogin() {
  return renderWithProviders(<LoginPage />, {
    route: "/login",
    path: "/login",
    extraRoutes: [{ path: "/conta", element: <div>PÁGINA DA CONTA</div> }],
  });
}

function preencher({ email, senha }: { email: string; senha: string }) {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
}

function enviar() {
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ data: null, isPending: false });
  signInEmail.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// GRUPO A — um teste por ramo de decisão de LoginPage.tsx.
// ---------------------------------------------------------------------------

describe("LoginPage — ramos da tela", () => {
  it("e-mail inválido: mostra o erro e NÃO chama a API", async () => {
    renderLogin();
    preencher({ email: "sem-arroba", senha: "minhasenha" });
    enviar();

    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("campos vazios: mostra os dois erros e NÃO chama a API", async () => {
    renderLogin();
    enviar();

    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy();
    expect(await screen.findByText("Informe sua senha.")).toBeTruthy();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("401: mostra credencial incorreta", async () => {
    signInEmail.mockResolvedValue({ error: { status: 401 } });
    renderLogin();
    preencher({ email: "a@b.com", senha: "errada" });
    enviar();

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeTruthy();
  });

  // O par com o teste acima é o que carrega este arquivo: o `onSubmit` separa
  // 401 de qualquer outra falha DE PROPÓSITO, e o bug clássico é colapsar os
  // dois em "senha incorreta" — o que faz a pessoa tentar de novo para sempre
  // enquanto o servidor está fora. Um teste só, do caminho feliz, não pega isso.
  it("erro que NÃO é 401: mostra a mensagem genérica, não 'senha incorreta'", async () => {
    signInEmail.mockResolvedValue({ error: { status: 500 } });
    renderLogin();
    preencher({ email: "a@b.com", senha: "minhasenha" });
    enviar();

    expect(
      await screen.findByText("Não foi possível entrar agora. Tente novamente."),
    ).toBeTruthy();
    expect(screen.queryByText("E-mail ou senha incorretos.")).toBeNull();
  });

  it("sucesso: navega para /conta", async () => {
    renderLogin();
    preencher({ email: "a@b.com", senha: "minhasenha" });
    enviar();

    expect(await screen.findByText("PÁGINA DA CONTA")).toBeTruthy();
  });

  it("durante o envio: botão desabilitado e rótulo 'Entrando…'", async () => {
    let liberar: (v: { error: null }) => void = () => {};
    signInEmail.mockReturnValue(new Promise((resolve) => (liberar = resolve)));

    renderLogin();
    preencher({ email: "a@b.com", senha: "minhasenha" });
    enviar();

    const botao = await screen.findByRole("button", { name: "Entrando…" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);

    liberar({ error: null });
    await waitFor(() => expect(screen.getByText("PÁGINA DA CONTA")).toBeTruthy());
  });

  it("sessão já ativa: redireciona sem renderizar o formulário", async () => {
    useSession.mockReturnValue({ data: { user: { id: "1" } }, isPending: false });
    renderLogin();

    expect(await screen.findByText("PÁGINA DA CONTA")).toBeTruthy();
    expect(screen.queryByLabelText("Senha")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GRUPO B — erros clássicos de formulário. A lista NÃO foi lembrada de cabeça:
// saiu de rodar o `loginSchema` real e ver o que ele deixava passar.
// ---------------------------------------------------------------------------

describe("LoginPage — erros clássicos", () => {
  it("senha só de espaços é rejeitada, e a API não é chamada", async () => {
    renderLogin();
    preencher({ email: "a@b.com", senha: "   " });
    enviar();

    // Antes de Ago 2026 isto PASSAVA (`.min(1)` conta espaço em branco): ia ao
    // servidor e voltava "e-mail ou senha incorretos", quando o campo estava
    // vazio na prática.
    expect(await screen.findByText("Informe sua senha.")).toBeTruthy();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("e-mail com espaço nas pontas é aceito e chega LIMPO na API", async () => {
    renderLogin();
    preencher({ email: "  a@b.com  ", senha: "minhasenha" });
    enviar();

    // O caso de colar de gerenciador de senhas. Antes era rejeitado com
    // "Informe um e-mail válido" — para um e-mail que é válido.
    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail.mock.calls[0][0].email).toBe("a@b.com");
  });

  // ESTE TESTE TRAVA A REGRA. Sem ele, um "simplifica isso aí" futuro põe
  // `.trim()` na senha junto com o do e-mail, e ninguém percebe até o chamado de
  // suporte — porque de fora é indistinguível de senha errada de verdade.
  it("senha com espaço nas pontas chega INTACTA na API (nunca é trimada)", async () => {
    renderLogin();
    preencher({ email: "a@b.com", senha: "  senha com espaços  " });
    enviar();

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail.mock.calls[0][0].password).toBe("  senha com espaços  ");
  });

  it("duplo clique no botão chama a API uma vez só", async () => {
    let liberar: (v: { error: null }) => void = () => {};
    signInEmail.mockReturnValue(new Promise((resolve) => (liberar = resolve)));

    renderLogin();
    preencher({ email: "a@b.com", senha: "minhasenha" });
    const botao = screen.getByRole("button", { name: /entrar/i });
    fireEvent.click(botao);
    fireEvent.click(botao);

    await screen.findByRole("button", { name: "Entrando…" });
    expect(signInEmail).toHaveBeenCalledTimes(1);

    liberar({ error: null });
  });

  it("erro anterior some no envio seguinte", async () => {
    signInEmail.mockResolvedValue({ error: { status: 401 } });
    renderLogin();
    preencher({ email: "a@b.com", senha: "errada" });
    enviar();
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeTruthy();

    // O clássico: a pessoa corrige a senha e continua lendo o erro velho,
    // achando que falhou de novo.
    signInEmail.mockResolvedValue({ error: null });
    preencher({ email: "a@b.com", senha: "certa" });
    enviar();

    await waitFor(() => expect(screen.queryByText("E-mail ou senha incorretos.")).toBeNull());
  });

  it("queda de rede (a promise REJEITA) mostra erro em vez de travar a tela", async () => {
    signInEmail.mockRejectedValue(new Error("Network Error"));
    renderLogin();
    preencher({ email: "a@b.com", senha: "minhasenha" });
    enviar();

    // `signIn.email` normalmente devolve `{ error }`; numa falha de rede ela
    // pode REJEITAR. Sem tratamento, a rejeição escapa do handler, a tela fica
    // muda e o botão preso em "Entrando…" — a pessoa não sabe o que aconteceu.
    expect(
      await screen.findByText("Não foi possível entrar agora. Tente novamente."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Entrando…" })).toBeNull();
  });
});
