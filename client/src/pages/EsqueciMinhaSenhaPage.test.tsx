// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@/test-utils";

// Mock na NOSSA fronteira (`@/lib/auth-client` e `@/lib/api`), nunca na biblioteca.
const signInEmail = vi.fn();
const resetPassword = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args), emailOtp: vi.fn() },
  emailOtp: { resetPassword: (...args: unknown[]) => resetPassword(...args) },
  useSession: () => ({ data: null, isPending: false }),
}));
const pedirCodigo = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  pedirCodigo: (...args: unknown[]) => pedirCodigo(...args),
}));

import { EsqueciMinhaSenhaPage } from "./EsqueciMinhaSenhaPage";

// "ESQUECI MINHA SENHA" (etapa 4.7, passo 5 — decisões do operador, 21/10/2026: o código de 6
// números no e-mail). O que estes testes protegem: o código só é pedido com um e-mail válido, e para
// a SENHA; o segundo tempo confere o código e a senha antes de gastar o código; a senha vai como foi
// digitada (nunca aparada); criada a senha, a pessoa entra com ela e vai para o Início; o código
// recusado, o excesso e a queda de rede dizem coisas diferentes; e dá para pedir outro e voltar.

const muitasTentativas = { response: { status: 429, data: { error: "MuitasTentativas" } } };
const SENHA = "uma senha boa";

function renderTela() {
  return renderWithProviders(<EsqueciMinhaSenhaPage />, {
    route: "/esqueci-minha-senha",
    path: "/esqueci-minha-senha",
    extraRoutes: [
      { path: "/inicio", element: <div>HOME DO ALUNO</div> },
      { path: "/login", element: <div>TELA DE ENTRAR</div> },
    ],
  });
}

async function irParaASenhaNova(endereco = "ana@exemplo.com") {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: endereco } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
  return screen.findByLabelText("Senha nova");
}

function criar(codigo: string, senha: string) {
  fireEvent.change(screen.getByLabelText("Código"), { target: { value: codigo } });
  fireEvent.change(screen.getByLabelText("Senha nova"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: "Criar senha" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  pedirCodigo.mockResolvedValue({ ok: true });
  resetPassword.mockResolvedValue({ error: null });
  signInEmail.mockResolvedValue({ error: null });
});

describe("o primeiro tempo: o e-mail", () => {
  it("com o e-mail inválido: o erro, e nenhum código é pedido", async () => {
    renderTela();
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sem-arroba" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy();
    expect(pedirCodigo).not.toHaveBeenCalled();
  });

  it("com o e-mail válido: pede o código para a SENHA e mostra o código e a senha nova", async () => {
    renderTela();
    expect(await irParaASenhaNova(" ana@exemplo.com ")).toBeTruthy();
    expect(pedirCodigo).toHaveBeenCalledWith({ email: "ana@exemplo.com", motivo: "senha" });
    expect(screen.getByText("ana@exemplo.com")).toBeTruthy();
    expect(screen.getByText("Pelo menos 8 caracteres.")).toBeTruthy();
  });

  it("enquanto pede: o botão diz que está enviando; excesso e falha dizem coisas diferentes, e fica no e-mail", async () => {
    let soltar!: (v: unknown) => void;
    pedirCodigo.mockReturnValueOnce(new Promise((ok) => (soltar = ok)));
    renderTela();
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    expect(await screen.findByRole("button", { name: "Enviando o código…" })).toBeTruthy();
    soltar(Promise.reject(muitasTentativas));
    expect(await screen.findByText("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.")).toBeTruthy();
    expect(screen.queryByLabelText("Senha nova")).toBeNull();

    pedirCodigo.mockRejectedValueOnce(new Error("rede"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    expect(await screen.findByText("Não foi possível entrar agora. Tente novamente em alguns minutos.")).toBeTruthy();
  });
});

describe("o segundo tempo: o código e a senha nova", () => {
  it("certo: cria a senha COMO FOI DIGITADA, entra com ela e vai para o Início", async () => {
    renderTela();
    await irParaASenhaNova();
    criar("654321", `  ${SENHA}  `);
    expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
    expect(resetPassword).toHaveBeenCalledWith({ email: "ana@exemplo.com", otp: "654321", password: `  ${SENHA}  ` });
    expect(signInEmail).toHaveBeenCalledWith({ email: "ana@exemplo.com", password: `  ${SENHA}  ` });
  });

  it("o código com menos de 6 números, e a senha curta, só de espaços ou longa demais: o erro de cada campo, e nada é gasto", async () => {
    renderTela();
    await irParaASenhaNova();
    criar("12345", SENHA);
    expect(await screen.findByText("Informe os 6 números do código.")).toBeTruthy();
    const casos: [string, string][] = [
      ["1234567", "A senha precisa ter pelo menos 8 caracteres."],
      [" ".repeat(9), "A senha não pode ser só de espaços."],
      ["x".repeat(129), "A senha pode ter no máximo 128 caracteres."],
    ];
    for (const [senha, frase] of casos) {
      criar("654321", senha);
      expect(await screen.findByText(frase)).toBeTruthy();
    }
    expect(resetPassword).not.toHaveBeenCalled();
  });

  // Cada caso numa tela nova: com a mesma frase em sequência, o teste acharia a da vez anterior.
  it.each([400, 403])("o código recusado (400 ou 403): 'confira ou peça outro', e não entra (%i)", async (status) => {
    resetPassword.mockResolvedValueOnce({ error: { status } });
    renderTela();
    await irParaASenhaNova();
    criar("654321", SENHA);
    expect(await screen.findByText("Código incorreto ou vencido. Confira os números ou peça outro.")).toBeTruthy();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("excesso (429): 'muitas tentativas'; queda de rede: 'não foi possível'", async () => {
    renderTela();
    await irParaASenhaNova();
    resetPassword.mockResolvedValueOnce({ error: { status: 429 } });
    criar("654321", SENHA);
    expect(await screen.findByText("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.")).toBeTruthy();
    resetPassword.mockRejectedValueOnce(new Error("rede"));
    criar("654321", SENHA);
    expect(await screen.findByText("Não foi possível entrar agora. Tente novamente em alguns minutos.")).toBeTruthy();
  });

  it("a senha criada e a entrada que não abriu: vai para a tela de entrar (a senha já vale)", async () => {
    signInEmail.mockResolvedValueOnce({ error: { status: 500 } });
    renderTela();
    await irParaASenhaNova();
    criar("654321", SENHA);
    expect(await screen.findByText("TELA DE ENTRAR")).toBeTruthy();
  });

  it("enquanto cria: o botão diz 'Criando…'", async () => {
    let soltar!: (v: unknown) => void;
    resetPassword.mockReturnValueOnce(new Promise((ok) => (soltar = ok)));
    renderTela();
    await irParaASenhaNova();
    criar("654321", SENHA);
    expect(await screen.findByRole("button", { name: "Criando…" })).toBeTruthy();
    soltar({ error: null });
    expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
  });

  it("pedir outro código: pede de novo para a SENHA e avisa", async () => {
    renderTela();
    await irParaASenhaNova();
    fireEvent.click(screen.getByRole("button", { name: "Pedir outro código" }));
    expect(await screen.findByText("Enviamos outro código.")).toBeTruthy();
    expect(pedirCodigo).toHaveBeenLastCalledWith({ email: "ana@exemplo.com", motivo: "senha" });
  });
});

// QUEM CRIA A SENHA NOVA E ENTRA TAMBÉM COMEÇA DO ZERO (a mesma regra da tela de entrar — decisão do
// operador, 11/10/2026; o teste que faltava, apontado pela revisão de segurança de 21/10/2026).
describe("criar a senha nova — nada da conta anterior", () => {
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

  it("ao criar a senha e entrar, o que as telas tinham guardado é esquecido", async () => {
    renderWithProviders(
      <>
        <Captura />
        <TelaDaContaAnterior />
        <EsqueciMinhaSenhaPage />
      </>,
      { route: "/esqueci-minha-senha", path: "/esqueci-minha-senha", extraRoutes: [{ path: "/inicio", element: <div>HOME DO ALUNO</div> }] },
    );
    expect(await screen.findByText("o progresso da Ana")).toBeTruthy();
    await irParaASenhaNova();
    criar("654321", SENHA);
    expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
    await waitFor(() => expect(daAba?.getQueryData(GUARDADO)).toBeUndefined());
  });
});

it("'Voltar para entrar' leva à tela de entrar", async () => {
  renderTela();
  fireEvent.click(screen.getByRole("link", { name: "Voltar para entrar" }));
  expect(await screen.findByText("TELA DE ENTRAR")).toBeTruthy();
});
