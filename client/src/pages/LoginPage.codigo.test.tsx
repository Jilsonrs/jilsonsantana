// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@/test-utils";

// Mock na NOSSA fronteira (`@/lib/auth-client` e `@/lib/api`), nunca na biblioteca.
const signInEmail = vi.fn();
const signInEmailOtp = vi.fn();
const resetPassword = vi.fn();
const useSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args), emailOtp: (...args: unknown[]) => signInEmailOtp(...args) },
  emailOtp: { resetPassword: (...args: unknown[]) => resetPassword(...args) },
  useSession: () => useSession(),
}));
const pedirCodigo = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  pedirCodigo: (...args: unknown[]) => pedirCodigo(...args),
}));

import { LoginPage } from "./LoginPage";
import { EsqueciMinhaSenhaPage } from "./EsqueciMinhaSenhaPage";

// ENTRAR COM O CÓDIGO NO E-MAIL (etapa 4.7, passo 5 — decisões do operador, 21/10/2026): "um botão
// receber código de acesso, a pessoa clica, o campo onde deveria colocar a senha muda para receber o
// código, a pessoa informa e entra". O que estes testes protegem: o código só é pedido com um e-mail
// válido; o campo da senha dá lugar ao do código; o código errado, o excesso de tentativas e a queda
// de rede dizem coisas diferentes; com o código certo a pessoa entra no Início, sem nada da conta
// anterior; dá para pedir outro código e voltar para a senha; e "Esqueci minha senha" leva o e-mail.

const muitasTentativas = { response: { status: 429, data: { error: "MuitasTentativas" } } };

function renderLogin() {
  return renderWithProviders(<LoginPage />, {
    route: "/login",
    path: "/login",
    extraRoutes: [
      { path: "/inicio", element: <div>HOME DO ALUNO</div> },
      { path: "/esqueci-minha-senha", element: <EsqueciMinhaSenhaPage /> },
    ],
  });
}

const email = () => screen.getByLabelText("E-mail");
const receberCodigo = () => fireEvent.click(screen.getByRole("button", { name: "Receber código de acesso" }));

/** Pede o código com um e-mail válido e espera o campo do código aparecer. */
async function irParaOCodigo(endereco = "ana@exemplo.com") {
  fireEvent.change(email(), { target: { value: endereco } });
  receberCodigo();
  return screen.findByLabelText("Código");
}

function entrarComCodigo(codigo: string) {
  fireEvent.change(screen.getByLabelText("Código"), { target: { value: codigo } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.mockReturnValue({ data: null, isPending: false });
  pedirCodigo.mockResolvedValue({ ok: true });
  signInEmailOtp.mockResolvedValue({ error: null });
});

describe("Receber código de acesso", () => {
  it("com o e-mail inválido: o erro do e-mail, e nenhum código é pedido", async () => {
    renderLogin();
    fireEvent.change(email(), { target: { value: "sem-arroba" } });
    receberCodigo();
    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy();
    expect(pedirCodigo).not.toHaveBeenCalled();
  });

  it("com o e-mail válido (sem senha nenhuma): pede o código para ENTRAR, e o campo da senha dá lugar ao do código", async () => {
    renderLogin();
    expect(await irParaOCodigo("  ana@exemplo.com  ")).toBeTruthy();
    expect(pedirCodigo).toHaveBeenCalledWith({ email: "ana@exemplo.com", motivo: "entrar" });
    expect(screen.queryByLabelText("Senha")).toBeNull();
    expect(screen.getByText("ana@exemplo.com")).toBeTruthy();
    expect(screen.getByText(/Se este e-mail tiver conta, enviamos para ele um código de 6 números\. O código vale por 10 minutos\./)).toBeTruthy();
  });

  it("enquanto pede: o botão diz que está enviando e não aceita outro clique", async () => {
    let soltar!: (v: unknown) => void;
    pedirCodigo.mockReturnValue(new Promise((ok) => (soltar = ok)));
    renderLogin();
    fireEvent.change(email(), { target: { value: "ana@exemplo.com" } });
    receberCodigo();
    const botao = await screen.findByRole("button", { name: "Enviando o código…" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    soltar({ ok: true });
    expect(await screen.findByLabelText("Código")).toBeTruthy();
  });

  it("excesso de pedidos: 'muitas tentativas', e continua na senha; outra falha: 'não foi possível'", async () => {
    pedirCodigo.mockRejectedValueOnce(muitasTentativas);
    renderLogin();
    fireEvent.change(email(), { target: { value: "ana@exemplo.com" } });
    receberCodigo();
    expect(await screen.findByText("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();

    pedirCodigo.mockRejectedValueOnce(new Error("rede"));
    receberCodigo();
    expect(await screen.findByText("Não foi possível entrar agora. Tente novamente em alguns minutos.")).toBeTruthy();
    expect(screen.queryByLabelText("Código")).toBeNull();
  });
});

describe("Entrar com o código", () => {
  it("o código certo: entra com o e-mail e o código, e vai para o Início", async () => {
    renderLogin();
    await irParaOCodigo();
    entrarComCodigo(" 123456 ");
    expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
    expect(signInEmailOtp).toHaveBeenCalledWith({ email: "ana@exemplo.com", otp: "123456" });
  });

  it("menos de 6 números, ou letras: o erro do campo, e o código não é gasto", async () => {
    renderLogin();
    await irParaOCodigo();
    for (const ruim of ["12345", "12a456"]) {
      entrarComCodigo(ruim);
      expect(await screen.findByText("Informe os 6 números do código.")).toBeTruthy();
    }
    expect(signInEmailOtp).not.toHaveBeenCalled();
  });

  // Cada caso numa tela nova: com a mesma frase em sequência, o teste acharia a da vez anterior.
  it.each([400, 403])("o código errado ou vencido (400), e as tentativas esgotadas (403): 'confira ou peça outro' — e não entra (%i)", async (status) => {
    signInEmailOtp.mockResolvedValueOnce({ error: { status } });
    renderLogin();
    await irParaOCodigo();
    entrarComCodigo("123456");
    expect(await screen.findByText("Código incorreto ou vencido. Confira os números ou peça outro.")).toBeTruthy();
    expect(screen.queryByText("HOME DO ALUNO")).toBeNull();
  });

  it("excesso de tentativas (429): 'muitas tentativas'; queda de rede: 'não foi possível'", async () => {
    renderLogin();
    await irParaOCodigo();
    signInEmailOtp.mockResolvedValueOnce({ error: { status: 429 } });
    entrarComCodigo("123456");
    expect(await screen.findByText("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.")).toBeTruthy();
    signInEmailOtp.mockRejectedValueOnce(new Error("rede"));
    entrarComCodigo("123456");
    expect(await screen.findByText("Não foi possível entrar agora. Tente novamente em alguns minutos.")).toBeTruthy();
  });

  it("pedir outro código: pede de novo para ENTRAR e avisa; no excesso, 'muitas tentativas'", async () => {
    renderLogin();
    await irParaOCodigo();
    fireEvent.click(screen.getByRole("button", { name: "Pedir outro código" }));
    expect(await screen.findByText("Enviamos outro código.")).toBeTruthy();
    expect(pedirCodigo).toHaveBeenCalledTimes(2);
    expect(pedirCodigo).toHaveBeenLastCalledWith({ email: "ana@exemplo.com", motivo: "entrar" });

    pedirCodigo.mockRejectedValueOnce(muitasTentativas);
    fireEvent.click(screen.getByRole("button", { name: "Pedir outro código" }));
    expect(await screen.findByText("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.")).toBeTruthy();
  });

  it("entrar com senha: volta ao campo da senha, com o e-mail já digitado", async () => {
    renderLogin();
    await irParaOCodigo("bia@exemplo.com");
    fireEvent.click(screen.getByRole("button", { name: "Entrar com senha" }));
    expect(await screen.findByLabelText("Senha")).toBeTruthy();
    expect((email() as HTMLInputElement).value).toBe("bia@exemplo.com");
  });
});

// QUEM ENTRA COM O CÓDIGO TAMBÉM COMEÇA DO ZERO (decisão do operador, 11/10/2026 — a mesma da senha).
describe("Entrar com o código — nada da conta anterior", () => {
  const GUARDADO = ["o-que-a-tela-guardou"];
  let daAba: QueryClient | null = null;
  function TelaDaContaAnterior() {
    const { data } = useQuery({ queryKey: GUARDADO, queryFn: () => Promise.resolve("o progresso da Ana") });
    return <p>{data ?? "lendo"}</p>;
  }
  function Captura() {
    daAba = useQueryClient();
    return null;
  }

  it("ao entrar com o código, o que as telas tinham guardado é esquecido", async () => {
    renderWithProviders(
      <>
        <Captura />
        <TelaDaContaAnterior />
        <LoginPage />
      </>,
      { route: "/login", path: "/login", extraRoutes: [{ path: "/inicio", element: <div>HOME DO ALUNO</div> }] },
    );
    expect(await screen.findByText("o progresso da Ana")).toBeTruthy();
    await irParaOCodigo();
    entrarComCodigo("123456");
    await waitFor(() => expect(daAba?.getQueryData(GUARDADO)).toBeUndefined());
  });
});

describe("Esqueci minha senha, na tela de entrar", () => {
  it("leva à tela da senha nova com o e-mail já digitado", async () => {
    renderLogin();
    fireEvent.change(email(), { target: { value: "carla@exemplo.com" } });
    fireEvent.click(screen.getByRole("link", { name: "Esqueci minha senha" }));
    expect(await screen.findByRole("button", { name: "Enviar código" })).toBeTruthy();
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("carla@exemplo.com");
  });
});
