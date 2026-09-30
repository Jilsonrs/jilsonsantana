// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ROTAS_ANTIGAS } from "./RotasAntigas";

/** Destino: mostra o endereço em que a pessoa chegou. */
function OndeEstou() {
  const { pathname, search } = useLocation();
  return <p>chegou em {pathname + search}</p>;
}

function abrir(endereco: string) {
  render(
    <MemoryRouter initialEntries={[endereco]}>
      <Routes>
        {ROTAS_ANTIGAS}
        <Route path="/aluno/*" element={<OndeEstou />} />
        <Route path="/inicio" element={<OndeEstou />} />
        <Route path="/dashboard" element={<OndeEstou />} />
        <Route path="/admin/*" element={<OndeEstou />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Os endereços antigos levam aos atuais — link salvo não pode virar tela em
// branco. /conta e /minhas-trilhas: operador, 28/09/2026. /aluno/inicio e
// /admin: operador, 29/09/2026 (Início único em /inicio e o Dashboard do admin).
describe("endereços antigos", () => {
  it.each([
    ["/conta", "/aluno/conta"],
    ["/conta/faturamento", "/aluno/conta/faturamento"],
    ["/minhas-trilhas", "/aluno/minhas-trilhas"],
    ["/minhas-trilhas/7", "/aluno/minhas-trilhas/7"],
    ["/aluno/inicio", "/inicio"],
    ["/admin", "/dashboard"],
  ])("%s leva a %s", (antigo, novo) => {
    abrir(antigo);
    expect(screen.getByText(`chegou em ${novo}`)).toBeTruthy();
  });

  it("mantém a busca do endereço", () => {
    abrir("/conta/faturamento?origem=email");
    expect(screen.getByText("chegou em /aluno/conta/faturamento?origem=email")).toBeTruthy();
  });

  it("mantém a busca também no redirecionamento para um endereço fixo", () => {
    abrir("/aluno/inicio?origem=email");
    expect(screen.getByText("chegou em /inicio?origem=email")).toBeTruthy();
  });

  // /admin é só o endereço EXATO: as telas do admin continuam onde estão.
  it("as telas do admin NÃO são redirecionadas", () => {
    abrir("/admin/cursos");
    expect(screen.getByText("chegou em /admin/cursos")).toBeTruthy();
  });

  it("não redireciona endereço parecido que não é antigo", () => {
    abrir("/contato");
    expect(screen.queryByText(/chegou em/)).toBeNull();
  });
});
