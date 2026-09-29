// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ROTAS_ANTIGAS_DO_ALUNO } from "./RotasAntigasDoAluno";

/** Destino: mostra o endereço em que o aluno chegou. */
function OndeEstou() {
  const { pathname, search } = useLocation();
  return <p>chegou em {pathname + search}</p>;
}

function abrir(endereco: string) {
  render(
    <MemoryRouter initialEntries={[endereco]}>
      <Routes>
        {ROTAS_ANTIGAS_DO_ALUNO}
        <Route path="/aluno/*" element={<OndeEstou />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Os endereços antigos das telas do aluno levam aos novos, sob /aluno/
// (decisão do operador, 28/09/2026). Link salvo não pode virar tela em branco.
describe("endereços antigos do aluno", () => {
  it.each([
    ["/inicio", "/aluno/inicio"],
    ["/conta", "/aluno/conta"],
    ["/conta/faturamento", "/aluno/conta/faturamento"],
    ["/minhas-trilhas", "/aluno/minhas-trilhas"],
    ["/minhas-trilhas/7", "/aluno/minhas-trilhas/7"],
  ])("%s leva a %s", (antigo, novo) => {
    abrir(antigo);
    expect(screen.getByText(`chegou em ${novo}`)).toBeTruthy();
  });

  it("mantém a busca do endereço", () => {
    abrir("/conta/faturamento?origem=email");
    expect(screen.getByText("chegou em /aluno/conta/faturamento?origem=email")).toBeTruthy();
  });

  it("não redireciona endereço parecido que não é das telas do aluno", () => {
    abrir("/contato");
    expect(screen.queryByText(/chegou em/)).toBeNull();
  });
});
