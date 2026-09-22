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
      entrar: "Entrar"
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
      title: "Quem aprendeu comigo está dizendo.",
      list: [
        {
          text: "O professor está muito acima de qualquer expectativa! Um curso 100% prático, com aplicações imediatas. Nos meus 30 anos lecionando, nunca vi uma didática tão apurada.",
          initials: "EF",
          name: "Edson Garcia Fernandes"
        },
        {
          text: "O professor explica muito bem, passo a passo, para até quem nunca mexeu no programa entender tudo. Eu sabia pouco, quase nada, e agora já entendo até um pouquinho de programação!",
          initials: "NM",
          name: "Nicole Silveira Manoel"
        },
        {
          text: "Incrível! Acabei de finalizar esse curso e estou sem palavras. Como uma educadora, gosto de aprender com práticas, por isso achei todo o cronograma perfeito. Muito obrigada professor, um forte abraço.",
          initials: "BV",
          name: "Beatriz Veloso"
        },
        {
          text: "Realizou grandes avanços no meu dia a dia. Também ajudou a melhorar a performance da minha equipe, pois repliquei toda semana os conhecimentos que aprendi. Assim crescemos juntos.",
          initials: "VQ",
          name: "Vinicius Dias de Queiroz"
        }
      ]
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
      title: "Perguntas frequentes",
      list: [
        {
          q: "É para quem nunca mexeu com dados? Preciso saber programar, matemática ou inglês?",
          a: "Sim. A escola é projetada para profissionais de negócios. Você não precisa de experiência prévia. Ensinamos passo a passo, do zero absoluto aos tópicos avançados."
        },
        {
          q: "Serve para a minha área?",
          a: "Sim. Os dados estão em todo lugar: finanças, marketing, RH, logística. As ferramentas e os métodos ensinados são universais e aplicáveis a qualquer setor do mercado."
        },
        {
          q: "Por onde começo?",
          a: "Nós oferecemos trilhas prontas e sugestões personalizadas pelo JilsonAI para guiar seu primeiro passo."
        },
        {
          q: "Preciso comprar alguma ferramenta?",
          a: "Não. A grande maioria das ferramentas abordadas possui versões gratuitas completas suficientes para você aplicar o conhecimento."
        },
        {
          q: "As aulas são gravadas? E se eu não conseguir manter o ritmo?",
          a: "Sim, todas as aulas ficam gravadas e você estuda no seu próprio ritmo, podendo rever quantas vezes quiser."
        },
        {
          q: "Como os cursos são escolhidos?",
          a: "Poucos cursos, escolhidos a dedo, focados nas ferramentas e métodos que você aplica no trabalho amanhã de manhã."
        },
        {
          q: "Como funciona o suporte? O que é o JilsonAI?",
          a: "O JilsonAI é um parceiro inteligente treinado na nossa metodologia para ajudar você imediatamente. Se ele não resolver, o Jilson entra em ação."
        },
        {
          q: "Tem certificado? Serve para o LinkedIn?",
          a: "Sim! Ao concluir as trilhas e cursos, você emite seu certificado válido que pode ser compartilhado diretamente no seu perfil do LinkedIn."
        },
        {
          q: "Qual a diferença para os vídeos gratuitos do YouTube?",
          a: "Aqui você tem uma trilha com método estruturado, começo, meio e fim, suporte oficial, exercícios com dados reais e emissão de certificado."
        },
        {
          q: "Posso comprar só um curso?",
          a: "Não. O modelo é de assinatura (mensal ou anual), garantindo acesso a todo o catálogo e novas atualizações constantes."
        },
        {
          q: "Como e quando recebo a cobrança?",
          a: "Você pode optar por pagar R$ 99,90 cobrados todo mês, ou R$ 995 cobrados de uma única vez no plano anual."
        },
        {
          q: "Como cancelo? Posso voltar depois?",
          a: "Cancele com um clique no seu painel de aluno, sem nenhuma taxa. Quando quiser voltar, seu histórico e seus certificados estarão guardados esperando por você."
        },
        {
          q: "A assinatura vale para os cursos em inglês?",
          a: "Sim, a mesma assinatura libera acesso a todo o conteúdo nos dois idiomas."
        },
        {
          q: "Tem reembolso?",
          a: "Sim, você possui garantia legal de arrependimento."
        },
        {
          q: "Empresas podem assinar? Emitem nota fiscal?",
          a: "Sim, emitimos nota fiscal para todos os pagamentos. Para planos corporativos ou múltiplos acessos, entre em contato."
        }
      ]
    },
    cta: {
      title: "Pronto para dominar dados, IA e o que vier depois?",
      btn: "Assinar"
    }
  }
};

export type Dict = typeof pt;
