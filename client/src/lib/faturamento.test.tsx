// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MinhaAssinatura } from "@jilson/core";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMinhaAssinatura: () => getMinhaAssinatura(),
}));

import { comAcesso, useMinhaAssinatura } from "./faturamento";

// O QUE A TELA DE FATURAMENTO LEU NÃO SOBREVIVE A ELA (achado da revisão de segurança,
// 11/10/2026). A chave da leitura não leva a conta, e a sessão pode acabar sem o "Sair" (que
// limpa tudo — teste em `Layout.test.tsx`): se a leitura ficasse guardada, outra conta que
// entrasse na MESMA aba veria por um instante o plano e o cartão da anterior. O teste usa UM cliente de leituras para as duas "visitas", como
// a aba do navegador.

const DA_ANA: MinhaAssinatura = { situacao: "ativa", plano: "anual", preco: { centavos: 99500, moeda: "brl" }, proximaCobranca: null, acessoAte: null, cartao: { bandeira: "visa", final: "1111", mes: 1, ano: 2030 }, aceitaCartao: true, podeParar: true, podeManter: false, reembolso: null };

function Tela() {
  const { data, isPending } = useMinhaAssinatura();
  return <p>{isPending ? "lendo" : `cartão final ${comAcesso(data)?.cartao?.final ?? "nenhum"}`}</p>;
}

beforeEach(() => {
  getMinhaAssinatura.mockReset();
});

describe("a leitura da assinatura", () => {
  it("fechada a tela, o que ela leu é esquecido: quem abrir depois na mesma aba começa do zero", async () => {
    const daAba = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const abrir = () =>
      render(
        <QueryClientProvider client={daAba}>
          <Tela />
        </QueryClientProvider>,
      );

    getMinhaAssinatura.mockResolvedValue(DA_ANA);
    abrir();
    expect(await screen.findByText("cartão final 1111")).toBeTruthy();
    cleanup();
    // O que o cliente de leituras solta quando ninguém mais olha sai num instante seguinte.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Outra conta entra na mesma aba, e a leitura dela ainda não voltou.
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("lendo")).toBeTruthy();
    expect(screen.queryByText("cartão final 1111")).toBeNull();
  });
});
