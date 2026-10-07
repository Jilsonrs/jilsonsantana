// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { Link, useParams } from "react-router-dom";
import { renderWithProviders } from "@/test-utils";

const getEntradaDoCurso = vi.fn();
vi.mock("@/lib/api", () => ({
  getEntradaDoCurso: (...args: unknown[]) => getEntradaDoCurso(...args),
}));

import { CourseEntryPage } from "./CourseEntryPage";

// A ENTRADA DO ALUNO NUM CURSO (Bloco AULA — decisões do operador, 06/10/2026): vai
// para a aula EM QUE A PESSOA PAROU, que o servidor decide (a última em que esteve; a
// primeira para quem nunca abriu; a primeira não concluída para quem terminou). Antes
// (29/09) ia sempre à primeira aula — era o erro 1 relatado pelo operador.

/** O destino mostra o número da aula a que chegou, e um link de volta ao curso. */
function AulaDeDestino() {
  const { id } = useParams();
  return (
    <>
      <p>página da aula {id}</p>
      <Link to="/aluno/curso/excel">voltar ao curso</Link>
    </>
  );
}

const abrir = () =>
  renderWithProviders(<CourseEntryPage />, {
    route: "/aluno/curso/excel",
    path: "/aluno/curso/:slug",
    extraRoutes: [{ path: "/aluno/aula/:id", element: <AulaDeDestino /> }],
  });

// Com chaves: devolver o dublê faria o Vitest chamá-lo de novo como "limpeza" ao
// fim do teste, e a rejeição dessa chamada extra quebraria o teste de erro.
beforeEach(() => {
  getEntradaDoCurso.mockReset();
});

describe("entrada no curso", () => {
  it("carregando", () => {
    getEntradaDoCurso.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("vai para a aula que o servidor diz — a em que a pessoa parou", async () => {
    getEntradaDoCurso.mockResolvedValue({ aulaId: 33 });
    abrir();
    expect(await screen.findByText("página da aula 33")).toBeTruthy();
    expect(getEntradaDoCurso).toHaveBeenCalledWith("excel");
  });

  it("cada entrada pergunta de novo: a resposta da visita anterior não leva à aula antiga", async () => {
    getEntradaDoCurso.mockResolvedValueOnce({ aulaId: 21 }).mockResolvedValueOnce({ aulaId: 33 });
    abrir();
    expect(await screen.findByText("página da aula 21")).toBeTruthy();

    fireEvent.click(screen.getByText("voltar ao curso"));

    expect(await screen.findByText("página da aula 33")).toBeTruthy();
    expect(getEntradaDoCurso).toHaveBeenCalledTimes(2);
  });

  it("curso sem aula publicada: diz isso", async () => {
    getEntradaDoCurso.mockResolvedValue({ aulaId: null });
    abrir();
    expect(await screen.findByText("Este curso ainda não tem aulas.")).toBeTruthy();
  });

  it("curso que não existe (404): não encontrado", async () => {
    getEntradaDoCurso.mockRejectedValue({ response: { status: 404 } });
    abrir();
    expect(await screen.findByText("Curso não encontrado.")).toBeTruthy();
  });

  it("falha de rede ou do servidor: avisa o erro, sem dizer que o curso não existe", async () => {
    getEntradaDoCurso.mockRejectedValue({ response: { status: 500 } });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível abrir a aula. Tente de novo.");
    expect(screen.queryByText("Curso não encontrado.")).toBeNull();
  });
});
