// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import type { MinhaAssinatura, MudarDePlanoInput, PlanoMudado, PlanosDaAssinatura, TrocaDesfeita, TrocaDisponivel } from "@jilson/core";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@/test-utils";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
const getTrocaDePlano = vi.fn<() => Promise<TrocaDisponivel>>();
const getPlanosDaAssinatura = vi.fn<() => Promise<PlanosDaAssinatura>>();
const mudarDePlano = vi.fn<(corpo: MudarDePlanoInput) => Promise<PlanoMudado>>();
const desistirDaTroca = vi.fn<() => Promise<TrocaDesfeita>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMinhaAssinatura: () => getMinhaAssinatura(),
  getTrocaDePlano: () => getTrocaDePlano(),
  getPlanosDaAssinatura: () => getPlanosDaAssinatura(),
  mudarDePlano: (corpo: MudarDePlanoInput) => mudarDePlano(corpo),
  desistirDaTroca: () => desistirDaTroca(),
}));

// A NOSSA fronteira com o Stripe.js vira dublê (nunca `@stripe/*`): a confirmação do banco
// responde o que o teste mandar.
const confirmarNoBanco = vi.fn<(chave: string, segredo: string) => Promise<"confirmado" | "nao-concluido">>();
vi.mock("@/lib/stripe-do-site", () => ({
  confirmarNoBanco: (chave: string, segredo: string) => confirmarNoBanco(chave, segredo),
}));

import { MudarDePlanoPage } from "./MudarDePlanoPage";
import { IdiomaProvider } from "@/lib/language";
import { RITMO } from "@/lib/troca-de-plano";

// A TELA DE MUDAR DE PLANO (Fase 4, etapa 4.6, sessão b). É COBRANÇA. O que estes testes protegem:
//   - o valor e as datas na tela são os que o SERVIDOR mandou — a tela não calcula nada —, e o
//     valor é mostrado ANTES do botão;
//   - ao servidor vão só PARA QUAL plano e o valor que a tela MOSTROU (ele o confere e cobra
//     exatamente o mostrado, num clique só): nunca um preço;
//   - "seu plano agora é o Anual" só aparece quando o servidor disse que trocou (ou o banco
//     confirmou); recusa, confirmação não concluída e falha têm cada uma a sua frase;
//   - se a confirmação do banco não é concluída — por QUALQUER motivo —, a troca pendente é
//     desfeita na hora; e "nada foi cobrado" só é dito se o SERVIDOR disser que o plano
//     continua o mesmo (a janela do banco pode dar erro depois de o pagamento ter passado);
//   - depois de qualquer falha, vale o que o servidor diz agora: se a troca já foi feita, a
//     tela diz que deu certo em vez de pedir de novo;
//   - quem não pode mudar (parou, atrasou) lê o porquê; com a troca já marcada, dá para desistir;
//   - em inglês, tudo em inglês.

const FIM_DO_MES = "2026-11-10T15:00:00.000Z";
const EM_UM_ANO = "2027-10-11T15:00:00.000Z";
const MENSAL: MinhaAssinatura = {
  situacao: "ativa",
  plano: "mensal",
  preco: { centavos: 9990, moeda: "brl" },
  proximaCobranca: { centavos: 9990, moeda: "brl", em: FIM_DO_MES },
  acessoAte: null,
  cartao: null,
  aceitaCartao: true,
  podeParar: true,
  podeManter: false,
  terminaAoCancelar: false,
  reembolso: null,
  podeMudarDePlano: true,
  trocaMarcada: null,
};
const ANUAL: MinhaAssinatura = { ...MENSAL, plano: "anual", preco: { centavos: 99500, moeda: "brl" }, proximaCobranca: { centavos: 99500, moeda: "brl", em: EM_UM_ANO } };
const PARA_O_ANUAL: TrocaDisponivel = { troca: { para: "anual", quando: "agora", preco: { centavos: 99500, moeda: "brl" }, hoje: { centavos: 92840, moeda: "brl" }, proximaEm: EM_UM_ANO } };
const PARA_O_MENSAL: TrocaDisponivel = { troca: { para: "mensal", quando: "fim-do-periodo", preco: { centavos: 9990, moeda: "brl" }, em: EM_UM_ANO } };
const PLANOS: PlanosDaAssinatura = { chavePublicavel: "pk_test_da_tela", planos: [], formasDePagamento: ["card"] };
const recusa = (error: string, status = 409) => Object.assign(new Error(error), { response: { status, data: { error } } });

const abrir = (ui = <MudarDePlanoPage />) =>
  renderWithProviders(ui, {
    route: "/aluno/conta/faturamento/plano",
    path: "/aluno/conta/faturamento/plano",
    extraRoutes: [
      { path: "/aluno/conta/faturamento", element: <p>RESUMO DA ASSINATURA</p> },
      { path: "/aluno/conta/faturamento/cartao", element: <p>TELA DE TROCAR O CARTÃO</p> },
    ],
  });
/** O texto da tela, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const naTela = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const paraOAnual = () => screen.findByRole("button", { name: "Mudar para o Anual" });

beforeEach(() => {
  getMinhaAssinatura.mockReset().mockResolvedValue(MENSAL);
  getTrocaDePlano.mockReset().mockResolvedValue(PARA_O_ANUAL);
  getPlanosDaAssinatura.mockReset().mockResolvedValue(PLANOS);
  mudarDePlano.mockReset().mockResolvedValue({ estado: "trocado" });
  desistirDaTroca.mockReset().mockResolvedValue({ trocado: false, plano: "mensal" });
  confirmarNoBanco.mockReset().mockResolvedValue("confirmado");
  // As esperas entre leituras e tentativas, encurtadas: o que se testa é a ORDEM, não o relógio.
  RITMO.espera = 1;
});

describe("MudarDePlanoPage — carregando, falha e nada a mostrar", () => {
  it("enquanto carrega (a assinatura, ou a conta da troca): 'Carregando…', sem valor e sem botão", async () => {
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    const { unmount } = abrir();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Mudar de plano");
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    unmount();
    getMinhaAssinatura.mockResolvedValue(MENSAL);
    getTrocaDePlano.mockReturnValue(new Promise(() => {}));
    abrir();
    await waitFor(() => expect(getTrocaDePlano).toHaveBeenCalled());
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("a chave do Stripe.js ainda não chegou: sem botão — sem ela a janela do banco não abriria, e a troca seria desfeita à toa", async () => {
    getPlanosDaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    await waitFor(() => expect(getPlanosDaAssinatura).toHaveBeenCalled());
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mudar para o Anual" })).toBeNull();
  });

  it("a leitura falhou (a assinatura, ou a conta da troca): o erro, e nenhum botão de trocar às cegas", async () => {
    getTrocaDePlano.mockRejectedValue(new Error("500"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sem assinatura, ou sem troca nenhuma a oferecer: volta ao resumo", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "nenhuma" });
    const { unmount } = abrir();
    expect(await screen.findByText("RESUMO DA ASSINATURA")).toBeTruthy();
    unmount();
    getMinhaAssinatura.mockResolvedValue(MENSAL);
    getTrocaDePlano.mockResolvedValue({ troca: null });
    abrir();
    expect(await screen.findByText("RESUMO DA ASSINATURA")).toBeTruthy();
    expect(mudarDePlano).not.toHaveBeenCalled();
  });
});

describe("MudarDePlanoPage — do Mensal para o Anual, na hora", () => {
  it("mostra o plano de hoje, o plano novo e — ANTES do botão — quanto se paga hoje e a cobrança seguinte, como o servidor mandou", async () => {
    abrir();
    await paraOAnual();
    expect(screen.getByText("Escolha como prefere pagar. O acesso é o mesmo nos dois planos.")).toBeTruthy();
    expect(screen.getByText("Seu plano atual")).toBeTruthy();
    expect(naTela()).toContain("Mensal · R$ 99,90/mês");
    expect(naTela()).toContain("Anual · R$ 995,00/ano");
    // R$ 928,40 é o que o servidor disse que se paga HOJE — não é o preço do anual, e a tela não o calcula.
    expect(naTela()).toContain("A troca vale na hora. Hoje você paga R$ 928,40, já descontado o que sobrou do mês que você pagou. A próxima cobrança é em 11/10/2027.");
    // Sem prazo na tela (decisão do operador, 11/10/2026): o valor é cobrado como foi mostrado.
    expect(naTela()).not.toContain("minutos");
  });

  it("ao servidor vão só o plano e o valor que a tela MOSTROU — e a tela diz que trocou quando ELE diz, num clique só", async () => {
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("status")).textContent).toBe("Pronto. Seu plano agora é o Anual.");
    // R$ 928,40: exatamente o "hoje você paga" que o servidor mandou e a pessoa leu.
    expect(mudarDePlano.mock.calls).toEqual([[{ plano: "anual", valorMostrado: 92840 }]]);
    expect(screen.queryByRole("button", { name: "Mudar para o Anual" })).toBeNull();
    expect(screen.getByRole("link", { name: "Faturamento e Assinatura" }).getAttribute("href")).toBe("/aluno/conta/faturamento");
    expect(confirmarNoBanco).not.toHaveBeenCalled();
  });

  it("enquanto envia: o botão fica desligado e diz 'Processando…' — um clique a mais não cobra duas vezes", async () => {
    mudarDePlano.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.click(await paraOAnual());
    const enviando = await screen.findByRole("button", { name: "Processando…" });
    expect((enviando as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(enviando);
    expect(mudarDePlano).toHaveBeenCalledTimes(1);
  });

  it("cartão RECUSADO: a frase da recusa e o caminho para trocar o cartão — nunca 'seu plano agora é o Anual'", async () => {
    mudarDePlano.mockRejectedValue(recusa("CartaoRecusado", 402));
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("Seu cartão foi recusado e o plano continua o mesmo. Troque o cartão e tente de novo.");
    expect(screen.getByRole("link", { name: "Trocar cartão" }).getAttribute("href")).toBe("/aluno/conta/faturamento/cartao");
    expect(screen.queryByText("Pronto. Seu plano agora é o Anual.")).toBeNull();
  });

  it("outra falha: a frase da falha, e o botão continua lá para tentar de novo", async () => {
    mudarDePlano.mockRejectedValue(recusa("Ocupada"));
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível mudar o plano. Tente de novo.");
    expect(screen.queryByRole("link", { name: "Trocar cartão" })).toBeNull();
    expect(await paraOAnual()).toBeTruthy();
  });

  // DEPOIS DE QUALQUER FALHA VALE O QUE O SERVIDOR DIZ AGORA (achado da revisão de segurança,
  // segunda passada, 11/10/2026): a resposta de um pedido pode se perder depois de a troca ter
  // sido feita — e pedir de novo daria "não foi possível" para sempre.
  it("a resposta se perdeu no caminho, mas a troca FOI feita: a tela lê a assinatura e diz que deu certo — sem erro e sem pedir de novo", async () => {
    mudarDePlano.mockRejectedValue(new Error("Network Error"));
    getMinhaAssinatura.mockResolvedValueOnce(MENSAL).mockResolvedValue(ANUAL);
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("status")).textContent).toBe("Pronto. Seu plano agora é o Anual.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(mudarDePlano).toHaveBeenCalledTimes(1);
  });

  it("a falha em que o servidor NÃO trocou continua sendo falha: nunca 'seu plano agora é o Anual' por conta própria", async () => {
    mudarDePlano.mockRejectedValue(new Error("Network Error"));
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível mudar o plano. Tente de novo.");
    expect(screen.queryByText("Pronto. Seu plano agora é o Anual.")).toBeNull();
  });

  it("o caso raro — o servidor diz que o valor já não confere (a tela aberta por muitas horas): a tela pede outra conta, avisa que o valor foi atualizado — e o novo clique manda o valor NOVO", async () => {
    mudarDePlano.mockRejectedValueOnce(recusa("PreviaVencida"));
    getTrocaDePlano.mockResolvedValueOnce(PARA_O_ANUAL).mockResolvedValue({ troca: { para: "anual", quando: "agora", preco: { centavos: 99500, moeda: "brl" }, hoje: { centavos: 92950, moeda: "brl" }, proximaEm: EM_UM_ANO } });
    abrir();
    fireEvent.click(await paraOAnual());
    expect(await screen.findByText("Este valor foi atualizado. Confira e clique para concluir.")).toBeTruthy();
    await waitFor(() => expect(naTela()).toContain("Hoje você paga R$ 929,50"));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(await paraOAnual());
    await screen.findByText("Pronto. Seu plano agora é o Anual.");
    expect(mudarDePlano.mock.calls).toEqual([[{ plano: "anual", valorMostrado: 92840 }], [{ plano: "anual", valorMostrado: 92950 }]]);
  });
});

describe("MudarDePlanoPage — quando o banco pede confirmação", () => {
  beforeEach(() => {
    mudarDePlano.mockResolvedValue({ estado: "confirmar", segredo: "pi_7_secret_da_troca" });
  });

  it("a janela do banco abre com a chave e o segredo do servidor, e a tela diz o que fazer", async () => {
    confirmarNoBanco.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.click(await paraOAnual());
    expect(await screen.findByText("Seu banco pediu uma confirmação para esta cobrança. Conclua na janela do banco.")).toBeTruthy();
    await waitFor(() => expect(confirmarNoBanco.mock.calls).toEqual([["pk_test_da_tela", "pi_7_secret_da_troca"]]));
    expect(screen.queryByText("Pronto. Seu plano agora é o Anual.")).toBeNull();
  });

  it("confirmou: a tela SÓ diz que trocou depois de o servidor dizer Anual — sem desistir de nada", async () => {
    let responder: (assinatura: MinhaAssinatura) => void = () => {};
    getMinhaAssinatura.mockResolvedValueOnce(MENSAL).mockReturnValueOnce(new Promise((resolver) => (responder = resolver))).mockResolvedValue(ANUAL);
    abrir();
    fireEvent.click(await paraOAnual());
    // A leitura de depois do banco saiu e ainda não voltou: a tela espera, sem afirmar nada.
    await waitFor(() => expect(getMinhaAssinatura).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Pronto. Seu plano agora é o Anual.")).toBeNull();
    responder(ANUAL);
    expect(await screen.findByText("Pronto. Seu plano agora é o Anual.")).toBeTruthy();
    expect(desistirDaTroca).not.toHaveBeenCalled();
  });

  it("confirmou e o servidor ainda diz Mensal por um instante: a tela lê DE NOVO, e espera a resposta", async () => {
    let responder: (assinatura: MinhaAssinatura) => void = () => {};
    getMinhaAssinatura.mockResolvedValueOnce(MENSAL).mockResolvedValueOnce(MENSAL).mockReturnValueOnce(new Promise((resolver) => (responder = resolver))).mockResolvedValue(ANUAL);
    abrir();
    fireEvent.click(await paraOAnual());
    await waitFor(() => expect(getMinhaAssinatura).toHaveBeenCalledTimes(3));
    expect(screen.queryByText("Pronto. Seu plano agora é o Anual.")).toBeNull();
    responder(ANUAL);
    expect(await screen.findByText("Pronto. Seu plano agora é o Anual.")).toBeTruthy();
  });

  // As leituras que a tela faz por conta própria, esperando o plano novo, usam a MESMA consulta
  // da tela de Faturamento (achado da revisão de segurança, 11/10/2026): uma leitura avulsa
  // voltaria a guardar o plano e o cartão por minutos depois de a tela fechar.
  it("as leituras de depois do banco não ficam guardadas: fechada a tela, a assinatura é esquecida", async () => {
    const aba: { cliente?: QueryClient } = {};
    function Espia() {
      aba.cliente = useQueryClient();
      return null;
    }
    getMinhaAssinatura.mockResolvedValueOnce(MENSAL).mockResolvedValue(ANUAL);
    const { unmount } = abrir(
      <>
        <MudarDePlanoPage />
        <Espia />
      </>,
    );
    fireEvent.click(await paraOAnual());
    await screen.findByText("Pronto. Seu plano agora é o Anual.");
    expect(aba.cliente?.getQueryData(["billing", "minha-assinatura"])).toBeTruthy();
    unmount();
    await waitFor(() => expect(aba.cliente?.getQueryData(["billing", "minha-assinatura"])).toBeUndefined());
  });

  it("NÃO concluiu: a troca pendente é desfeita na hora, e a tela diz que nada foi cobrado", async () => {
    confirmarNoBanco.mockResolvedValue("nao-concluido");
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("A confirmação do banco não foi concluída. O plano continua o mesmo e nada foi cobrado.");
    expect(desistirDaTroca).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Pronto. Seu plano agora é o Anual.")).toBeNull();
  });

  it("não concluiu na tela, mas o servidor diz que o pagamento JÁ tinha passado: o plano mudou — a tela não diz 'nada foi cobrado'", async () => {
    confirmarNoBanco.mockResolvedValue("nao-concluido");
    desistirDaTroca.mockResolvedValue({ trocado: true, plano: "mensal" });
    abrir();
    fireEvent.click(await paraOAnual());
    expect(await screen.findByText("Pronto. Seu plano agora é o Anual.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // O ACHADO MAIS SÉRIO da segunda revisão de segurança (11/10/2026): a janela do banco pode dar
  // erro DEPOIS de o pagamento ter passado. Aí o servidor não tem mais nada a desfazer — e
  // responde em que plano a assinatura está. Com o Anual, a tela nunca diz "nada foi cobrado".
  it("a janela do banco deu erro depois de o pagamento PASSAR: nada a desfazer, o servidor diz Anual — a tela diz que trocou, e NUNCA 'nada foi cobrado'", async () => {
    confirmarNoBanco.mockResolvedValue("nao-concluido");
    desistirDaTroca.mockResolvedValue({ trocado: false, plano: "anual" });
    abrir();
    fireEvent.click(await paraOAnual());
    expect(await screen.findByText("Pronto. Seu plano agora é o Anual.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(naTela()).not.toContain("nada foi cobrado");
  });

  it("o Stripe.js quebrou (a janela do banco nem abriu): conta como não concluído — a troca pendente é desfeita do mesmo jeito", async () => {
    confirmarNoBanco.mockRejectedValue(new Error("o Stripe.js não carregou"));
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("A confirmação do banco não foi concluída. O plano continua o mesmo e nada foi cobrado.");
    expect(desistirDaTroca).toHaveBeenCalledTimes(1);
  });

  it("desfazer falhou da primeira vez (a assinatura estava ocupada): tenta de novo — a cobrança não fica esperando", async () => {
    confirmarNoBanco.mockResolvedValue("nao-concluido");
    desistirDaTroca.mockRejectedValueOnce(recusa("Ocupada")).mockResolvedValue({ trocado: false, plano: "mensal" });
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("A confirmação do banco não foi concluída. O plano continua o mesmo e nada foi cobrado.");
    expect(desistirDaTroca).toHaveBeenCalledTimes(2);
  });

  it("não deu para desfazer de jeito nenhum: a tela tenta 3 vezes e NÃO diz 'nada foi cobrado' — diz que não deu", async () => {
    confirmarNoBanco.mockResolvedValue("nao-concluido");
    desistirDaTroca.mockRejectedValue(recusa("Ocupada"));
    abrir();
    fireEvent.click(await paraOAnual());
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível mudar o plano. Tente de novo.");
    expect(desistirDaTroca).toHaveBeenCalledTimes(3);
    expect(naTela()).not.toContain("nada foi cobrado");
  });

  it("…e se, sem conseguir desfazer, o servidor já diz Anual: a tela diz que trocou", async () => {
    confirmarNoBanco.mockResolvedValue("nao-concluido");
    desistirDaTroca.mockRejectedValue(new Error("Network Error"));
    getMinhaAssinatura.mockResolvedValueOnce(MENSAL).mockResolvedValue(ANUAL);
    abrir();
    fireEvent.click(await paraOAnual());
    expect(await screen.findByText("Pronto. Seu plano agora é o Anual.")).toBeTruthy();
    expect(desistirDaTroca).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("MudarDePlanoPage — do Anual para o Mensal, no fim do ano pago", () => {
  beforeEach(() => {
    getMinhaAssinatura.mockResolvedValue(ANUAL);
    getTrocaDePlano.mockResolvedValue(PARA_O_MENSAL);
    mudarDePlano.mockResolvedValue({ estado: "marcado", em: EM_UM_ANO });
  });

  it("diz quando a troca vale e quanto passa a custar — nada é cobrado agora", async () => {
    abrir();
    await screen.findByRole("button", { name: "Mudar para o Mensal" });
    expect(naTela()).toContain("Anual · R$ 995,00/ano");
    expect(naTela()).toContain("Mensal · R$ 99,90/mês");
    expect(naTela()).toContain("A troca vale em 11/10/2027, quando termina o ano que você já pagou. Até lá nada muda e nada é cobrado. Depois, R$ 99,90 por mês.");
    // A chave do Stripe.js só é pedida para a troca que cobra na hora.
    expect(getPlanosDaAssinatura).not.toHaveBeenCalled();
  });

  it("ao servidor vai só o plano; e a tela diz para quando a troca ficou marcada", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Mudar para o Mensal" }));
    expect((await screen.findByRole("status")).textContent).toBe("Seu plano muda para Mensal em 11/10/2027.");
    expect(mudarDePlano.mock.calls).toEqual([[{ plano: "mensal" }]]);
  });

  it("a resposta se perdeu no caminho, mas a troca FICOU marcada: a tela lê a assinatura e diz para quando", async () => {
    mudarDePlano.mockRejectedValue(new Error("Network Error"));
    getMinhaAssinatura.mockResolvedValueOnce(ANUAL).mockResolvedValue({ ...ANUAL, podeMudarDePlano: false, trocaMarcada: { plano: "mensal", em: EM_UM_ANO } });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Mudar para o Mensal" }));
    expect((await screen.findByRole("status")).textContent).toBe("Seu plano muda para Mensal em 11/10/2027.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("com a troca JÁ marcada: a data e o botão de desistir — sem oferecer marcar de novo, e sem pedir conta nenhuma", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ANUAL, podeMudarDePlano: false, trocaMarcada: { plano: "mensal", em: EM_UM_ANO } });
    abrir();
    expect(await screen.findByText("Seu plano muda para Mensal em 11/10/2027.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mudar para o Mensal" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continuar no Anual" }));
    expect((await screen.findByRole("status")).textContent).toBe("Pronto. Você continua no plano Anual.");
    expect(desistirDaTroca).toHaveBeenCalledTimes(1);
    expect(getTrocaDePlano).not.toHaveBeenCalled();
  });
});

describe("MudarDePlanoPage — quem não pode mudar agora", () => {
  it("parou a renovação: lê que precisa manter a assinatura primeiro — sem botão de trocar", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...MENSAL, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: FIM_DO_MES, podeParar: false, podeManter: true, podeMudarDePlano: false });
    abrir();
    expect(await screen.findByText("Sua assinatura termina em 10/11/2026. Para mudar de plano, mantenha a assinatura primeiro.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mudar para/ })).toBeNull();
    expect(getTrocaDePlano).not.toHaveBeenCalled();
  });

  it("com a cobrança atrasada: o alerta e o caminho para trocar o cartão", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...MENSAL, situacao: "atrasada", proximaCobranca: null, podeParar: false, terminaAoCancelar: true, podeMudarDePlano: false });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não conseguimos cobrar o seu cartão. Troque o cartão antes de mudar de plano.");
    expect(screen.getByRole("link", { name: "Trocar cartão" }).getAttribute("href")).toBe("/aluno/conta/faturamento/cartao");
    expect(screen.queryByRole("button", { name: /Mudar para/ })).toBeNull();
  });
});

describe("MudarDePlanoPage — em inglês", () => {
  it("o plano, a conta e a confirmação em inglês, sem sobra de português", async () => {
    abrir(
      <IdiomaProvider idioma="en">
        <MudarDePlanoPage />
      </IdiomaProvider>,
    );
    const botao = await screen.findByRole("button", { name: "Switch to Yearly" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Change plan");
    expect(naTela()).toContain("Your current plan");
    expect(naTela()).toContain("Your next charge is on Oct 11, 2027.");
    for (const portugues of ["Mudar", "troca", "plano atual", "cobrança"]) expect(naTela(), portugues).not.toContain(portugues);
    fireEvent.click(botao);
    expect((await screen.findByRole("status")).textContent).toBe("Done. You're now on the Yearly plan.");
  });
});
