// O texto do site, em português. É o VALOR DE FÁBRICA: o que uma instalação nova
// mostra antes de o operador editar qualquer coisa pelo /admin (docs/content.md § 16).
//
// A primeira chave diz ONDE o texto aparece:
//   common.*  — em TODA página pública (menu, rodapé)
//   home.*    — só na home
// Página nova entra como uma chave nova aqui (`curso`, `trilha`, `legal`…) e
// já aparece no admin sozinha. Não misture: se o texto aparece em duas páginas,
// ele é `common`.
export const pt = {
  common: {
    nav: {
      cursos: "Cursos",
      trilhas: "Trilhas",
      assine: "Assine",
      entrar: "Entrar",
      meusEstudos: "Meus estudos"
    },
    a11y: {
      mainNav: "Navegação Principal"
    },
    footer: {
      links: [
        "Cursos",
        "Trilhas",
        "Assine",
        "FAQ",
        "Quem somos",
        "Contato",
        "Termos",
        "Privacidade"
      ],
      tagline: "Dados e IA, sem complicação.",
      copyright: "© 2026 Jilson Santana. Todos os direitos reservados. Reprodução total ou parcial é proibida sem autorização por escrito."
    }
  },
  home: {
    a11y: {
      hero: "Destaque Principal",
      catalog: "Catálogo de cursos",
      courseBadges: "Atributos do curso",
      chatAvatar: "Jilson Avatar"
    },
    hero: {
      titlePrefix: "Torne-se um",
      titleEmphasis: "especialista",
      titleSuffix: "em dados na era da IA.",
      subtitle: "Cursos e Trilhas guiadas, com o JilsonAI do seu lado.",
      featuredBadge: "CURSO EM DESTAQUE",
      accessCourse: "Acessar"
    },
    catalog: {
      titlePrefix: "Uma escola moderna com",
      titleEmphasis: "IA",
      titleSuffix: "no DNA.",
      subtitle: "A IA está redefinindo o mundo. Mais do que certificados, o mercado exige competências validadas. Explore um catálogo dinâmico, focado em Dados, Automação e IA aplicada para os desafios reais das empresas de hoje.",
      accessCourse: "Acessar",
      viewAll: "Ver todos os cursos"
    },
    target: {
      titlePrefix: "A IA reescreveu as regras.<br>Torne-se o profissional que",
      titleEmphasis: "dita o jogo",
      titleSuffix: ".",
      subtitle: "Desenvolva as competências de Dados e IA que as empresas precisam.",
      steps: [
        {
          num: "01",
          title: "Comece de onde estiver",
          desc: "Do zero ou com experiência, sempre há um próximo passo."
        },
        {
          num: "02",
          title: "Direto ao Ponto",
          desc: "Domine técnicas e ferramentas que geram impacto imediato no seu dia a dia, sem perda de tempo."
        },
        {
          num: "03",
          title: "Lifelong Learning",
          desc: "Atualize-se continuamente para se manter relevante e conduzir a adaptação rápida dos seus projetos ou negócios diante das mudanças."
        }
      ]
    },
    trilhas: {
      title: "Trilhas guiadas ou por competência, até o certificado.",
      subtitle: "Escolha um objetivo, siga uma trilha pronta ou monte a sua.",
      features: [
        {
          title: "Trilhas prontas",
          desc: "Um caminho definido que combina com a sua carreira."
        },
        {
          title: "Monte a sua",
          desc: "Pegue uma trilha pronta e deixe do seu jeito."
        },
        {
          title: "JilsonAI",
          desc: "Não sabe por onde começar? Diga aonde quer chegar e ele mostra a trilha."
        },
        {
          title: "Certificado",
          desc: "Um certificado por trilha concluída, com as competências que você desenvolveu."
        }
      ],
      viewAll: "Ver todas as Trilhas",
      mockUi: {
        course1: "CURSO 1",
        course1Title: "Excel + Claude IA: Análise de Dados",
        completed: "Concluído",
        course2: "CURSO 2 (Atual)",
        course2Title: "Power BI + IA: do básico ao avançado",
        remaining: "faltam 1h 45m",
        certificateTitle: "Certificado da trilha",
        certificateDesc: "Desbloqueado ao concluir a trilha."
      }
    },
    ai: {
      titlePrefix: "Sempre ao seu lado.<br>Não é um chat, é",
      titleEmphasis: "um parceiro.",
      titleSuffix: "",
      subtitle: "Treinado no meu método. Ele pensa junto com você, explica o porquê e diz o que está supondo. E, quando ele não resolve, eu entro.",
      features: [
        {
          label: "Pensa junto:",
          text: "conhece o curso que você está fazendo e pergunta quando precisa entender melhor."
        },
        {
          label: "Explica o porquê:",
          text: "não entrega só a resposta."
        },
        {
          label: "Não te deixa sozinho:",
          text: "quando não resolve, chama o Jilson."
        }
      ],
      chatMock: {
        status: "Online e pronto",
        userMsg: "Quero automatizar o relatório que eu mando toda segunda. Por onde começo?",
        aiMsg: "Vamos por partes. Estou supondo que hoje você monta esse relatório à mão e envia por e-mail — é isso? Se for, o primeiro passo não é o agente, é padronizar a base. Me conta de onde vêm os dados.",
        placeholder: "Pergunte algo ao JilsonAI..."
      }
    },
    author: {
      titlePrefix: "Olá, sou",
      titleEmphasis: "o Jilson.",
      titleSuffix: "",
      subtitle: "Tenho paixão por tornar o complexo simples, especialmente quando se trata de dados.",
      credentials: [
        "Especialista em Dados, BI & IA",
        "12+ anos como analista de dados e desenvolvedor"
      ],
      quote: "\"Vou te guiar para que você se sinta confiante com dados, IA e o que vier depois. Se você busca habilidades práticas e aplicáveis ao mundo real sem perder tempo, você está no lugar certo.\"",
      stats: [
        {
          value: "107 mil+",
          label: "Alunos no mundo"
        },
        {
          value: "70+",
          label: "Países"
        },
        {
          value: "4.150+",
          label: "Corporativos"
        }
      ]
    },
    testimonials: {
      tag: "HISTÓRIAS DE SUCESSO",
      title: "Quem aprendeu comigo está dizendo."
    },
    pricing: {
      titlePrefix: "Um plano.",
      titleEmphasis: "Tudo incluso.",
      titleSuffix: "",
      monthlyTitle: "Mensal",
      discountBadge: "17% DE DESCONTO NO PLANO ANUAL",
      pricePt: "R$ 99,90",
      pricePtAnnual: "R$ 995",
      priceEn: "US$ 30",
      priceEnAnnual: "US$ 299",
      period: "/mês",
      desc: "Cobrado todo mês. Cancele quando quiser.",
      btn: "Assinar",
      features: [
        "Acesso a todos os Cursos e Trilhas",
        "Certificado de Conclusão",
        "Suporte com JilsonAI + Jilson",
        "Conteúdo sempre atualizado e alinhado com as últimas novidades",
        "Pagamento no cartão ou no Pix"
      ],
      footer: "Acesso a tudo desde o primeiro dia. Sem fidelidade e sem multa: se você cancelar e voltar, continua de onde parou."
    },
    faq: {
      title: "Perguntas frequentes"
    },
    cta: {
      title: "Pronto para dominar dados, IA e o que vier depois?",
      btn: "Assinar"
    }
  }
};

export type Dict = typeof pt;
