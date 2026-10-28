// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

// Mock na NOSSA fronteira (`@/lib/auth-client`), nunca em `better-auth/react`:
// o teste sobrevive a trocar a biblioteca de auth.
const signInEmail = vi.fn();
const useSession = vi.fn();
const refetch = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args) },
  useSession: () => useSession(),
}));

import { LoginPage } from "./LoginPage";

/**
 * Monta a tela com destinos reais para o Início e para o Dashboard, para poder
 * assertar para ONDE cada um foi levado.
 */
function renderLogin(route = "/login") {
  return renderWithProviders(<LoginPage />, {
    route,
    path: "/login",
    extraRoutes: [
      { path: "/inicio", element: <div>HOME DO ALUNO</div> },
      { path: "/dashboard", element: <div>PAINEL DO ADMIN</div> },
    ],
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
  useSession.mockReturnValue({ data: null, isPending: false, refetch });
  refetch.mockResolvedValue(undefined);
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
      await screen.findByText("Não foi possível entrar agora. Tente novamente em alguns minutos."),
    ).toBeTruthy();
    expect(screen.queryByText("E-mail ou senha incorretos.")).toBeNull();
  });

  it("sucesso: navega para a home do aluno", async () => {
    renderLogin();
    preencher({ email: "a@b.com", senha: "minhasenha" });
    enviar();

    expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
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
    await waitFor(() => expect(screen.getByText("HOME DO ALUNO")).toBeTruthy());
  });

  it("sessão já ativa: redireciona sem renderizar o formulário", async () => {
    useSession.mockReturnValue({ data: { user: { id: "1" } }, isPending: false });
    renderLogin();

    expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
    expect(screen.queryByLabelText("Senha")).toBeNull();
  });
});

// QUEM ENTRA COMEÇA DO ZERO (decisão do operador, 11/10/2026). "Sair" limpa o que as telas
// guardaram (teste em `Layout.test.tsx`); a sessão que acaba SOZINHA não passa por ele. O teste
// usa um cliente de leituras só para as duas contas, como a aba do navegador.
describe("LoginPage — quem entra não vê nada da conta anterior", () => {
  const GUARDADO = ["o-que-a-tela-guardou"];
  function TelaDaContaAnterior() {
    const { data } = useQuery({ queryKey: GUARDADO, queryFn: () => Promise.resolve("o progresso da Ana") });
    return <p>{data ?? "lendo"}</p>;
  }
  function QuemEntrou() {
    const guardado = useQueryClient().getQueryData<string>(GUARDADO);
    return <p>{guardado ? `ainda guardado: ${guardado}` : "nada guardado da conta anterior"}</p>;
  }
  // O cliente de leituras da "aba", para olhar o que está GUARDADO (a tela aberta continua
  // mostrando o que já leu mesmo depois de uma limpeza — olhar a tela não provaria nada).
  let daAba: QueryClient | null = null;
  function Captura() {
    daAba = useQueryClient();
    return null;
  }
  const montar = () =>
    renderWithProviders(
      <>
        <Captura />
        <TelaDaContaAnterior />
        <LoginPage />
      </>,
      { route: "/login", path: "/login", extraRoutes: [{ path: "/inicio", element: <QuemEntrou /> }] },
    );

  it("ao entrar, o que as telas tinham guardado é esquecido", async () => {
    montar();
    expect(await screen.findByText("o progresso da Ana")).toBeTruthy();
    preencher({ email: "bia@exemplo.com", senha: "minhasenha" });
    enviar();
    expect(await screen.findByText("nada guardado da conta anterior")).toBeTruthy();
  });

  it("senha errada não limpa nada: quem não entrou não mexe no que está guardado", async () => {
    signInEmail.mockResolvedValue({ error: { status: 401 } });
    montar();
    expect(await screen.findByText("o progresso da Ana")).toBeTruthy();
    preencher({ email: "bia@exemplo.com", senha: "errada" });
    enviar();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(daAba?.getQueryData(GUARDADO)).toBe("o progresso da Ana");
  });
});

describe("LoginPage — destaque visual do erro", () => {
  // A cor sozinha não avisa quem não distingue vermelho ou usa leitor de tela.
  // `aria-invalid` é a MESMA marcação que pinta o campo e que o leitor anuncia —
  // por isso os testes olham para ela, e não para classe de CSS (que é detalhe
  // de implementação e muda na próxima passada de design).
  it("campo com erro de validação é marcado como inválido", async () => {
    renderLogin();
    preencher({ email: "sem-arroba", senha: "minhasenha" });
    enviar();

    await screen.findByText("Informe um e-mail válido.");
    expect(screen.getByLabelText("E-mail").getAttribute("aria-invalid")).toBe("true");
    // O campo CERTO não é marcado — marcar tudo é o mesmo que não marcar nada.
    expect(screen.getByLabelText("Senha").getAttribute("aria-invalid")).toBe("false");
  });

  it("credencial recusada marca os DOIS campos", async () => {
    signInEmail.mockResolvedValue({ error: { status: 401 } });
    renderLogin();
    preencher({ email: "a@b.com", senha: "errada" });
    enviar();

    await screen.findByText("E-mail ou senha incorretos.");
    // Os dois, porque o servidor não revela qual está errado — de propósito.
    // Marcar só um seria dica errada.
    expect(screen.getByLabelText("E-mail").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Senha").getAttribute("aria-invalid")).toBe("true");
  });

  it("sem erro, nenhum campo é marcado", () => {
    renderLogin();
    expect(screen.getByLabelText("E-mail").getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByLabelText("Senha").getAttribute("aria-invalid")).toBe("false");
  });

  it("a falha é ANUNCIADA por leitor de tela, não só pintada", async () => {
    signInEmail.mockResolvedValue({ error: { status: 401 } });
    renderLogin();
    preencher({ email: "a@b.com", senha: "errada" });
    enviar();

    // role="alert" é o que faz o leitor falar assim que a mensagem aparece.
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe("E-mail ou senha incorretos.");
  });

  // O detalhe que faltava para ficar igual à referência (Apple Store): o RÓTULO
  // também muda de cor, não só a borda do campo. Ajuda quem varre a tela rápido
  // e não lê a mensagem — o olho acha o campo errado pelo texto, não pela borda.
  it("o rótulo do campo com erro também fica destacado", async () => {
    signInEmail.mockResolvedValue({ error: { status: 401 } });
    renderLogin();
    preencher({ email: "a@b.com", senha: "errada" });
    enviar();

    await screen.findByText("E-mail ou senha incorretos.");
    // `closest("label")` em vez de classe do container: o teste continua válido
    // se o layout mudar de lugar na próxima passada de design.
    expect(screen.getByText("E-mail").className).toContain("text-destructive");
    expect(screen.getByText("Senha").className).toContain("text-destructive");
  });

  it("sem erro, os rótulos ficam normais", () => {
    renderLogin();
    expect(screen.getByText("E-mail").className).not.toContain("text-destructive");
    expect(screen.getByText("Senha").className).not.toContain("text-destructive");
  });

  it("o campo aponta para a mensagem que o descreve", async () => {
    renderLogin();
    preencher({ email: "sem-arroba", senha: "minhasenha" });
    enviar();

    const msg = await screen.findByText("Informe um e-mail válido.");
    // Sem esta ligação, o leitor de tela diz "campo inválido" sem dizer por quê.
    expect(screen.getByLabelText("E-mail").getAttribute("aria-describedby")).toBe(msg.id);
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
      await screen.findByText("Não foi possível entrar agora. Tente novamente em alguns minutos."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Entrando…" })).toBeNull();
  });
});

// "JÁ TEM CONTA? ENTRAR" (etapa 4.7, passo 6e — decisão do operador, 27/10/2026): da tela pública de
// assinar, a pessoa entra e vai à tela de assinar do app. LISTA FECHADA: o endereço nunca escolhe um
// destino de fora dela — o que não está na lista vai para o Início.
describe("LoginPage — para onde ir depois de entrar", () => {
  function renderComDestinos(route: string) {
    return renderWithProviders(<LoginPage />, {
      route,
      path: "/login",
      extraRoutes: [
        { path: "/inicio", element: <div>HOME DO ALUNO</div> },
        { path: "/aluno/assinar", element: <div>TELA DE ASSINAR</div> },
        { path: "/aluno/conta/faturamento/cartao", element: <div>TELA DE TROCAR O CARTÃO</div> },
      ],
    });
  }

  it("com ?depois=assinar: depois de entrar, a tela de assinar do app", async () => {
    renderComDestinos("/login?depois=assinar");
    preencher({ email: "aluno@exemplo.com", senha: "minhasenha" });
    enviar();
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
  });

  it("já logado e com ?depois=assinar: direto para a tela de assinar", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false, refetch });
    renderComDestinos("/login?depois=assinar");
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
  });

  // O BOTÃO DOS E-MAILS DA COBRANÇA (etapa 4.7, passo 7): "Trocar cartão" leva a `/login?depois=cartao`.
  it("com ?depois=cartao: depois de entrar, a tela de trocar o cartão", async () => {
    renderComDestinos("/login?depois=cartao");
    preencher({ email: "aluno@exemplo.com", senha: "minhasenha" });
    enviar();
    expect(await screen.findByText("TELA DE TROCAR O CARTÃO")).toBeTruthy();
  });

  it("já logado e com ?depois=cartao: direto para a tela de trocar o cartão", async () => {
    useSession.mockReturnValue({ data: { user: { id: "u1" } }, isPending: false, refetch });
    renderComDestinos("/login?depois=cartao");
    expect(await screen.findByText("TELA DE TROCAR O CARTÃO")).toBeTruthy();
  });

  for (const depois of ["https://outro-site.com", "//outro-site.com", "/admin", "assinar2", "", "constructor", "__proto__", "toString"]) {
    it(`com ?depois=${depois || "(vazio)"}: o Início — nunca outro destino`, async () => {
      renderComDestinos(`/login?depois=${encodeURIComponent(depois)}`);
      preencher({ email: "aluno@exemplo.com", senha: "minhasenha" });
      enviar();
      expect(await screen.findByText("HOME DO ALUNO")).toBeTruthy();
    });
  }
});
