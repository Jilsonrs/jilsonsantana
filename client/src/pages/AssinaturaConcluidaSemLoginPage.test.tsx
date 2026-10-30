// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "@/test-utils";

const confirmarSemLogin = vi.fn();
const criarSenhaSemLogin = vi.fn();
const getPlanosSemLogin = vi.fn();
const conferirSemLogin = vi.fn<(tentativa: string) => Promise<void>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  confirmarSemLogin: (...args: unknown[]) => confirmarSemLogin(...args),
  criarSenhaSemLogin: (...args: unknown[]) => criarSenhaSemLogin(...args),
  getPlanosSemLogin: (...args: unknown[]) => getPlanosSemLogin(...args),
  conferirSemLogin: (tentativa: string) => conferirSemLogin(tentativa),
}));

// A fronteira com o Stripe.js (o QR do Pix de novo — etapa 4.9) vira dublê; a tela a carrega por `import()`.
// `precosDeAgora`: o que a tela entrega para o Stripe.js perguntar, só se o QR venceu (achado 8 da segunda revisão do passo 6).
type PrecosDeAgora = () => Promise<number[]>;
const mostrarQrDeNovo = vi.fn<(chavePublicavel: string, segredo: string, email: string | undefined, precosDeAgora: PrecosDeAgora) => Promise<"aberto" | "pago" | "falhou">>();
vi.mock("@/lib/stripe-do-site", () => ({ mostrarQrDeNovo: (chavePublicavel: string, segredo: string, email: string | undefined, precosDeAgora: PrecosDeAgora) => mostrarQrDeNovo(chavePublicavel, segredo, email, precosDeAgora) }));
const PLANOS_DE_AGORA = { chavePublicavel: "pk_test_da_tela", planos: [{ plano: "mensal", centavos: 9990, moeda: "brl" }, { plano: "anual", centavos: 99500, moeda: "brl" }], formasDePagamento: ["card"] };

import { navegador } from "@/lib/versao";
import { esquecerPix, guardarPix, lerPix } from "@/lib/pix-pendente";
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
  mostrarQrDeNovo.mockReset().mockResolvedValue("aberto");
  getPlanosSemLogin.mockReset().mockResolvedValue(PLANOS_DE_AGORA);
  conferirSemLogin.mockReset().mockResolvedValue(undefined);
  esquecerTentativa();
  esquecerPix();
});
afterEach(() => vi.restoreAllMocks());

const abrir = (props: { conferirACada?: number; demora?: number; pedirConferencia?: { primeiraEm: number; aCada: number } } = {}) => renderWithProviders(<AssinaturaConcluidaSemLoginPage {...props} />);
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
    expect(await screen.findByText("Está demorando mais que o normal. Seu pagamento não se perde: esta página continua conferindo. Se passar de alguns minutos, escreva para suporte@jilsonsantana.com.")).toBeTruthy();
    await waitFor(() => expect(confirmarSemLogin.mock.calls.length).toBeGreaterThan(1));
    expect(confirmarSemLogin).toHaveBeenCalledWith(TENTATIVA);
    expect(screen.queryByLabelText("Crie uma senha")).toBeNull();
  });

  it("o servidor recusou a pergunta 3 vezes seguidas (P108): a frase do operador no lugar do demorando — e a pergunta continua; valeu, a tela segue", async () => {
    comTentativa();
    const frase = 'Não conseguimos confirmar agora. Seu pagamento não se perde: entre com "Receber código de acesso" ou tente de novo em alguns minutos.';
    // As 3 primeiras perguntas são recusadas (o limite de tentativas); depois, "ainda não" — até valer.
    let valeu = false;
    confirmarSemLogin.mockImplementation(async () => {
      if (confirmarSemLogin.mock.calls.length <= 3) throw erroDoServidor("MuitasTentativas", 429);
      return { confirmada: valeu };
    });
    abrir({ conferirACada: 20, demora: 60_000 });
    expect(await screen.findByText(frase)).toBeTruthy();
    expect(screen.queryByText("Está demorando mais que o normal. Seu pagamento não se perde: esta página continua conferindo. Se passar de alguns minutos, escreva para suporte@jilsonsantana.com.")).toBeNull();
    // A próxima resposta (não valeu ainda) zera a conta: a frase sai.
    await waitFor(() => expect(screen.queryByText(frase)).toBeNull());
    valeu = true;
    expect(await screen.findByRole("heading", { name: "Assinatura confirmada." })).toBeTruthy();
  });

  it("a recusa que PEDE ESPERA (Retry-After): a frase na hora, e a próxima pergunta só depois da espera", async () => {
    comTentativa();
    const frase = 'Não conseguimos confirmar agora. Seu pagamento não se perde: entre com "Receber código de acesso" ou tente de novo em alguns minutos.';
    confirmarSemLogin.mockRejectedValue(
      new AxiosError("erro", "ERR_BAD_REQUEST", undefined, undefined, { status: 429, statusText: "", headers: { "retry-after": "600" }, config: { headers: new AxiosHeaders() }, data: { error: "MuitasTentativas" } }),
    );
    abrir({ conferirACada: 20, demora: 60_000 });
    expect(await screen.findByText(frase)).toBeTruthy();
    // Com o intervalo de 20 ms, sem respeitar a espera já haveria várias perguntas.
    await new Promise((pronto) => setTimeout(pronto, 200));
    expect(confirmarSemLogin).toHaveBeenCalledTimes(1);
  });

  it("duas recusas, uma resposta, duas recusas: nunca 3 SEGUIDAS — a frase não aparece", async () => {
    comTentativa();
    const frase = 'Não conseguimos confirmar agora. Seu pagamento não se perde: entre com "Receber código de acesso" ou tente de novo em alguns minutos.';
    const roteiro = ["recusa", "recusa", "nao", "recusa", "recusa"];
    const vistas: boolean[] = [];
    confirmarSemLogin.mockImplementation(async () => {
      vistas.push(screen.queryByText(frase) !== null);
      const passo = roteiro[confirmarSemLogin.mock.calls.length - 1];
      if (passo === "recusa") throw erroDoServidor("MuitasTentativas", 429);
      return { confirmada: passo === undefined };
    });
    abrir({ conferirACada: 20, demora: 60_000 });
    expect(await screen.findByRole("heading", { name: "Assinatura confirmada." })).toBeTruthy();
    expect(confirmarSemLogin.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(vistas.some(Boolean)).toBe(false);
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

// O QR DO PIX DE NOVO (etapa 4.9, passo 2b), como na tela de quem está logado: com o segredo que a aba
// guardou, enquanto o pagamento não vale; valeu, o segredo é esquecido e vem a senha.
describe("depois do pagamento, sem conta — o QR do Pix de novo", () => {
  it("sem um Pix guardado nesta aba: sem o botão", async () => {
    comTentativa();
    confirmarSemLogin.mockResolvedValue({ confirmada: false });
    abrir({ conferirACada: 20 });
    await screen.findByRole("heading", { name: "Confirmando sua assinatura…" });
    expect(screen.queryByRole("button", { name: "Mostrar o QR de novo" })).toBeNull();
  });

  it("com um Pix guardado: o botão enquanto o pagamento não vale; o clique abre o QR com o que foi guardado; valeu, o botão some, o Pix é esquecido e a senha aparece", async () => {
    comTentativa();
    guardarPix({ segredo: "pi_pix_secret_x", chavePublicavel: "pk_test_da_tela", email: "visitante@exemplo.com" });
    confirmarSemLogin.mockResolvedValue({ confirmada: false });
    abrir({ conferirACada: 20 });
    fireEvent.click(await screen.findByRole("button", { name: "Mostrar o QR de novo" }));
    await waitFor(() => expect(mostrarQrDeNovo).toHaveBeenCalledWith("pk_test_da_tela", "pi_pix_secret_x", "visitante@exemplo.com", expect.any(Function)));
    expect(lerPix()).not.toBeNull();

    confirmarSemLogin.mockResolvedValue({ confirmada: true });
    expect(await screen.findByLabelText("Crie uma senha")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mostrar o QR de novo" })).toBeNull();
    expect(lerPix()).toBeNull();
  });

  // O QR VENCIDO só ganha outro se o valor ainda for o preço de um plano (achado 8): a tela entrega os preços de
  // AGORA, pela rota do visitante — e só os lê quando o Stripe.js pergunta (o QR venceu).
  it("os preços de agora vêm da rota do visitante, e só quando o Stripe.js pergunta (o QR venceu — achado 8)", async () => {
    comTentativa();
    guardarPix({ segredo: "pi_pix_secret_x", chavePublicavel: "pk_test_da_tela", email: "visitante@exemplo.com" });
    confirmarSemLogin.mockResolvedValue({ confirmada: false });
    abrir({ conferirACada: 20 });
    fireEvent.click(await screen.findByRole("button", { name: "Mostrar o QR de novo" }));
    await waitFor(() => expect(mostrarQrDeNovo).toHaveBeenCalledTimes(1));
    expect(getPlanosSemLogin).not.toHaveBeenCalled();
    const precosDeAgora = mostrarQrDeNovo.mock.calls[0]![3];
    expect(await precosDeAgora()).toEqual([9990, 99500]);
    expect(getPlanosSemLogin).toHaveBeenCalledTimes(1);
  });
});

// O PEDIDO DE CONFERÊNCIA (E2 da revisão ampla da cobrança, 29/10/2026), sem conta: pela tentativa desta aba.
describe("depois do pagamento, sem conta — o pedido de conferência na Stripe", () => {
  it("sem confirmação: pede com a tentativa desta aba, depois do prazo, no máximo 5 vezes; sem tentativa, nada", async () => {
    comTentativa();
    confirmarSemLogin.mockResolvedValue({ confirmada: false });
    abrir({ conferirACada: 20, pedirConferencia: { primeiraEm: 40, aCada: 25 } });
    await waitFor(() => expect(conferirSemLogin).toHaveBeenCalledTimes(5), { timeout: 2_000 });
    expect(conferirSemLogin.mock.calls.every(([t]) => t === TENTATIVA)).toBe(true);
    await new Promise((fim) => setTimeout(fim, 150));
    expect(conferirSemLogin).toHaveBeenCalledTimes(5);
  });

  it("sem a tentativa nesta aba: não pede nada (vai para a tela de entrar)", async () => {
    abrir({ pedirConferencia: { primeiraEm: 20, aCada: 20 } });
    await waitFor(() => expect(ir).toHaveBeenCalledWith("/login"));
    await new Promise((fim) => setTimeout(fim, 120));
    expect(conferirSemLogin).not.toHaveBeenCalled();
  });

  it("confirmada: não pede", async () => {
    comTentativa();
    confirmarSemLogin.mockResolvedValue({ confirmada: true });
    abrir({ conferirACada: 20, pedirConferencia: { primeiraEm: 40, aCada: 25 } });
    expect(await screen.findByLabelText("Crie uma senha")).toBeTruthy();
    await new Promise((fim) => setTimeout(fim, 150));
    expect(conferirSemLogin).not.toHaveBeenCalled();
  });
});
