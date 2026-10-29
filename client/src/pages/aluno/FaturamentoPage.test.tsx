// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import type { MinhaAssinatura, TrocaDesfeita } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
const manterMinhaAssinatura = vi.fn<() => Promise<void>>();
const desistirDaTroca = vi.fn<() => Promise<TrocaDesfeita>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMinhaAssinatura: () => getMinhaAssinatura(),
  manterMinhaAssinatura: () => manterMinhaAssinatura(),
  desistirDaTroca: () => desistirDaTroca(),
}));

import { FaturamentoPage } from "./FaturamentoPage";

// FATURAMENTO E ASSINATURA — o resumo (Fase 4, etapa 4.6). O que estes testes protegem:
//   - a tela diz o que o SERVIDOR disse da assinatura, em cada situação — e nunca mostra um
//     plano, uma cobrança ou um cartão enquanto carrega ou quando a leitura falha;
//   - quem não tem assinatura é levado a assinar; quem já teve, a reativar;
//   - o valor da próxima cobrança é o que veio do servidor (com desconto, é menor que o preço);
//   - a cobrança que falhou aparece como alerta; a renovação parada, com a data do fim;
//   - do cartão só aparecem a bandeira, os 4 últimos e a validade;
//   - em inglês, tudo em inglês.

const MEIO_DIA = "2026-11-10T15:00:00.000Z";
const VISA = { bandeira: "visa", final: "4242", mes: 3, ano: 2028 };
const ATIVA: MinhaAssinatura = {
  situacao: "ativa",
  plano: "mensal",
  preco: { centavos: 9990, moeda: "brl" },
  proximaCobranca: { centavos: 9990, moeda: "brl", em: MEIO_DIA },
  acessoAte: null,
  cartao: VISA,
  aceitaCartao: true,
  podeParar: true,
  podeManter: false,
  terminaAoCancelar: false,
  reembolso: null,
  podeMudarDePlano: true,
  trocaMarcada: null,
};

const abrir = (ui = <FaturamentoPage />) =>
  renderWithProviders(ui, {
    route: "/aluno/conta/faturamento",
    path: "/aluno/conta/faturamento",
    extraRoutes: [
      { path: "/aluno/assinar", element: <p>TELA DE ASSINAR</p> },
      { path: "/aluno/conta/faturamento/cartao", element: <p>TELA DE TROCAR O CARTÃO</p> },
      { path: "/aluno/conta/faturamento/cancelar", element: <p>TELA DE CANCELAR</p> },
      { path: "/aluno/conta/faturamento/plano", element: <p>TELA DE MUDAR DE PLANO</p> },
    ],
  });

/** O texto da tela, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const naTela = () => (document.body.textContent ?? "").replace(/ /g, " ");

beforeEach(() => {
  getMinhaAssinatura.mockReset().mockResolvedValue(ATIVA);
  manterMinhaAssinatura.mockReset().mockResolvedValue(undefined);
  desistirDaTroca.mockReset().mockResolvedValue({ trocado: false });
});

describe("FaturamentoPage — carregando e falha", () => {
  it("enquanto carrega: o título e 'Carregando…', sem plano, sem cartão e sem botão", () => {
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Faturamento e Assinatura");
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByText("Forma de pagamento")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("a leitura falhou: o erro, e nada da assinatura", async () => {
    getMinhaAssinatura.mockRejectedValue(new Error("500"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByText("Carregando…")).toBeNull();
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("FaturamentoPage — a leitura que falha DEPOIS de ter dado certo", () => {
  it("ao voltar à aba a tela lê de novo; se falhar, mostra só a falha — e não o plano e o cartão de antes", async () => {
    abrir();
    expect(await screen.findByText("Visa •••• 4242 · vence em 03/2028")).toBeTruthy();
    getMinhaAssinatura.mockRejectedValue(new Error("500"));
    // É o que o navegador avisa quando a pessoa volta para a aba: a tela busca de novo.
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByText("Visa •••• 4242 · vence em 03/2028")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("FaturamentoPage — sem acesso", () => {
  it("nunca assinou: diz que não tem assinatura e leva a ASSINAR", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "nenhuma" });
    abrir();
    expect(await screen.findByText("Você ainda não tem uma assinatura.")).toBeTruthy();
    expect(screen.queryByText("Seu plano")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Assinar" }));
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
  });

  it("já foi assinante: diz o dia em que terminou e leva a REATIVAR", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "terminada", terminouEm: MEIO_DIA });
    abrir();
    expect(await screen.findByText("Sua assinatura terminou em 10/11/2026.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Assinar" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Reativar assinatura" }));
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
  });

  it("terminada sem data: a frase sem a data, em vez de uma data inventada", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "terminada", terminouEm: null });
    abrir();
    expect(await screen.findByText("Sua assinatura terminou.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reativar assinatura" })).toBeTruthy();
  });
});

describe("FaturamentoPage — com acesso", () => {
  it("ativa: o plano com o preço, a próxima cobrança com valor e data, e o cartão", async () => {
    abrir();
    expect(await screen.findByText("Seu plano")).toBeTruthy();
    expect(naTela()).toContain("Mensal · R$ 99,90/mês");
    expect(naTela()).toContain("Próxima cobrança: R$ 99,90 em 10/11/2026");
    expect(screen.getByText("Forma de pagamento")).toBeTruthy();
    expect(screen.getByText("Visa •••• 4242 · vence em 03/2028")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/termina em/)).toBeNull();
  });

  it("o plano anual: 'Anual' e 'por ano'", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, plano: "anual", preco: { centavos: 99500, moeda: "brl" }, proximaCobranca: { centavos: 99500, moeda: "brl", em: MEIO_DIA } });
    abrir();
    await screen.findByText("Seu plano");
    expect(naTela()).toContain("Anual · R$ 995,00/ano");
    expect(naTela()).not.toContain("Mensal");
  });

  it("com desconto: a próxima cobrança é o valor que o SERVIDOR mandou, não o preço do plano", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, proximaCobranca: { centavos: 0, moeda: "brl", em: MEIO_DIA } });
    abrir();
    await screen.findByText("Seu plano");
    expect(naTela()).toContain("Mensal · R$ 99,90/mês");
    expect(naTela()).toContain("Próxima cobrança: R$ 0,00 em 10/11/2026");
  });

  it("a renovação foi parada: a data até quando há acesso, e nenhuma próxima cobrança", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA });
    abrir();
    expect(await screen.findByText("Sua assinatura termina em 10/11/2026. Você continua com acesso até lá.")).toBeTruthy();
    expect(naTela()).not.toContain("Próxima cobrança");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a última cobrança falhou: o alerta para trocar o cartão, sem próxima cobrança nem data de fim", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "atrasada", proximaCobranca: null });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não conseguimos cobrar o seu cartão. Troque o cartão para não perder o acesso.");
    expect(naTela()).not.toContain("Próxima cobrança");
    expect(screen.queryByText(/termina em/)).toBeNull();
  });

  // A TOLERÂNCIA DE 3 DIAS (etapa 4.6b — decisão do operador, 11 e 12/10/2026): dentro dela, o
  // alerta diz até quando; depois, que as aulas trancaram. Quem diz as duas coisas é o servidor.
  it("a cobrança falhou há menos de 3 dias: o alerta traz a data em que as aulas trancam", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "atrasada", proximaCobranca: null, aulasAte: MEIO_DIA, aulasTrancadas: false });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não conseguimos cobrar o seu cartão. Troque o cartão até 10/11/2026 para não perder o acesso.");
  });

  it("a cobrança falhou há mais de 3 dias: o alerta diz que as aulas estão trancadas — sem prometer data —, e o cartão continua trocável", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "atrasada", proximaCobranca: null, aulasAte: MEIO_DIA, aulasTrancadas: true });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não conseguimos cobrar o seu cartão, e as aulas estão trancadas. Troque o cartão para voltar a estudar.");
    expect(naTela()).not.toContain("10/11/2026");
    expect(screen.getByRole("link", { name: "Trocar cartão" }).getAttribute("href")).toBe("/aluno/conta/faturamento/cartao");
  });

  it("sem cartão guardado: diz que não há cartão, em vez de um cartão em branco", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: null });
    abrir();
    expect(await screen.findByText("Nenhum cartão cadastrado.")).toBeTruthy();
    expect(naTela()).not.toContain("••••");
  });

  it("com cartão: o botão 'Trocar cartão' leva à tela de trocar", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("link", { name: "Trocar cartão" }));
    expect(await screen.findByText("TELA DE TROCAR O CARTÃO")).toBeTruthy();
  });

  it("sem cartão: o botão diz 'Adicionar cartão', e leva à mesma tela", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: null });
    abrir();
    expect(screen.queryByRole("link", { name: "Trocar cartão" })).toBeNull();
    fireEvent.click(await screen.findByRole("link", { name: "Adicionar cartão" }));
    expect(await screen.findByText("TELA DE TROCAR O CARTÃO")).toBeTruthy();
  });

  it("assinatura que o servidor diz que NÃO aceita cartão (encerrada de vez, com dias pagos): sem botão", async () => {
    // Como o servidor manda a encerrada de vez: não aceita cartão, não renova (nada a parar) e não muda de plano.
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA, aceitaCartao: false, podeParar: false, podeMudarDePlano: false });
    abrir();
    expect(await screen.findByText("Visa •••• 4242 · vence em 03/2028")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("bandeira que a tela não conhece: só os 4 últimos e a validade, sem um nome errado", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: { ...VISA, bandeira: "unknown" } });
    abrir();
    expect(await screen.findByText("•••• 4242 · vence em 03/2028")).toBeTruthy();
  });

  it("preço que não é de nenhum dos dois planos: a tela abre, sem a linha do plano", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, plano: null, preco: null });
    abrir();
    expect(await screen.findByText("Seu plano")).toBeTruthy();
    expect(naTela()).not.toContain("Mensal");
    expect(naTela()).toContain("Próxima cobrança: R$ 99,90 em 10/11/2026");
  });
});

// CANCELAR E MANTER, NO RESUMO (sessão b). O que protege: cada botão só aparece quando o
// SERVIDOR diz que a ação cabe — a tela nunca oferece o que ele vai recusar —, e "Manter a
// assinatura" só diz que deu certo quando deu.
describe("FaturamentoPage — cancelar e manter a assinatura", () => {
  const PARADA: MinhaAssinatura = { ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA, podeParar: false, podeManter: true };
  const cancelar = () => screen.queryByRole("link", { name: "Cancelar assinatura" });
  const manter = () => screen.queryByRole("button", { name: "Manter a assinatura" });

  it("quem renova: o caminho para a tela de cancelar — e nada de 'Manter a assinatura'", async () => {
    abrir();
    expect((await screen.findByRole("link", { name: "Cancelar assinatura" })).getAttribute("href")).toBe("/aluno/conta/faturamento/cancelar");
    expect(manter()).toBeNull();
    fireEvent.click(cancelar()!);
    expect(await screen.findByText("TELA DE CANCELAR")).toBeTruthy();
  });

  it("a renovação parada, fora do prazo do reembolso: só 'Manter a assinatura' — cancelar de novo não cabe", async () => {
    getMinhaAssinatura.mockResolvedValue(PARADA);
    abrir();
    expect(await screen.findByRole("button", { name: "Manter a assinatura" })).toBeTruthy();
    expect(cancelar()).toBeNull();
  });

  it("a renovação parada e ainda no prazo do reembolso: os dois — manter, e o caminho para receber o dinheiro de volta", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...PARADA, reembolso: { centavos: 9990, moeda: "brl", ate: MEIO_DIA } });
    abrir();
    expect(await screen.findByRole("button", { name: "Manter a assinatura" })).toBeTruthy();
    expect(cancelar()).toBeTruthy();
  });

  it("com a cobrança atrasada: dá para cancelar (termina na hora)", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "atrasada", proximaCobranca: null, podeParar: false, terminaAoCancelar: true });
    abrir();
    expect(await screen.findByRole("link", { name: "Cancelar assinatura" })).toBeTruthy();
    expect(manter()).toBeNull();
  });

  it("encerrada de vez, ainda com dias pagos: nem cancelar, nem manter", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...PARADA, podeManter: false, aceitaCartao: false });
    abrir();
    await screen.findByText("Sua assinatura termina em 10/11/2026. Você continua com acesso até lá.");
    expect(cancelar()).toBeNull();
    expect(manter()).toBeNull();
  });

  it("encerrada de vez e ainda no prazo do reembolso (a devolução falhou): o caminho para receber o dinheiro — mas NÃO 'Manter', que ela não volta", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...PARADA, podeManter: false, aceitaCartao: false, reembolso: { centavos: 9990, moeda: "brl", ate: MEIO_DIA } });
    abrir();
    expect(await screen.findByRole("link", { name: "Cancelar assinatura" })).toBeTruthy();
    expect(manter()).toBeNull();
  });

  it("'Manter a assinatura': pede ao servidor, diz que deu certo e lê a assinatura de novo — sem mandar nada que escolha qual", async () => {
    getMinhaAssinatura.mockResolvedValueOnce(PARADA).mockResolvedValue(ATIVA);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Manter a assinatura" }));
    expect((await screen.findByRole("status")).textContent).toBe("Pronto. Sua assinatura continua.");
    expect(manterMinhaAssinatura).toHaveBeenCalledTimes(1);
    expect(manterMinhaAssinatura.mock.calls[0]).toEqual([]);
    // Lida de novo: volta a renovar, com a próxima cobrança — e o botão de manter some.
    expect(await screen.findByText(/Próxima cobrança:/)).toBeTruthy();
    expect(manter()).toBeNull();
  });

  it("o servidor recusou: a frase da falha — nunca 'sua assinatura continua'", async () => {
    getMinhaAssinatura.mockResolvedValue(PARADA);
    manterMinhaAssinatura.mockRejectedValue(new Error("409"));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Manter a assinatura" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível manter a assinatura. Tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  // O LIMITE DE TENTATIVAS (etapa 4.7, passo 1 — a frase é do operador, 19/10/2026).
  it("muitas tentativas ao manter: a frase de esperar — nunca 'sua assinatura continua'", async () => {
    getMinhaAssinatura.mockResolvedValue(PARADA);
    manterMinhaAssinatura.mockRejectedValue({ response: { status: 429, data: { error: "MuitasTentativas" } } });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Manter a assinatura" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("enquanto envia: o botão fica desligado — um clique a mais não pede duas vezes", async () => {
    getMinhaAssinatura.mockResolvedValue(PARADA);
    manterMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Manter a assinatura" }));
    const enviando = await screen.findByRole("button", { name: "Processando…" });
    expect((enviando as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(enviando);
    expect(manterMinhaAssinatura).toHaveBeenCalledTimes(1);
  });

});

// MUDAR DE PLANO, NO RESUMO (sessão b). O que protege: o caminho só aparece quando o servidor
// diz que dá para mudar; e a troca MARCADA para o fim do período aparece com a data e com o
// botão de desistir — que só diz que deu certo quando deu.
describe("FaturamentoPage — mudar de plano", () => {
  const ANUAL_COM_TROCA: MinhaAssinatura = { ...ATIVA, plano: "anual", preco: { centavos: 99500, moeda: "brl" }, podeMudarDePlano: false, trocaMarcada: { plano: "mensal", em: MEIO_DIA } };
  const mudar = () => screen.queryByRole("link", { name: "Mudar de plano" });

  it("quem pode mudar: o caminho para a tela de mudar de plano", async () => {
    abrir();
    expect((await screen.findByRole("link", { name: "Mudar de plano" })).getAttribute("href")).toBe("/aluno/conta/faturamento/plano");
    fireEvent.click(mudar()!);
    expect(await screen.findByText("TELA DE MUDAR DE PLANO")).toBeTruthy();
  });

  it("quem NÃO pode (parou a renovação, está atrasado, já marcou a troca): sem o caminho", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, podeMudarDePlano: false });
    abrir();
    await screen.findByText("Seu plano");
    expect(mudar()).toBeNull();
  });

  it("com a troca MARCADA: diz para qual plano e quando, e oferece desistir", async () => {
    getMinhaAssinatura.mockResolvedValue(ANUAL_COM_TROCA);
    abrir();
    expect(await screen.findByText("Seu plano muda para Mensal em 10/11/2026.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continuar no Anual" })).toBeTruthy();
    expect(mudar()).toBeNull();
  });

  it("'Continuar no Anual': pede ao servidor, diz que deu certo e lê a assinatura de novo", async () => {
    getMinhaAssinatura.mockResolvedValueOnce(ANUAL_COM_TROCA).mockResolvedValue({ ...ANUAL_COM_TROCA, podeMudarDePlano: true, trocaMarcada: null });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Continuar no Anual" }));
    expect((await screen.findByRole("status")).textContent).toBe("Pronto. Você continua no plano Anual.");
    expect(desistirDaTroca).toHaveBeenCalledTimes(1);
    // Lida de novo: a troca saiu, e mudar de plano volta a caber.
    expect(await screen.findByRole("link", { name: "Mudar de plano" })).toBeTruthy();
    expect(screen.queryByText("Seu plano muda para Mensal em 10/11/2026.")).toBeNull();
  });

  it("o servidor recusou desistir: a frase da falha — nunca 'você continua no Anual'", async () => {
    getMinhaAssinatura.mockResolvedValue(ANUAL_COM_TROCA);
    desistirDaTroca.mockRejectedValue(new Error("500"));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Continuar no Anual" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível mudar o plano. Tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("muitas tentativas ao desistir da troca: a frase de esperar — nunca 'você continua no Anual'", async () => {
    getMinhaAssinatura.mockResolvedValue(ANUAL_COM_TROCA);
    desistirDaTroca.mockRejectedValue({ response: { status: 429, data: { error: "MuitasTentativas" } } });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Continuar no Anual" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
  });

});

// A PRÉ-PAGA (etapa 4.9, passo 3 — texto do operador, 28/10/2026): nasceu de um Pix, não renova e não tem
// cartão. O que a tela diz é o que o SERVIDOR mandou (`prePago`, as permissões); aqui só se desenha.
describe("FaturamentoPage — a pré-paga (Pix)", () => {
  const PRE_PAGA: MinhaAssinatura = { ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA, cartao: null, aceitaCartao: false, podeParar: false, podeManter: false, podeMudarDePlano: false, prePago: true };

  it("diz até quando vai o acesso e que se paga de novo quando acabar; a forma de pagamento é Pix; sem trocar cartão, cancelar, manter nem mudar de plano", async () => {
    getMinhaAssinatura.mockResolvedValue(PRE_PAGA);
    abrir();
    expect(await screen.findByText("Seu acesso vai até 10/11/2026. Para continuar, é só pagar de novo quando acabar.")).toBeTruthy();
    expect(naTela()).not.toContain("Sua assinatura termina em");
    expect(naTela()).not.toContain("Próxima cobrança");
    expect(screen.getByText("Pix")).toBeTruthy();
    expect(naTela()).not.toContain("Nenhum cartão cadastrado.");
    for (const nome of ["Trocar cartão", "Adicionar cartão", "Cancelar assinatura", "Mudar de plano"]) expect(screen.queryByRole("link", { name: nome })).toBeNull();
    expect(screen.queryByRole("button", { name: "Manter a assinatura" })).toBeNull();
  });

  it("ainda no prazo do reembolso: o caminho para cancelar (e receber o Pix de volta) continua", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...PRE_PAGA, reembolso: { centavos: 9990, moeda: "brl", ate: MEIO_DIA } });
    abrir();
    expect(await screen.findByRole("link", { name: "Cancelar assinatura" })).toBeTruthy();
  });

  it("a renovação parada de um cartão (sem a marca): continua com o texto de sempre e o cartão", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA, podeParar: false, podeManter: true });
    abrir();
    expect(await screen.findByText("Sua assinatura termina em 10/11/2026. Você continua com acesso até lá.")).toBeTruthy();
    expect(naTela()).not.toContain("pagar de novo quando acabar");
    expect(screen.queryByText("Pix")).toBeNull();
  });
});
