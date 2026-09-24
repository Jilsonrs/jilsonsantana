import { describe, it, expect } from "vitest";
import { Home } from "lucide-react";
import { Role, en } from "@jilson/core";
import {
  NAVEGACAO,
  navegacao,
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

  // Planejada = tela que ainda não existe. O operador quer ver o mapa inteiro
  // enquanto constrói (set/2026); o aluno, não — entre as planejadas há seções
  // DELE (JilsonAI, Certificados), e mostrá-las anunciaria produto inexistente.
  it("seção PLANEJADA aparece para o admin e NÃO para o aluno", () => {
    const planejadas = NAVEGACAO.filter((s) => s.estado === "planejado");
    expect(planejadas.length).toBeGreaterThan(0); // o rascunho existe mesmo

    const doAdmin = secoesVisiveis(Role.ADMIN).map((s) => s.to);
    for (const p of planejadas) expect(doAdmin).toContain(p.to);

    for (const papel of [Role.MEMBER, undefined]) {
      const rotas = secoesVisiveis(papel).map((s) => s.to);
      for (const p of planejadas) expect(rotas).not.toContain(p.to);
    }
  });

  it("toda seção visível aponta para uma rota, e nenhuma se repete", () => {
    const rotas = secoesVisiveis(Role.ADMIN).map((s) => s.to);
    expect(rotas.every((r) => r.startsWith("/"))).toBe(true);
    expect(new Set(rotas).size).toBe(rotas.length);

    // Rótulo e ícone também são únicos. No rail RECOLHIDO só o ícone aparece —
    // dois iguais viram dois itens indistinguíveis, que foi o que aconteceu
    // quando "Site" nasceu com o ícone do "Catálogo" (set/2026).
    const rotulos = NAVEGACAO.map((s) => s.label);
    expect(new Set(rotulos).size).toBe(rotulos.length);
    const icones = NAVEGACAO.map((s) => s.icon);
    expect(new Set(icones).size).toBe(icones.length);

    // E em inglês também: a tradução não pode criar dois itens com o mesmo nome.
    const emIngles = navegacao(en.app).map((s) => s.label);
    expect(new Set(emIngles).size).toBe(emIngles.length);
  });

  it("em inglês, só os rótulos do ALUNO mudam — os de admin ficam em português", () => {
    const emIngles = navegacao(en.app);
    const deAdmin = (m: Secao[]) => m.filter((s) => s.papel === Role.ADMIN).map((s) => s.label);
    expect(deAdmin(emIngles)).toEqual(deAdmin(NAVEGACAO));

    const doAluno = (m: Secao[]) => m.filter((s) => s.papel === undefined).map((s) => s.label);
    expect(doAluno(emIngles)).toContain("My learning paths");
    expect(doAluno(emIngles)).not.toContain("Minhas trilhas");
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
  it("Cursos continua aceso dentro da página de um curso", () => {
    expect(secaoAtiva("/curso/excel-e-ia", doAluno)?.label).toBe("Cursos");
  });

  it("acende a seção de admin nas rotas dela", () => {
    expect(secaoAtiva("/admin/cursos", doAdmin)?.label).toBe("Cursos Admin");
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

  it("Site mostra Textos · Depoimentos · Perguntas frequentes em qualquer tela dele", () => {
    // 2º nível decidido pelo operador ao aprovar o C3 (23/09/2026).
    const doAdmin = secoesVisiveis(Role.ADMIN);
    for (const rota of ["/admin/site/textos", "/admin/site/depoimentos", "/admin/site/faq"]) {
      expect(itensSecundarios(rota, doAdmin).map((i) => i.label), rota).toEqual([
        "Textos",
        "Depoimentos",
        "Perguntas frequentes",
      ]);
    }
  });

  it("nenhum filho de Site é prefixo de outro — senão dois acendem juntos", () => {
    // A coluna secundária acende um item também nas sub-rotas dele. Se Textos
    // voltasse para /admin/site, ficaria aceso em /admin/site/depoimentos.
    const filhos = NAVEGACAO.find((s) => s.label === "Site")?.filhos ?? [];
    for (const a of filhos) {
      for (const b of filhos) {
        if (a !== b) expect(b.to.startsWith(`${a.to}/`), `${a.to} × ${b.to}`).toBe(false);
      }
    }
  });
});

describe("abasDaRota — o nível 3", () => {
  const doAluno = secoesVisiveis(Role.MEMBER);
  const doAdmin = secoesVisiveis(Role.ADMIN);

  it("devolve as abas da seção atual", () => {
    expect(abasDaRota("/admin/cursos", doAdmin).map((a) => a.label)).toEqual([
      "Publicados",
      "Rascunhos",
      "Arquivados",
    ]);
  });

  it("vazio onde a seção não tem abas", () => {
    expect(abasDaRota("/inicio", doAluno)).toEqual([]);
  });

  // O catálogo do aluno TINHA abas (Cursos | Trilhas) e virou duas seções de
  // primeiro nível em set/2026. O teste fica para a divisão não ser desfeita
  // sem querer: aba de volta ali é esconder navegação dentro de navegação.
  it("o catálogo do aluno não tem mais abas — Cursos e Trilhas são seções", () => {
    expect(abasDaRota("/cursos", doAluno)).toEqual([]);
    expect(doAluno.map((s) => s.label)).toContain("Cursos");
  });
});
