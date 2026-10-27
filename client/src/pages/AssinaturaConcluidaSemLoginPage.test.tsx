// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "@/test-utils";

const confirmarSemLogin = vi.fn();
const criarSenhaSemLogin = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  confirmarSemLogin: (...args: unknown[]) => confirmarSemLogin(...args),
  criarSenhaSemLogin: (...args: unknown[]) => criarSenhaSemLogin(...args),
}));

import { navegador } from "@/lib/versao";
import { esquecerTentativa, guardarTentativa, lerTentativa } from "@/lib/tentativa-de-assinar";
import { AssinaturaConcluidaSemLoginPage } from "./AssinaturaConcluidaSemLoginPage";

// DEPOIS DO PAGAMENTO, SEM CONTA (etapa 4.7, passo 6e2). O que estes testes protegem:
//   - sem a tentativa nesta aba, nada é perguntado: a tela de entrar (com o código por e-mail);
//   - "o pagamento já valeu?" pela tentativa guardada, de novo a cada intervalo, com o "demorando";
//   - valeu: a pessoa cria a senha AQUI (com a tentativa, por POST), e entra — a tentativa é
//     esquecida e o Início carrega; a tela repete o e-mail e mostra o contato do suporte;
//   - as recusas, com os textos aprovados (P81): as que encerram levam à tela de entrar e esquecem a
//     tentativa; as de esperar mantêm o formulário.

const TENTATIVA = "TentativaDoServidor_24bytesAAAAAA";
const EMAIL = "Visitante@Exemplo.com";
const SENHA = "senha-forte-123";
const erroDoServidor = (codigo: string, status = 409) =>
  new AxiosError("erro", "ERR_BAD_REQUEST", undefined, undefined, { status, statusText: "", headers: {}, config: { headers: new AxiosHeaders() }, data: { error: codigo } });

let ir: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  confirmarSemLogin.mockReset().mockResolvedValue({ confirmada: true });
  criarSenhaSemLogin.mockReset().mockResolvedValue({ entrou: true });
  ir = vi.spyOn(navegador, "ir").mockImplementation(() => {});
  esquecerTentativa();
});
afterEach(() => vi.restoreAllMocks());

const abrir = (props: { conferirACada?: number; demora?: number } = {}) => renderWithProviders(<AssinaturaConcluidaSemLoginPage {...props} />);
const comTentativa = () => guardarTentativa({ tentativa: TENTATIVA, email: EMAIL });
async function criarSenha(senha = SENHA) {
  fireEvent.change(await screen.findByLabelText("Crie uma senha"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: "Criar senha e começar a estudar" }));
}

describe("depois do pagamento, sem conta — a confirmação", () => {
  it("sem a tentativa nesta aba: a tela de entrar — e nada é perguntado", async () => {
    abrir();
    await waitFor(() => expect(ir).toHaveBeenCalledWith("/login"));
    expect(confirmarSemLogin).not.toHaveBeenCalled();
  });

  it("enquanto o pagamento não vale: Confirmando…, pergunta de novo pela tentativa, e depois de um tempo o demorando", async () => {
    comTentativa();
    confirmarSemLogin.mockResolvedValue({ confirmada: false });
    abrir({ conferirACada: 20, demora: 60 });
    expect(await screen.findByRole("heading", { name: "Confirmando sua assinatura…" })).toBeTruthy();
    expect(await screen.findByText("Está demorando mais que o normal. Seu pagamento não se perde: esta página continua conferindo.")).toBeTruthy();
    await waitFor(() => expect(confirmarSemLogin.mock.calls.length).toBeGreaterThan(1));
    expect(confirmarSemLogin).toHaveBeenCalledWith(TENTATIVA);
    expect(screen.queryByLabelText("Crie uma senha")).toBeNull();
  });

  it("valeu: o título, o e-mail repetido, o campo da senha e o contato do suporte", async () => {
    comTentativa();
    abrir();
    expect(await screen.findByRole("heading", { name: "Assinatura confirmada." })).toBeTruthy();
    expect(screen.getByText(`Agora crie sua senha. É com ela e com o e-mail ${EMAIL} que você entra na escola.`)).toBeTruthy();
    expect(screen.getByLabelText("Crie uma senha").getAttribute("type")).toBe("password");
    expect(screen.getByText("Pelo menos 8 caracteres.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "suporte@jilsonsantana.com" }).getAttribute("href")).toBe("mailto:suporte@jilsonsantana.com");
  });
});

describe("depois do pagamento, sem conta — a senha", () => {
  it("senha curta: o aviso, e nada vai ao servidor", async () => {
    comTentativa();
    abrir();
    await criarSenha("curta");
    expect(await screen.findByText("A senha precisa ter pelo menos 8 caracteres.")).toBeTruthy();
    expect(criarSenhaSemLogin).not.toHaveBeenCalled();
  });

  it("criou e entrou: a senha vai com a tentativa, a tentativa é esquecida, e o Início carrega", async () => {
    comTentativa();
    abrir();
    await criarSenha();
    await waitFor(() => expect(ir).toHaveBeenCalledWith("/inicio"));
    expect(criarSenhaSemLogin).toHaveBeenCalledWith({ tentativa: TENTATIVA, senha: SENHA });
    expect(lerTentativa()).toBeNull();
    expect(window.sessionStorage.getItem("jilson.assinar.tentativa")).toBeNull();
  });

  it("criou, e a entrada automática falhou: o aviso e o botão Entrar, para a tela de entrar", async () => {
    criarSenhaSemLogin.mockResolvedValue({ entrou: false });
    comTentativa();
    abrir();
    await criarSenha();
    expect((await screen.findByRole("status")).textContent).toBe("Sua senha foi criada. Entre com seu e-mail e a senha nova.");
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe("/login");
    expect(lerTentativa()).toBeNull();
    expect(ir).not.toHaveBeenCalledWith("/inicio");
  });

  for (const [motivo, frase] of [
    ["PrazoVencido", 'O prazo para criar a senha por aqui terminou. Na tela de entrar, use "Esqueci minha senha".'],
    ["EmailConfirmado", 'Você já entrou na escola pelo código enviado ao seu e-mail. Para criar a senha, use "Esqueci minha senha" na tela de entrar.'],
    ["JaTemSenha", "Sua senha já foi criada. Entre com seu e-mail e a senha."],
  ] as const) {
    it(`${motivo}: a frase e o botão para a tela de entrar — e a tentativa é esquecida`, async () => {
      criarSenhaSemLogin.mockRejectedValue(erroDoServidor(motivo));
      comTentativa();
      abrir();
      await criarSenha();
      expect((await screen.findByRole("status")).textContent).toBe(frase);
      expect(screen.getByRole("link", { name: "Ir para a tela de entrar" }).getAttribute("href")).toBe("/login");
      expect(lerTentativa()).toBeNull();
    });
  }

  it("NaoConfirmado e Ocupada: as frases de esperar — o formulário continua, e a tentativa também", async () => {
    criarSenhaSemLogin.mockRejectedValueOnce(erroDoServidor("NaoConfirmado")).mockRejectedValueOnce(erroDoServidor("Ocupada"));
    comTentativa();
    abrir();
    await criarSenha();
    expect((await screen.findByRole("alert")).textContent).toBe("Seu pagamento ainda está sendo confirmado. Aguarde um instante e tente de novo.");
    fireEvent.click(screen.getByRole("button", { name: "Criar senha e começar a estudar" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Aguarde um instante e tente novamente."));
    expect(screen.getByLabelText("Crie uma senha")).toBeTruthy();
    expect(lerTentativa()).toEqual({ tentativa: TENTATIVA, email: EMAIL });
  });

  it("falha sem motivo (fora do ar): a frase da tela de entrar", async () => {
    criarSenhaSemLogin.mockRejectedValue(new Error("fora do ar"));
    comTentativa();
    abrir();
    await criarSenha();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível entrar agora. Tente novamente em alguns minutos.");
  });
});
