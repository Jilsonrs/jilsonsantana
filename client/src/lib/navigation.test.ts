import { describe, it, expect } from "vitest";
import { Home } from "lucide-react";
import { Role, en, pt } from "@jilson/core";
import {
  NAVEGACAO,
  navegacao,
  abasDaRota,
  casaRota,
  etiquetaEmBreve,
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

    expect(vistas.every((s) => s.papel !== Role.ADMIN)).toBe(true);
    expect(vistas.some((s) => s.to.startsWith("/admin"))).toBe(false);
  });

  it("o admin vê as dele E as do aluno — inclusive o Início", () => {
    const vistas = secoesVisiveis(Role.ADMIN);

    expect(vistas.some((s) => s.to === "/admin/cursos")).toBe(true);
    expect(vistas.some((s) => s.to === "/aluno/em-andamento")).toBe(true);
    expect(vistas.some((s) => s.to === "/inicio")).toBe(true);
  });

  // A PLATAFORMA É UMA SÓ (decisão do operador, 29/09/2026): o Início é o mesmo
  // para o aluno e para o admin, que testa por ele tudo o que o aluno faz. O
  // painel do admin é o Dashboard, que absorveu a seção "Dados".
  it("o Início é um só, para os dois papéis", () => {
    const inicio = (papel: string) =>
      secoesVisiveis(papel).filter((s) => s.label === "Início").map((s) => s.to);
    expect(inicio(Role.MEMBER)).toEqual(["/inicio"]);
    expect(inicio(Role.ADMIN)).toEqual(["/inicio"]);
    expect(NAVEGACAO.some((s) => s.label === "Dados")).toBe(false);
  });

  // Tudo antes do Dashboard é a área do aluno; dele para baixo, a administrativa.
  it("o Dashboard é o PRIMEIRO item do admin, logo antes de Cursos Admin", () => {
    const menu = secoesVisiveis(Role.ADMIN).filter((s) => !s.foraDoMenuLateral);
    const i = menu.findIndex((s) => s.label === "Dashboard");
    expect(menu[i].to).toBe("/dashboard");
    expect(menu[i + 1].label).toBe("Cursos Admin");
    expect(menu.slice(0, i).every((s) => s.papel !== Role.ADMIN)).toBe(true);
    expect(menu.slice(i).every((s) => s.papel === Role.ADMIN)).toBe(true);
    expect(secoesVisiveis(Role.MEMBER).some((s) => s.label === "Dashboard")).toBe(false);
  });

  // Planejada = tela que ainda não existe. Aparece como EM BREVE para quem tem
  // o papel dela: o admin vê o mapa inteiro (set/2026) e, desde 29/09/2026, o
  // aluno vê as planejadas DELE ("o que ainda não existe aparece como EM
  // BREVE"). As planejadas do admin continuam invisíveis para o aluno.
  it("seção PLANEJADA aparece para quem tem o papel dela — inclusive o aluno", () => {
    const planejadas = NAVEGACAO.filter((s) => s.estado === "planejado");
    const doAlunoPlanejadas = planejadas.filter((s) => s.papel === undefined);
    const deAdminPlanejadas = planejadas.filter((s) => s.papel === Role.ADMIN);
    expect(doAlunoPlanejadas.length).toBeGreaterThan(0); // o JilsonAI
    expect(deAdminPlanejadas.length).toBeGreaterThan(0);

    const doAdmin = secoesVisiveis(Role.ADMIN).map((s) => s.to);
    for (const p of planejadas) expect(doAdmin).toContain(p.to);

    const doAluno = secoesVisiveis(Role.MEMBER).map((s) => s.to);
    for (const p of doAlunoPlanejadas) expect(doAluno).toContain(p.to);
    for (const p of deAdminPlanejadas) expect(doAluno).not.toContain(p.to);
  });

  // O menu do aluno (decisão do operador, 29/09/2026 — design.md §6): o que ele
  // descobre (Início, Cursos, Trilhas), o que é dele (Meus estudos) e o JilsonAI.
  it("o menu lateral do aluno: Início · Cursos · Trilhas · Meus estudos · JilsonAI", () => {
    const menu = secoesVisiveis(Role.MEMBER).filter((s) => !s.foraDoMenuLateral);
    expect(menu.map((s) => s.label)).toEqual(["Início", "Cursos", "Trilhas", "Meus estudos", "JilsonAI"]);
    expect(menu.filter((s) => s.estado === "planejado").map((s) => s.label)).toEqual(["JilsonAI"]);
    // Minhas trilhas e Certificados saíram do primeiro nível: moram em Meus estudos.
    expect(menu.map((s) => s.label)).not.toContain("Minhas trilhas");
    expect(menu.map((s) => s.label)).not.toContain("Certificados");
  });

  it("toda seção visível aponta para uma rota, e nenhuma se repete", () => {
    const rotas = secoesVisiveis(Role.ADMIN).map((s) => s.to);
    expect(rotas.every((r) => r.startsWith("/"))).toBe(true);
    expect(new Set(rotas).size).toBe(rotas.length);

    // Rótulo e ícone também são únicos EM CADA MENU (o do aluno e o do admin).
    // No rail RECOLHIDO só o ícone aparece — dois iguais viram dois itens
    // indistinguíveis, que foi o que aconteceu quando "Site" nasceu com o ícone
    // do "Catálogo" (set/2026). É por menu, e não no mapa inteiro, porque os
    // dois "Início" (29/09/2026) nunca aparecem juntos.
    for (const papel of [Role.MEMBER, Role.ADMIN]) {
      for (const t of [pt.app, en.app]) {
        const menu = secoesVisiveis(papel, t);
        const rotulos = menu.map((s) => s.label);
        expect(new Set(rotulos).size, `${papel} rótulos`).toBe(rotulos.length);
        const icones = menu.map((s) => s.icon);
        expect(new Set(icones).size, `${papel} ícones`).toBe(icones.length);
      }
    }
  });

  it("em inglês, só os rótulos do ALUNO mudam — os de admin ficam em português", () => {
    const emIngles = navegacao(en.app);
    const deAdmin = (m: Secao[]) => m.filter((s) => s.papel === Role.ADMIN).map((s) => s.label);
    expect(deAdmin(emIngles)).toEqual(deAdmin(NAVEGACAO));

    const doAluno = (m: Secao[]) => m.filter((s) => s.papel !== Role.ADMIN).map((s) => s.label);
    expect(doAluno(emIngles)).toContain("My learning");
    expect(doAluno(emIngles)).not.toContain("Meus estudos");
  });
});

describe("secaoAtiva — onde estou", () => {
  const doAdmin = secoesVisiveis(Role.ADMIN);
  const doAluno = secoesVisiveis(Role.MEMBER);

  it("acende a seção da rota exata", () => {
    expect(secaoAtiva("/inicio", doAluno)?.label).toBe("Início");
  });

  it("Meus estudos acende na tela dele e dentro de Minhas trilhas", () => {
    for (const rota of ["/aluno/em-andamento", "/aluno/minhas-trilhas", "/aluno/minhas-trilhas/7"]) {
      expect(secaoAtiva(rota, doAluno)?.label, rota).toBe("Meus estudos");
    }
  });

  // A página de um curso é `/curso/:slug`, não `/cursos` — sem isto o aluno
  // navega para dentro do catálogo e o rail apaga, deixando-o sem "onde estou".
  it("Cursos continua aceso dentro da página de um curso", () => {
    expect(secaoAtiva("/curso/excel-e-ia", doAluno)?.label).toBe("Cursos");
  });

  it("acende a seção de admin nas rotas dela", () => {
    expect(secaoAtiva("/admin/cursos", doAdmin)?.label).toBe("Cursos Admin");
    expect(secaoAtiva("/dashboard", doAdmin)?.label).toBe("Dashboard");
    expect(secaoAtiva("/inicio", doAdmin)?.label).toBe("Início");
    expect(secaoAtiva("/admin/site/textos", doAdmin)?.label).toBe("Site");
    expect(secaoAtiva("/admin/cursos/novo", doAdmin)?.to).toBe("/admin/cursos");
  });

  // O editor de um curso (Bloco E, 28/09/2026) é uma seção FORA do menu lateral:
  // no mapa inteiro ele é quem acende (e monta o nível 2); no rail, que não o
  // mostra, continua aceso "Cursos Admin".
  it("dentro de um curso, o editor acende no mapa e Cursos Admin no rail", () => {
    const doRail = doAdmin.filter((s) => !s.foraDoMenuLateral);
    for (const rota of ["/admin/cursos/12", "/admin/cursos/12/publicar"]) {
      expect(secaoAtiva(rota, doAdmin)?.label, rota).toBe("Editar curso");
      expect(secaoAtiva(rota, doRail)?.label, rota).toBe("Cursos Admin");
    }
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

describe("casaRota — parâmetro só casa com número", () => {
  it("devolve o id do curso", () => {
    expect(casaRota("/admin/cursos/12/basico", "/admin/cursos/:id")).toEqual({ id: "12" });
  });

  // Sem isto, "Novo curso" abriria o editor de um curso chamado "novo".
  it("não casa com texto no lugar do id", () => {
    expect(casaRota("/admin/cursos/novo", "/admin/cursos/:id")).toBeNull();
  });

  it("não casa com rota que só começa igual", () => {
    expect(casaRota("/iniciox", "/inicio")).toBeNull();
    expect(casaRota("/inicio/7", "/inicio")).toEqual({});
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

  // Os 7 passos, em ordem de preenchimento (operador, 27–28/09/2026), com o id
  // do curso já no endereço. Mensagens ainda não tem tela; Legendas ganhou a
  // sua em 04/10/2026 (decisão do operador).
  it("o editor do curso mostra os 7 passos, com o id no endereço", () => {
    const itens = itensSecundarios("/admin/cursos/12/pagina", secoesVisiveis(Role.ADMIN));
    expect(itens.map((i) => i.label)).toEqual([
      "Informações básicas",
      "Para quem é",
      "Conteúdo",
      "Legendas",
      "Mídia e destaques",
      "Mensagens",
      "Publicar",
    ]);
    expect(itens[0].to).toBe("/admin/cursos/12/basico");
    expect(itens.filter((i) => i.estado === "planejado").map((i) => i.label)).toEqual([]);
    expect(itens.find((i) => i.label === "Mensagens")?.to).toBe("/admin/cursos/12/mensagens");
    expect(itens.find((i) => i.label === "Legendas")?.to).toBe("/admin/cursos/12/legendas");
  });

  // O nível 2 de Meus estudos (operador, 29/09/2026): o guia de onde a pessoa
  // está. Em andamento (só o título, por ora) e Minhas trilhas existem;
  // Concluídos e Certificados são EM BREVE (Fase 5 e 6.5). "Salvos" entrou em
  // 03/10/2026, depois de Minhas trilhas (decisão do operador, "como no LinkedIn").
  // "Notificações" entrou embaixo de Salvos em 06/10/2026 (operador: "o sino é só
  // mais um atalho"), e a mensagem aberta também acende Meus estudos.
  it("Meus estudos mostra os seis itens, com dois EM BREVE", () => {
    for (const rota of ["/aluno/em-andamento", "/aluno/minhas-trilhas/7", "/aluno/salvos", "/aluno/notificacoes", "/aluno/notificacoes/3"]) {
      const itens = itensSecundarios(rota, doAluno);
      expect(itens.map((i) => i.label), rota).toEqual([
        "Em andamento",
        "Minhas trilhas",
        "Salvos",
        "Notificações",
        "Concluídos",
        "Certificados",
      ]);
      expect(itens.filter((i) => i.estado === "planejado").map((i) => i.label), rota).toEqual([
        "Concluídos",
        "Certificados",
      ]);
      expect(itens.find((i) => i.label === "Em andamento")?.to).toBe("/aluno/em-andamento");
      expect(itens.find((i) => i.label === "Minhas trilhas")?.to).toBe("/aluno/minhas-trilhas");
      expect(itens.find((i) => i.label === "Salvos")?.to).toBe("/aluno/salvos");
      expect(itens.find((i) => i.label === "Notificações")?.to).toBe("/aluno/notificacoes");
    }
  });

  // COMUNICAÇÃO (decisões do operador, 06/10/2026): antes de "Alunos", com o nível 2;
  // o que ainda não existe é EM BREVE. As Dúvidas saíram do JilsonAI Admin para cá.
  it("Comunicação vem antes de Alunos, com o nível 2 e a mensagem aberta acendendo Notificações", () => {
    const doAdmin = secoesVisiveis(Role.ADMIN);
    const rotulos = doAdmin.map((s) => s.label);
    expect(rotulos.indexOf("Comunicação")).toBe(rotulos.indexOf("Alunos") - 1);
    expect(secaoAtiva("/admin/comunicacao/notificacoes/5", doAdmin)?.label).toBe("Comunicação");
    const itens = itensSecundarios("/admin/comunicacao/notificacoes", doAdmin);
    expect(itens.map((i) => i.label)).toEqual([
      "Notificações",
      "Mensagens automáticas",
      "Dúvidas",
      "E-mails educacionais",
      "E-mails promocionais",
      "Insights do JilsonAI",
    ]);
    expect(itens.filter((i) => i.estado !== "planejado").map((i) => i.label)).toEqual(["Notificações", "Mensagens automáticas"]);
    const jilsonai = doAdmin.find((s) => s.label === "JilsonAI Admin");
    expect(jilsonai?.filhos?.map((f) => f.label)).not.toContain("Escalações");
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

describe("etiquetaEmBreve — a etiqueta de tela que ainda não existe", () => {
  it("a do aluno segue o idioma do app", () => {
    const jilsonai = navegacao(en.app).find((s) => s.to === "/aluno/jilsonai");
    expect(etiquetaEmBreve(jilsonai, en.app)).toBe("COMING SOON");
    expect(etiquetaEmBreve(NAVEGACAO.find((s) => s.to === "/aluno/jilsonai"), pt.app)).toBe("EM BREVE");
  });

  // O Admin não muda de idioma (decisão do operador, 23/09/2026).
  it("a de uma seção de admin fica em português mesmo com o app em inglês", () => {
    const alunos = navegacao(en.app).find((s) => s.to === "/admin/alunos");
    expect(etiquetaEmBreve(alunos, en.app)).toBe("EM BREVE");
  });
});
