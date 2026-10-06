// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "@/test-utils";

const concluirAula = vi.fn();
const alternarSalvo = vi.fn();
const marcarNotificacaoLida = vi.fn();
vi.mock("@/lib/api", () => ({
  concluirAula: (...args: unknown[]) => concluirAula(...args),
  alternarSalvo: (...args: unknown[]) => alternarSalvo(...args),
  marcarNotificacaoLida: (...args: unknown[]) => marcarNotificacaoLida(...args),
  marcarTodasLidas: () => Promise.resolve(),
}));

import { deveTentarDeNovo } from "./tentar-de-novo";
import { useConcluirAula } from "./progresso";
import { useAlternarSalvo } from "./salvos";
import { useMarcarLida } from "./notificacoes";

// UM TROPEÇO DE REDE NÃO PERDE O QUE O ALUNO FEZ (06/10/2026): as gravações que o
// servidor aceita repetidas tentam de novo; um 4xx, nunca.

const semRede = () => new AxiosError("Network Error", "ERR_NETWORK");
function comStatus(status: number) {
  const headers = new AxiosHeaders();
  return new AxiosError(String(status), "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    statusText: "",
    headers,
    config: { headers },
    data: {},
  });
}

describe("deveTentarDeNovo", () => {
  it("rede caída ou 5xx: até 3 vezes; 4xx: nunca", () => {
    expect(deveTentarDeNovo(0, semRede())).toBe(true);
    expect(deveTentarDeNovo(2, comStatus(502))).toBe(true);
    expect(deveTentarDeNovo(3, comStatus(502))).toBe(false);
    expect(deveTentarDeNovo(0, comStatus(403))).toBe(false);
    expect(deveTentarDeNovo(0, comStatus(404))).toBe(false);
  });
});

/** Um botão que dispara a gravação e diz quando ela deu certo ou falhou. */
function Gravar({ usar }: { usar: () => { mutate: () => void; isSuccess: boolean; isError: boolean } }) {
  const { mutate, isSuccess, isError } = usar();
  return (
    <button type="button" onClick={() => mutate()}>
      {isSuccess ? "gravou" : isError ? "falhou" : "gravar"}
    </button>
  );
}

const gravacoes = {
  "concluir a aula": {
    api: concluirAula,
    usar: () => {
      const m = useConcluirAula();
      return { ...m, mutate: () => m.mutate({ lessonId: 1, comoAdmin: false }) };
    },
  },
  "salvar para depois": {
    api: alternarSalvo,
    usar: () => {
      const m = useAlternarSalvo();
      return { ...m, mutate: () => m.mutate({ tipo: "aulas", id: 1, salvar: true }) };
    },
  },
  "marcar a notificação como lida": {
    api: marcarNotificacaoLida,
    usar: () => {
      const m = useMarcarLida();
      return { ...m, mutate: () => m.mutate(1) };
    },
  },
};

describe.each(Object.entries(gravacoes))("%s", (_nome, { api, usar }) => {
  // Com chaves: devolver o dublê faria o Vitest chamá-lo como "limpeza" depois do teste.
  beforeEach(() => {
    api.mockReset();
  });

  it("a rede caiu uma vez: tenta de novo e grava", async () => {
    api.mockRejectedValueOnce(semRede()).mockResolvedValue(undefined);
    renderWithProviders(<Gravar usar={usar} />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("gravou", {}, { timeout: 3000 })).toBeTruthy();
    expect(api).toHaveBeenCalledTimes(2);
  });

  it("o servidor recusou (4xx): não insiste", async () => {
    api.mockRejectedValue(comStatus(403));
    renderWithProviders(<Gravar usar={usar} />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("falhou")).toBeTruthy();
    expect(api).toHaveBeenCalledTimes(1);
  });
});
