// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import type { CancelarInput, MinhaAssinatura, ReembolsoFeito, RenovacaoParada } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
const cancelarMinhaAssinatura = vi.fn<(corpo: CancelarInput) => Promise<RenovacaoParada>>();
const reembolsarMinhaAssinatura = vi.fn<(corpo: CancelarInput) => Promise<ReembolsoFeito>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMinhaAssinatura: () => getMinhaAssinatura(),
  cancelarMinhaAssinatura: (corpo: CancelarInput) => cancelarMinhaAssinatura(corpo),
  reembolsarMinhaAssinatura: (corpo: CancelarInput) => reembolsarMinhaAssinatura(corpo),
}));

import { CancelarPage } from "./CancelarPage";

// A TELA DE CANCELAR (Fase 4, etapa 4.6, sessão b). O que estes testes protegem:
//   - a tela oferece SÓ o que o servidor disse que cabe: parar a renovação; nos 7 primeiros dias,
//     também o reembolso; com a cobrança atrasada, terminar na hora — e nunca o reembolso para
//     quem está fora do prazo ou não pagou nada;
//   - o motivo é OPCIONAL: o botão de cancelar funciona sem nada, e está sempre à vista;
//   - ao servidor vão só o motivo e o comentário que a pessoa deu — nunca valor nem assinatura;
//   - a tela só diz "cancelada" ou "devolvemos" quando o servidor disse; cada falha tem a frase
//     dela (o prazo que acabou, a devolução que não saiu);
//   - sem nada a cancelar, a pessoa volta ao resumo; em inglês, tudo em inglês.

const FIM_DO_MES = "2026-11-10T15:00:00.000Z";
const FIM_DO_PRAZO = "2026-10-18T15:00:00.000Z";
const ATIVA: MinhaAssinatura = {
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
const NO_PRAZO: MinhaAssinatura = { ...ATIVA, reembolso: { centavos: 9990, moeda: "brl", ate: FIM_DO_PRAZO } };
const recusa = (error: string, status = 409) => Object.assign(new Error(error), { response: { status, data: { error } } });

const abrir = (ui = <CancelarPage />) =>
  renderWithProviders(ui, {
    route: "/aluno/conta/faturamento/cancelar",
    path: "/aluno/conta/faturamento/cancelar",
    extraRoutes: [{ path: "/aluno/conta/faturamento", element: <p>RESUMO DA ASSINATURA</p> }],
  });
/** O texto da tela, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const naTela = () => (document.body.textContent ?? "").replace(/\u00a0/g, " ");
const botao = (nome: string | RegExp) => screen.getByRole("button", { name: nome });
/** O botão do reembolso: o valor sai com o espaço que não quebra linha ("R$ 99,90"), que `\\s` casa. */
const REEMBOLSAR = /^Cancelar e receber R\$\s99,90$/;

beforeEach(() => {
  getMinhaAssinatura.mockReset().mockResolvedValue(ATIVA);
  cancelarMinhaAssinatura.mockReset().mockResolvedValue({ acessoAte: FIM_DO_MES });
  reembolsarMinhaAssinatura.mockReset().mockResolvedValue({ centavos: 9990, moeda: "brl" });
});

describe("CancelarPage — carregando, falha e nada a cancelar", () => {
  it("enquanto carrega: o título e 'Carregando…', sem motivo e sem botão de cancelar", () => {
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Cancelar assinatura");
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("a leitura falhou: o erro, e nada para cancelar às cegas", async () => {
    getMinhaAssinatura.mockRejectedValue(new Error("500"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sem assinatura, terminada, ou com a renovação já parada e fora do prazo: volta ao resumo", async () => {
    for (const assinatura of [{ situacao: "nenhuma" }, { situacao: "terminada", terminouEm: null }, { ...ATIVA, situacao: "vai-cancelar", podeParar: false, podeManter: true, proximaCobranca: null, acessoAte: FIM_DO_MES }] as MinhaAssinatura[]) {
      getMinhaAssinatura.mockResolvedValue(assinatura);
      const { unmount } = abrir();
      expect(await screen.findByText("RESUMO DA ASSINATURA"), assinatura.situacao).toBeTruthy();
      unmount();
    }
    expect(cancelarMinhaAssinatura).not.toHaveBeenCalled();
  });
});

describe("CancelarPage — em dia, depois dos 7 dias", () => {
  it("mostra até quando há acesso, os cinco motivos (nenhum marcado) e o botão de cancelar — sem a saída do reembolso", async () => {
    abrir();
    expect(await screen.findByText("Você continua com acesso até 10/11/2026. Depois disso, nada mais é cobrado.")).toBeTruthy();
    expect(screen.getByText("Você pode cancelar quando quiser. Seu progresso fica guardado: se voltar, continua de onde parou.")).toBeTruthy();
    const motivos = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(motivos.map((m) => m.parentElement?.textContent)).toEqual(["Está caro para mim agora", "Não estou tendo tempo de estudar", "Já aprendi o que precisava", "Não encontrei o conteúdo que procurava", "Outro motivo"]);
    expect(motivos.some((m) => m.checked)).toBe(false);
    expect(screen.getByLabelText("Quer contar mais?")).toBeTruthy();
    expect(botao("Cancelar assinatura")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar sem cancelar" }).getAttribute("href")).toBe("/aluno/conta/faturamento");
    expect(naTela()).not.toContain("receber o dinheiro de volta");
    expect(screen.queryByRole("button", { name: "Parar a renovação" })).toBeNull();
  });

  it("o motivo é OPCIONAL: o botão funciona sem nada, e ao servidor vai um corpo vazio", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar assinatura" }));
    expect((await screen.findByRole("status")).textContent).toBe("Assinatura cancelada. Você continua com acesso até 10/11/2026. Mudou de ideia? Até lá, é só clicar em Manter a assinatura.");
    expect(cancelarMinhaAssinatura.mock.calls).toEqual([[{}]]);
    expect(screen.getByRole("link", { name: "Faturamento e Assinatura" }).getAttribute("href")).toBe("/aluno/conta/faturamento");
    // Depois de cancelar, a tela não oferece cancelar de novo.
    expect(screen.queryByRole("button", { name: "Cancelar assinatura" })).toBeNull();
  });

  it("com motivo e comentário: vão os dois, e SÓ eles — o comentário aparado", async () => {
    abrir();
    fireEvent.click(await screen.findByLabelText("Está caro para mim agora"));
    fireEvent.change(screen.getByLabelText("Quer contar mais?"), { target: { value: "  volto em janeiro  " } });
    fireEvent.click(botao("Cancelar assinatura"));
    await screen.findByRole("status");
    expect(cancelarMinhaAssinatura.mock.calls).toEqual([[{ motivo: "caro", comentario: "volto em janeiro" }]]);
  });

  it("enquanto envia: o botão fica desligado e diz 'Processando…' — um clique a mais não cancela duas vezes", async () => {
    cancelarMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar assinatura" }));
    const enviando = await screen.findByRole("button", { name: "Processando…" });
    expect((enviando as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(enviando);
    expect(cancelarMinhaAssinatura).toHaveBeenCalledTimes(1);
  });

  it("o servidor recusou: a frase da falha, e a tela NÃO diz 'assinatura cancelada'", async () => {
    cancelarMinhaAssinatura.mockRejectedValue(recusa("Ocupada"));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar assinatura" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível cancelar. Tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
    expect(botao("Cancelar assinatura")).toBeTruthy();
  });

  // O LIMITE DE TENTATIVAS (etapa 4.7, passo 1 — a frase é do operador, 19/10/2026).
  it("muitas tentativas: a frase de esperar — e a tela NÃO diz 'assinatura cancelada'", async () => {
    cancelarMinhaAssinatura.mockRejectedValue(recusa("MuitasTentativas", 429));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar assinatura" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
    expect(botao("Cancelar assinatura")).toBeTruthy();
  });

  it("quem tinha a troca para o Mensal marcada é avisado de que ela também será desfeita — e só quem tinha", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, plano: "anual", trocaMarcada: { plano: "mensal", em: FIM_DO_MES } });
    const { unmount } = abrir();
    expect(await screen.findByText("Sua troca para o plano Mensal também será desfeita.")).toBeTruthy();
    unmount();
    getMinhaAssinatura.mockResolvedValue(ATIVA);
    abrir();
    await screen.findByRole("button", { name: "Cancelar assinatura" });
    expect(screen.queryByText("Sua troca para o plano Mensal também será desfeita.")).toBeNull();
  });
});

describe("CancelarPage — nos 7 primeiros dias: as duas saídas", () => {
  beforeEach(() => {
    getMinhaAssinatura.mockResolvedValue(NO_PRAZO);
  });

  it("mostra as DUAS: parar e continuar, e cancelar e receber o dinheiro de volta — com o valor e a data que o servidor mandou", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Parar a renovação e continuar" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cancelar e receber o dinheiro de volta" })).toBeTruthy();
    expect(naTela()).toContain("Você continua com acesso até 10/11/2026. Depois disso, nada mais é cobrado.");
    expect(naTela()).toContain("Devolvemos R$ 99,90 no cartão que você usou e o seu acesso termina agora. Você pode pedir até 18/10/2026.");
    expect(botao("Parar a renovação")).toBeTruthy();
    expect(botao(REEMBOLSAR)).toBeTruthy();
  });

  it("parar a renovação: chama SÓ o cancelamento — nada é devolvido", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Parar a renovação" }));
    expect((await screen.findByRole("status")).textContent).toContain("Você continua com acesso até 10/11/2026.");
    expect(cancelarMinhaAssinatura).toHaveBeenCalledTimes(1);
    expect(reembolsarMinhaAssinatura).not.toHaveBeenCalled();
  });

  it("o reembolso: chama SÓ o reembolso, com o motivo — e a tela diz o valor que o SERVIDOR devolveu", async () => {
    reembolsarMinhaAssinatura.mockResolvedValue({ centavos: 8990, moeda: "brl" });
    abrir();
    fireEvent.click(await screen.findByLabelText("Outro motivo"));
    fireEvent.click(botao(REEMBOLSAR));
    expect((await screen.findByRole("status")).textContent?.replace(/\u00a0/g, " ")).toBe("Assinatura cancelada. Devolvemos R$ 89,90 no cartão que você usou. O valor costuma aparecer na fatura em até 10 dias úteis, conforme o banco.");
    expect(reembolsarMinhaAssinatura.mock.calls).toEqual([[{ motivo: "outro" }]]);
    expect(cancelarMinhaAssinatura).not.toHaveBeenCalled();
  });

  it("enquanto o reembolso envia, as DUAS saídas ficam desligadas", async () => {
    reembolsarMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: REEMBOLSAR }));
    await screen.findByRole("button", { name: "Processando…" });
    expect((botao("Parar a renovação") as HTMLButtonElement).disabled).toBe(true);
  });

  it("o prazo acabou com a tela aberta: a frase do prazo — nunca 'devolvemos'", async () => {
    reembolsarMinhaAssinatura.mockRejectedValue(recusa("ForaDoPrazo"));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: REEMBOLSAR }));
    expect((await screen.findByRole("alert")).textContent).toBe("O prazo de 7 dias para o reembolso terminou. Você ainda pode parar a renovação.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("cancelou e a devolução falhou: a frase própria — a pessoa não precisa fazer nada", async () => {
    reembolsarMinhaAssinatura.mockRejectedValue(recusa("DevolucaoFalhou", 502));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: REEMBOLSAR }));
    expect((await screen.findByRole("alert")).textContent).toBe("Sua assinatura foi cancelada, mas não conseguimos devolver o valor agora. Já fomos avisados e vamos resolver. Você não precisa fazer nada.");
  });

  it("depois de qualquer falha, a tela lê a assinatura de novo: o que deixou de caber SOME — e a frase da falha fica", async () => {
    reembolsarMinhaAssinatura.mockRejectedValue(recusa("ForaDoPrazo"));
    // A primeira leitura ainda oferece o reembolso; a de depois da falha já não (o prazo acabou).
    getMinhaAssinatura.mockReset().mockResolvedValueOnce(NO_PRAZO).mockResolvedValue(ATIVA);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: REEMBOLSAR }));
    await waitFor(() => expect(screen.queryByRole("button", { name: REEMBOLSAR })).toBeNull());
    expect(screen.getByRole("alert").textContent).toBe("O prazo de 7 dias para o reembolso terminou. Você ainda pode parar a renovação.");
    expect(botao("Cancelar assinatura")).toBeTruthy();
    expect(naTela()).not.toContain("receber o dinheiro de volta");
  });

  // Achado da revisão de segurança (segunda passada, 11/10/2026): encerrada a assinatura, a
  // leitura seguinte já não tem o que cancelar — e a tela ia para o resumo, levando embora a
  // única frase que diz que o dinheiro NÃO voltou.
  it("a devolução falhou e a assinatura já aparece TERMINADA: a frase FICA na tela, com o caminho para o resumo — nunca some", async () => {
    reembolsarMinhaAssinatura.mockRejectedValue(recusa("DevolucaoFalhou", 502));
    getMinhaAssinatura.mockReset().mockResolvedValueOnce(NO_PRAZO).mockResolvedValue({ situacao: "terminada", terminouEm: FIM_DO_PRAZO });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: REEMBOLSAR }));
    await waitFor(() => expect(screen.queryByRole("button", { name: REEMBOLSAR })).toBeNull());
    expect(screen.getByRole("alert").textContent).toBe("Sua assinatura foi cancelada, mas não conseguimos devolver o valor agora. Já fomos avisados e vamos resolver. Você não precisa fazer nada.");
    expect(screen.queryByText("RESUMO DA ASSINATURA")).toBeNull();
    expect(screen.getByRole("link", { name: "Faturamento e Assinatura" }).getAttribute("href")).toBe("/aluno/conta/faturamento");
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("…e o mesmo se a leitura seguinte FALHAR: a frase da devolução, e não a de 'não foi possível carregar'", async () => {
    reembolsarMinhaAssinatura.mockRejectedValue(recusa("DevolucaoFalhou", 502));
    getMinhaAssinatura.mockReset().mockResolvedValueOnce(NO_PRAZO).mockRejectedValue(recusa("Unauthorized", 401));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: REEMBOLSAR }));
    await waitFor(() => expect(screen.queryByRole("button", { name: REEMBOLSAR })).toBeNull());
    expect(screen.getAllByRole("alert").map((alerta) => alerta.textContent)).toEqual(["Sua assinatura foi cancelada, mas não conseguimos devolver o valor agora. Já fomos avisados e vamos resolver. Você não precisa fazer nada."]);
  });

  it("com a renovação JÁ parada e ainda no prazo: só a saída do reembolso, e a data em que termina", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...NO_PRAZO, situacao: "vai-cancelar", podeParar: false, podeManter: true, proximaCobranca: null, acessoAte: FIM_DO_MES });
    abrir();
    expect(await screen.findByRole("button", { name: REEMBOLSAR })).toBeTruthy();
    expect(screen.getByText("Sua assinatura termina em 10/11/2026. Você continua com acesso até lá.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Parar a renovação" })).toBeNull();
  });
});

describe("CancelarPage — com a cobrança atrasada", () => {
  beforeEach(() => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "atrasada", proximaCobranca: null, podeParar: false, terminaAoCancelar: true, podeMudarDePlano: false });
    cancelarMinhaAssinatura.mockResolvedValue({ acessoAte: null, terminou: true });
  });

  it("avisa ANTES que a assinatura termina agora — sem prometer acesso até data nenhuma", async () => {
    abrir();
    expect(await screen.findByText("Sua assinatura termina agora, e a cobrança em aberto não será mais tentada.")).toBeTruthy();
    expect(naTela()).not.toContain("Você continua com acesso até");
    expect(botao("Cancelar assinatura")).toBeTruthy();
  });

  it("cancelou: vai para o resumo, que diz que terminou — a tela não promete acesso que não existe", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar assinatura" }));
    expect(await screen.findByText("RESUMO DA ASSINATURA")).toBeTruthy();
    expect(cancelarMinhaAssinatura.mock.calls).toEqual([[{}]]);
  });
});

