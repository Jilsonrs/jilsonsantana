import { describe, it, expect } from "vitest";
import { Home } from "lucide-react";
import { Role } from "@jilson/core";
import {
  NAVEGACAO,
  abasDaRota,
  itensSecundarios,
  secaoAtiva,
  secoesVisiveis,
  type Secao,
} from "./navigation";

// O mapa decide o que CADA pessoa enxerga e o que cada tela monta. É lógica
// pura, sem I/O e sem tela — o único caso em que o repo aceita teste unitário
// (CLAUDE.md → Testing).

describe("secoesVisiveis — quem vê o quê", () => {
  it("o aluno NÃO vê nenhuma seção de admin", () => {
    const vistas = secoesVisiveis(Role.MEMBER);

    expect(vistas.every((s) => s.papel === undefined)).toBe(true);
    expect(vistas.some((s) => s.to.startsWith("/admin"))).toBe(false);
  });

  it("o admin vê as dele E as do aluno", () => {
    const vistas = secoesVisiveis(Role.ADMIN);

    expect(vistas.some((s) => s.to === "/admin/cursos")).toBe(true);
    expect(vistas.some((s) => s.to === "/inicio")).toBe(true);
  });

  // Sem este filtro o rascunho do mapa viraria um menu cheio de link quebrado —
  // é ele que permite descrever o sistema inteiro antes de as telas existirem.
  it("seção PLANEJADA nunca aparece, para nenhum papel", () => {
    const planejadas = NAVEGACAO.filter((s) => s.estado === "planejado");
    expect(planejadas.length).toBeGreaterThan(0); // o rascunho existe mesmo

    for (const papel of [Role.MEMBER, Role.ADMIN, undefined]) {
      const rotas = secoesVisiveis(papel).map((s) => s.to);
      for (const p of planejadas) expect(rotas).not.toContain(p.to);
    }
  });

  it("toda seção visível aponta para uma rota, e nenhuma se repete", () => {
    const rotas = secoesVisiveis(Role.ADMIN).map((s) => s.to);
    expect(rotas.every((r) => r.startsWith("/"))).toBe(true);
    expect(new Set(rotas).size).toBe(rotas.length);
  });
});

describe("secaoAtiva — onde estou", () => {
  const doAdmin = secoesVisiveis(Role.ADMIN);
  const doAluno = secoesVisiveis(Role.MEMBER);

  it("acende a seção da rota exata", () => {
    expect(secaoAtiva("/inicio", doAluno)?.label).toBe("Início");
  });

  it("acende a seção numa rota filha", () => {
    expect(secaoAtiva("/minhas-trilhas/7", doAluno)?.label).toBe("Minhas trilhas");
  });

  // A página de um curso é `/curso/:slug`, não `/cursos` — sem isto o aluno
  // navega para dentro do catálogo e o rail apaga, deixando-o sem "onde estou".
  it("o Catálogo continua aceso dentro da página de um curso", () => {
    expect(secaoAtiva("/curso/excel-e-ia", doAluno)?.label).toBe("Catálogo");
  });

  it("acende a seção de admin nas rotas dela", () => {
    expect(secaoAtiva("/admin/cursos", doAdmin)?.label).toBe("Cursos");
    expect(secaoAtiva("/admin/cursos/12", doAdmin)?.to).toBe("/admin/cursos");
  });

  /**
   * A MAIS ESPECÍFICA vence — testado com um mapa de fixture, e a razão de não
   * usar o mapa real é o próprio achado:
   *
   * a primeira versão deste teste usava "/admin/cursos" contra "/cursos" e
   * PASSAVA mesmo com o desempate apagado, porque essas duas rotas nunca
   * colidem ("/admin/cursos" não começa com "/cursos/"). Era um teste que não
   * podia falhar — descoberto pela prova por mutação, não por leitura.
   *
   * A colisão de verdade acontece quando uma seção é PREFIXO de outra (um hub
   * "/admin" ao lado de "/admin/cursos"), que é para onde este mapa caminha.
   * Sem o desempate, as duas acendem e o rail mostra dois itens ativos.
   */
  it("a seção MAIS ESPECÍFICA vence quando uma é prefixo da outra", () => {
    const icon = NAVEGACAO[0].icon;
    const aninhadas = [
      { label: "Admin", to: "/admin", icon, estado: "ativo" as const },
      { label: "Cursos", to: "/admin/cursos", icon, estado: "ativo" as const },
    ];

    expect(secaoAtiva("/admin/cursos", aninhadas)?.label).toBe("Cursos");
    expect(secaoAtiva("/admin/cursos/12", aninhadas)?.label).toBe("Cursos");
    expect(secaoAtiva("/admin", aninhadas)?.label).toBe("Admin");
  });

  it("rota fora do mapa não acende nada", () => {
    expect(secaoAtiva("/login", doAluno)).toBeUndefined();
  });
});

describe("itensSecundarios — o nível 2 só aparece quando vale a pena", () => {
  const doAluno = secoesVisiveis(Role.MEMBER);

  it("não aparece onde a seção não tem filhos", () => {
    expect(itensSecundarios("/inicio", doAluno)).toEqual([]);
  });

  // Uma coluna de navegação com uma linha só é ruído visual, não navegação.
  // No passado /conta só tinha 1 filho. Agora tem vários.
  // Vamos criar um mock de seção com 1 filho só para testar a função.
  it("NÃO aparece com um filho só", () => {
    const secoesComUmFilho: Secao[] = [
      {
        label: "Um Filho",
        to: "/um-filho",
        icon: Home,
        estado: "ativo",
        filhos: [{ label: "Só este", to: "/um-filho" }],
      },
    ];
    expect(itensSecundarios("/um-filho", secoesComUmFilho)).toEqual([]);
  });

  it("aparece a partir de dois filhos", () => {
    const secoes = [
      { label: "X", to: "/x", icon: NAVEGACAO[0].icon, estado: "ativo" as const,
        filhos: [{ label: "A", to: "/x/a" }, { label: "B", to: "/x/b" }] },
    ];
    expect(itensSecundarios("/x", secoes)).toHaveLength(2);
  });
});

describe("abasDaRota — o nível 3", () => {
  const doAluno = secoesVisiveis(Role.MEMBER);

  it("devolve as abas da seção atual", () => {
    expect(abasDaRota("/cursos", doAluno).map((a) => a.label)).toEqual(["Cursos", "Trilhas"]);
  });

  it("vazio onde a seção não tem abas", () => {
    expect(abasDaRota("/inicio", doAluno)).toEqual([]);
  });
});
