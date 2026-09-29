// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { Role } from "@jilson/core";
import { SecondaryNav, iniciais } from "./SecondaryNav";

const ALUNO = { name: "Jilson Santana", email: "jilson@x.com", role: Role.MEMBER };

function render(route: string, usuario: Partial<typeof ALUNO> & { image?: string } = ALUNO) {
  return renderWithProviders(
    <SecondaryNav papel={Role.MEMBER} usuario={usuario} onSignOut={vi.fn()} />,
    { route, path: "*" },
  );
}

// NÍVEL 2 da navegação. Ele decide o que aparece e para onde leva — é lógica,
// não decoração.

describe("SecondaryNav — só aparece quando tem o que mostrar", () => {
  it("não renderiza onde a seção não tem subitens", () => {
    render("/aluno/inicio");
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("renderiza onde a seção tem subitens", () => {
    render("/aluno/conta");
    expect(screen.getByRole("complementary", { name: "Menu da seção" })).toBeTruthy();
  });
});

describe("SecondaryNav — os itens levam a algum lugar", () => {
  it("cada item aponta para a rota do mapa", () => {
    render("/aluno/conta");

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(1);
    for (const l of links) {
      expect(l.getAttribute("href")).toMatch(/^\//);
    }
  });

  it("oferece a saída da conta", () => {
    render("/aluno/conta");
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });
});

/**
 * O avatar já mandou o e-mail do aluno para um serviço externo
 * (`api.dicebear.com?seed=<email>`) — dado pessoal saindo do produto a cada
 * carregamento, e uma requisição de terceiro no caminho crítico. Estes testes
 * existem para que isso não volte sem alguém perceber.
 */
describe("SecondaryNav — o avatar não sai do produto", () => {
  it("usa a foto do próprio aluno quando existe", () => {
    render("/aluno/conta", { ...ALUNO, image: "/uploads/jilson.jpg" });

    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/uploads/jilson.jpg");
  });

  it("sem foto, desenha as iniciais — sem buscar imagem nenhuma", () => {
    render("/aluno/conta");

    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("JS")).toBeTruthy();
  });

  // A trava explícita: qualquer `src` apontando para fora reprova aqui.
  it("NENHUMA imagem vem de domínio externo", () => {
    render("/aluno/conta", { ...ALUNO, image: "/uploads/jilson.jpg" });

    for (const img of document.querySelectorAll("img")) {
      expect(img.getAttribute("src") ?? "").not.toMatch(/^https?:\/\//);
    }
  });
});

describe("iniciais", () => {
  it("usa a primeira e a última palavra do nome", () => {
    expect(iniciais("Jilson Santana", "j@x.com")).toBe("JS");
    expect(iniciais("Ana Maria de Souza", "a@x.com")).toBe("AS");
  });

  it("com um nome só, usa as duas primeiras letras", () => {
    expect(iniciais("Jilson", "j@x.com")).toBe("JI");
  });

  // `name` é OPCIONAL no modelo de usuário (CLAUDE.md → Auth): um gestor
  // corporativo pode ser convidado só com e-mail. Sem este caso, o avatar
  // mostraria vazio para essa pessoa.
  it("sem nome, cai no e-mail", () => {
    expect(iniciais(null, "maria@x.com")).toBe("MA");
    expect(iniciais("   ", "maria@x.com")).toBe("MA");
  });

  it("sem nada, não quebra", () => {
    expect(iniciais(null, null)).toBe("?");
  });
});

// O nível 2 de Meus estudos (decisão do operador, 29/09/2026): os quatro itens,
// e só o que existe é link. O resto sai como texto com EM BREVE.
describe("SecondaryNav — Meus estudos", () => {
  it("Minhas trilhas é link; Em andamento, Concluídos e Certificados são EM BREVE", () => {
    render("/aluno/minhas-trilhas/7");

    const minhas = screen.getByRole("link", { name: "Minhas trilhas" });
    expect(minhas.getAttribute("href")).toBe("/aluno/minhas-trilhas");
    expect(minhas.getAttribute("aria-current")).toBe("page");

    for (const nome of ["Em andamento", "Concluídos", "Certificados"]) {
      expect(screen.getByText(nome), nome).toBeTruthy();
      expect(screen.queryByRole("link", { name: new RegExp(nome) }), nome).toBeNull();
    }
    expect(screen.getAllByText("EM BREVE")).toHaveLength(3);
  });
});
