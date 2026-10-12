// O texto do site, em português. É o VALOR DE FÁBRICA: o que uma instalação nova
// mostra antes de o operador editar qualquer coisa pelo /admin (docs/content.md § 16).
//
// A primeira chave diz ONDE o texto aparece:
//   common.*  — em TODA página pública (menu, rodapé) e no rodapé do app logado,
//               que lê `common.footer` por GET /api/site-text/common/:lang
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
    },
    // O selo "3 camadas" — os textos GLOBAIS, escritos uma vez para todo curso
    // (courses.md §2.2). Editáveis em Admin → Textos (decisão do operador,
    // 24/09/2026). O ícone e a cor continuam no código (LAYER_CONFIG).
    camadas: {
      UNIVERSAL: {
        nome: "Fundamentos sólidos",
        texto: "A base que funciona em qualquer versão — você aplica com o que já tem."
      },
      MODERNO: {
        nome: "Recursos modernos",
        texto: "Os recursos mais atuais que aceleram seu trabalho e poucos dominam."
      },
      IA: {
        nome: "Com IA do seu lado",
        texto: "A IA como copiloto pra gerar lógica, destravar erros e ganhar tempo."
      }
    },
    // O quadro "Este curso inclui" da página do curso (decisões do operador,
    // 04/10/2026). Os materiais exclusivos têm texto GLOBAL, como as camadas: no
    // curso, só se marca quais ele tem. Editáveis em Admin → Textos.
    inclui: {
      titulo: "Este curso inclui:",
      arquivos: "Arquivos para acompanhar as aulas",
      // As linhas calculadas (operador, 05/10/2026). O NÚMERO quem põe é o código,
      // antes da palavra: editar aqui não apaga o número.
      deVideo: "de vídeo",
      artigo: "artigo",
      artigos: "artigos",
      aulaGratis: "aula grátis para experimentar",
      aulasGratis: "aulas grátis para experimentar",
      legendasPt: "Legendas em português",
      legendasEn: "Legendas em inglês",
      // Todo curso dá certificado ao ser concluído (operador, 05/10/2026): linha fixa.
      certificado: "Certificado de conclusão"
    },
    materiais: {
      BIBLIOTECA_DE_PROMPTS: "Biblioteca de prompts",
      APOSTILA: "Apostila"
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
      // Para quem está logado, já foi assinante e hoje está sem acesso (decisão do operador,
      // 10/10/2026: "Assinar" só na primeira vez). O visitante sem login vê sempre `btn`.
      btnReactivate: "Reativar assinatura",
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
      btn: "Assinar",
      btnReactivate: "Reativar assinatura"
    }
  },

  // O APP DO ALUNO (telas depois do login + a tela de login). NÃO aparece em
  // Admin → Textos (decisão do operador, 23/09/2026): muda por código. O Admin
  // não está aqui — fica em português, escrito na própria tela.
  app: {
    header: {
      catalogo: "Catálogo",
      entrar: "Entrar"
    },
    nav: {
      principal: "Principal",
      menuDaSecao: "Menu da seção",
      aula: "Aula",
      abrirMenu: "Abrir o menu",
      fecharMenu: "Fechar o menu",
      abrirMenuConta: "Abrir o menu da conta",
      menu: "Menu",
      descricaoMenu: "Navegação principal do site.",
      navegacao: "Navegação",
      geral: "Geral",
      contaPessoal: "Conta Pessoal",
      sair: "Sair",
      inicio: "Início",
      cursos: "Cursos",
      trilhas: "Trilhas",
      meusEstudos: "Meus estudos",
      emAndamento: "Em andamento",
      salvos: "Salvos",
      // A lista de notificações, embaixo de Salvos (decisão do operador, 06/10/2026).
      notificacoes: "Notificações",
      minhasTrilhas: "Minhas trilhas",
      concluidos: "Concluídos",
      jilsonai: "JilsonAI",
      certificados: "Certificados",
      // A etiqueta de tela que ainda não existe (rail, gaveta, nível 2). Seção de
      // admin usa sempre a de português (o Admin não muda de idioma).
      emBreve: "EM BREVE",
      minhaConta: "Minha conta",
      seusDados: "Seus dados",
      preferencias: "Preferências",
      senhaEAcesso: "Senha e Acesso",
      sessoesAtivas: "Sessões ativas",
      faturamento: "Faturamento e Assinatura",
      integracoes: "Integrações"
    },
    login: {
      tituloPrefixo: "Acesso",
      tituloEnfase: "Seguro",
      area: "[ Área do Aluno ]",
      entrar: "Entrar",
      entrando: "Entrando…",
      email: "E-mail",
      senha: "Senha",
      emailInvalido: "Informe um e-mail válido.",
      senhaObrigatoria: "Informe sua senha.",
      credenciaisIncorretas: "E-mail ou senha incorretos.",
      falha: "Não foi possível entrar agora. Tente novamente em alguns minutos."
    },
    footer: {
      erroIdioma: "Não foi possível trocar o idioma. Tente de novo."
    },
    comum: {
      carregando: "Carregando…",
      // A tela de erro no lugar da página em branco (05/10/2026). Rascunho (P38).
      algoDeuErrado: "Algo deu errado ao abrir esta tela.",
      recarregar: "Recarregar a página"
    },
    inicio: {
      ola: "Olá",
      intro: "Aqui é o seu ponto de partida. O que você começar a estudar aparece nesta tela, para você continuar de onde parou.",
      continueTitulo: "Continue estudando",
      // O painel do Início (operador, 29/09/2026). Os textos abaixo são rascunho
      // do agente, para a revisão do operador.
      continueEmBreve: "Em breve, a aula em que você parou aparece aqui, para continuar com um clique.",
      nenhumaTrilha: "Você ainda não salvou nenhuma trilha.",
      verTrilhas: "Ver as trilhas prontas",
      verTodas: "Ver todas",
      atalhos: "Atalhos"
    },
    conta: {
      titulo: "Minha conta",
      descricao: "Gerencie suas informações de acesso.",
      seusDados: "Seus Dados",
      seusDadosDescricao: "Informações básicas da sua conta na plataforma.",
      nome: "Nome",
      email: "E-mail",
      papel: "Papel"
    },
    // O sino de Notificações (Bloco E, etapa 4 — decisões do operador,
    // 04/10/2026). Rascunho do agente, para a revisão do operador (P38).
    // `{curso}` e `{n}` são trocados no código.
    notificacoes: {
      titulo: "Notificações",
      rotuloComUmaNaoLida: "Notificações, 1 não lida",
      rotuloComNaoLidas: "Notificações, {n} não lidas",
      marcarTodas: "Marcar todas como lidas",
      verTodas: "Ver todas",
      vazio: "Nenhuma notificação por enquanto.",
      erro: "Não foi possível carregar as notificações.",
      boasVindas: "Boas-vindas ao curso {curso}",
      parabens: "Parabéns! Você concluiu {curso}",
      irParaOCurso: "Ir para o curso",
      naoLida: "Não lida",
      // A notificação aberta que não está mais na lista (rascunho do agente, 06/10/2026).
      naoEncontrada: "Notificação não encontrada.",
    },
    // A tela Salvos, em Meus estudos (decisão do operador, 03/10/2026).
    salvos: {
      vazio: "Nada salvo ainda. Salve aulas e cursos para assistir depois.",
      erro: "Não foi possível carregar os salvos.",
    },
    minhasTrilhas: {
      titulo: "Minhas trilhas",
      descricao: "Trilhas e seleções que você salvou para estudar.",
      erro: "Não foi possível carregar suas trilhas.",
      vazio: "Você ainda não salvou nenhuma trilha.",
      verCatalogo: "Ver trilhas do catálogo",
      voltar: "← Voltar para Minhas Trilhas",
      erroDetalhe: "Não foi possível carregar esta trilha.",
      semConteudo: "Esta trilha ainda não tem conteúdo."
    },
    catalogo: {
      cursos: "Cursos",
      trilhas: "Trilhas",
      catalogoCursos: "Catálogo de Cursos",
      catalogoTrilhas: "Catálogo de Trilhas",
      aulas: "Aulas",
      vazioCursos: "Nenhum curso publicado ainda.",
      vazioTrilhas: "Nenhuma trilha publicada ainda.",
      erroCursos: "Não foi possível carregar os cursos.",
      erroTrilhas: "Não foi possível carregar as trilhas.",
      nadaEncontrado: "Nada encontrado para"
    },
    busca: {
      placeholder: "Buscar trilhas, cursos e aulas…",
      rotulo: "Buscar"
    },
    // O NOME do nível para o aluno (operador, 24/09/2026). O valor (INICIANTE…)
    // continua código; o Admin segue mostrando o valor cru.
    niveis: {
      INICIANTE: "Iniciante",
      INTERMEDIARIO: "Intermediário",
      AVANCADO: "Avançado",
      TODOS_OS_NIVEIS: "Todos os níveis"
    },
    // Singular e plural (revisão de 24/09): "1 módulo", "2 módulos"; zero é plural.
    curso: {
      modulo: "módulo",
      modulos: "módulos",
      aula: "aula",
      aulas: "aulas",
      naoEncontrado: "Curso não encontrado.",
      conteudo: "Conteúdo do curso",
      faq: "Perguntas frequentes",
      aprender: "O que você vai aprender",
      requisitos: "Pré-requisitos",
      paraQuem: "Pra quem é",
      diferenciais: "Diferenciais do curso",
      // "Nosso método." — a segunda palavra sai destacada na tela.
      // "40% concluído", no cartão do curso começado (Fase 5, 03/10/2026).
      concluido: "concluído",
      metodo: { inicio: "Nosso", destaque: "método" },
      videoApresentacao: "Vídeo de apresentação do curso"
    },
    trilha: {
      naoEncontrada: "Trilha não encontrada.",
      conteudo: "Conteúdo da trilha",
      entrarParaSalvar: "Entrar para salvar",
      salva: "Trilha salva ✓",
      salvando: "Salvando…",
      salvar: "Salvar trilha",
      erroSalvar: "Não foi possível salvar. Tente de novo.",
      // A barra no cartão da trilha (Bloco MEDIR, etapa 3, 09/10/2026), lida pelo leitor de
      // tela. Rascunho do agente: o texto é do operador (P55).
      progressoNaTrilha: "Progresso na trilha"
    },
    // A PÁGINA DA AULA (etapa 4 do Bloco U, 29/09/2026). Rascunho do agente: o
    // texto é do operador.
    // ASSINAR (Fase 4, etapa 4.2 — 10/10/2026). RASCUNHO do agente: o operador revisa depois
    // ("isso fazemos depois, é detalhe"). `{valor}`, `{desconto}` e `{meses}` são trocados no código.
    assinar: {
      titulo: "Assinar",
      // Quem já foi assinante e está sem acesso REATIVA (decisão do operador, 10/10/2026):
      // o título da tela e o botão trocam; "Assinar" fica só para a primeira vez.
      tituloReativar: "Reativar assinatura",
      descricao: "Uma assinatura, todos os cursos e trilhas.",
      escolhaDoPlano: "Escolha o plano",
      mensal: "Mensal",
      anual: "Anual",
      porMes: "/mês",
      porAno: "/ano",
      anualEquivale: "equivale a {valor} por mês",
      // Como cada plano é cobrado e o selo do anual (pedido do operador, 10/10/2026: destacar o
      // desconto do anual e simplificar, "como a Anthropic faz"). `{desconto}` é calculado dos preços.
      cobradoPorMes: "Cobrado todo mês",
      cobradoPorAno: "Cobrado uma vez por ano",
      seloDoAnual: "{desconto} de desconto",
      semFidelidade: "Sem fidelidade. Cancele quando quiser.",
      codigo: "Código promocional",
      aplicar: "Aplicar",
      remover: "Remover",
      codigoInvalido: "Este código não é válido.",
      descontoParaSempre: "{desconto} de desconto em todas as cobranças",
      descontoUmaVez: "{desconto} de desconto na primeira cobrança",
      descontoPorMeses: "{desconto} de desconto por {meses} meses",
      // Só aparece com código promocional aplicado: sem código, o cartão do plano já diz tudo.
      hoje: "Hoje você paga",
      pagamento: "Pagamento",
      botao: "Assinar",
      botaoReativar: "Reativar assinatura",
      processando: "Processando…",
      erroPlanos: "Não foi possível carregar os planos. Tente de novo.",
      erro: "Não foi possível concluir a assinatura. Confira os dados e tente de novo.",
      jaAssinante: "Você já é assinante.",
      irParaInicio: "Ir para o Início",
      confirmando: "Confirmando sua assinatura…",
      confirmada: "Assinatura confirmada. Bons estudos!",
      comecar: "Começar a estudar",
      demorando: "Está demorando mais que o normal. Seu pagamento não se perde: esta página continua conferindo."
    },
    // FATURAMENTO E ASSINATURA (Fase 4, etapa 4.6). Textos APROVADOS pelo operador em 11/10/2026,
    // nos dois idiomas. O título da tela é o rótulo do menu (`nav.faturamento`); os nomes dos
    // planos e "Assinar" / "Reativar assinatura" são os de `assinar`.
    faturamento: {
      descricao: "Seu plano, sua forma de pagamento e a próxima cobrança.",
      seuPlano: "Seu plano",
      proximaCobranca: "Próxima cobrança: {valor} em {data}",
      vaiCancelar: "Sua assinatura termina em {data}. Você continua com acesso até lá.",
      // Os três abaixo entram com as telas da sessão (b): desfazer, mudar de plano e cancelar.
      manter: "Manter a assinatura",
      mudarDePlano: "Mudar de plano",
      cancelar: "Cancelar assinatura",
      atrasada: "Não conseguimos cobrar o seu cartão. Troque o cartão para não perder o acesso.",
      formaDePagamento: "Forma de pagamento",
      cartao: "{bandeira} •••• {final} · vence em {mes}/{ano}",
      semCartao: "Nenhum cartão cadastrado.",
      trocarCartao: "Trocar cartão",
      adicionarCartao: "Adicionar cartão",
      semAssinatura: "Você ainda não tem uma assinatura.",
      terminou: "Sua assinatura terminou em {data}.",
      // Sem a data (a Stripe não a tem): o texto aprovado, sem o "em {data}". Rascunho do agente.
      terminouSemData: "Sua assinatura terminou.",
      erro: "Não foi possível carregar a sua assinatura. Tente de novo.",
      // A tela de trocar o cartão.
      cartaoDescricao: "O novo cartão passa a valer na próxima cobrança.",
      salvarCartao: "Salvar cartão",
      salvando: "Salvando…",
      cartaoAtualizado: "Cartão atualizado.",
      cartaoAtualizadoEPago: "Cartão atualizado e pagamento confirmado.",
      erroDoCartao: "Não foi possível salvar o cartão. Confira os dados e tente de novo.",
      // AS TELAS DA SESSÃO (b): mudar de plano, cancelar e a confirmação do banco. Textos em
      // português APROVADOS pelo operador em 11/10/2026, bloco a bloco. O INGLÊS é rascunho do
      // agente: ele será revisado com o Antigravity (pendência P72). `{valor}` e `{data}` são
      // trocados no código.
      plano: {
        descricao: "Escolha como prefere pagar. O acesso é o mesmo nos dois planos.",
        atual: "Seu plano atual",
        paraOAnual: "A troca vale na hora. Hoje você paga {valor}, já descontado o que sobrou do mês que você pagou. A próxima cobrança é em {data}.",
        mudarParaOAnual: "Mudar para o Anual",
        agoraAnual: "Pronto. Seu plano agora é o Anual.",
        paraOMensal: "A troca vale em {data}, quando termina o ano que você já pagou. Até lá nada muda e nada é cobrado. Depois, {valor} por mês.",
        mudarParaOMensal: "Mudar para o Mensal",
        // No resumo, enquanto a troca está marcada (texto decidido por ele antes, em 11/10/2026).
        mudaParaOMensal: "Seu plano muda para Mensal em {data}.",
        continuarNoAnual: "Continuar no Anual",
        continuaNoAnual: "Pronto. Você continua no plano Anual.",
        renovacaoParada: "Sua assinatura termina em {data}. Para mudar de plano, mantenha a assinatura primeiro.",
        atrasada: "Não conseguimos cobrar o seu cartão. Troque o cartão antes de mudar de plano.",
        cartaoRecusado: "Seu cartão foi recusado e o plano continua o mesmo. Troque o cartão e tente de novo.",
        erro: "Não foi possível mudar o plano. Tente de novo.",
        // Caso raro: a tela ficou aberta por horas (ou o mês virou) e a conta já está longe do valor mostrado — a tela busca o valor de novo. Texto do operador, 11/10/2026.
        valorAtualizado: "Este valor foi atualizado. Confira e clique para concluir."
      },
      cancelamento: {
        descricao: "Você pode cancelar quando quiser. Seu progresso fica guardado: se voltar, continua de onde parou.",
        pergunta: "Por que você está cancelando? (opcional)",
        // As chaves são as de `MOTIVOS_DE_CANCELAMENTO` (`core/src/constants/billing.ts`).
        motivos: {
          caro: "Está caro para mim agora",
          "sem-tempo": "Não estou tendo tempo de estudar",
          "ja-aprendi": "Já aprendi o que precisava",
          "sem-conteudo": "Não encontrei o conteúdo que procurava",
          outro: "Outro motivo"
        },
        contarMais: "Quer contar mais?",
        // Nos 7 primeiros dias a tela mostra as DUAS saídas; depois, só `acessoAte` e o botão de cancelar.
        pararTitulo: "Parar a renovação e continuar",
        acessoAte: "Você continua com acesso até {data}. Depois disso, nada mais é cobrado.",
        pararBotao: "Parar a renovação",
        reembolsoTitulo: "Cancelar e receber o dinheiro de volta",
        reembolsoTexto: "Devolvemos {valor} no cartão que você usou e o seu acesso termina agora. Você pode pedir até {data}.",
        reembolsoBotao: "Cancelar e receber {valor}",
        voltar: "Voltar sem cancelar",
        parou: "Assinatura cancelada. Você continua com acesso até {data}. Mudou de ideia? Até lá, é só clicar em Manter a assinatura.",
        reembolsado: "Assinatura cancelada. Devolvemos {valor} no cartão que você usou. O valor costuma aparecer na fatura em até 10 dias úteis, conforme o banco.",
        mantida: "Pronto. Sua assinatura continua.",
        // Rascunho do agente (pendência P73): quando "Manter a assinatura" falha.
        erroAoManter: "Não foi possível manter a assinatura. Tente de novo.",
        prazoAcabou: "O prazo de 7 dias para o reembolso terminou. Você ainda pode parar a renovação.",
        // Com a cobrança ATRASADA, cancelar termina a assinatura na hora (aprovado em 11/10/2026).
        terminaAgora: "Sua assinatura termina agora, e a cobrança em aberto não será mais tentada.",
        // Para quem tinha a troca para o Mensal marcada: ela é desfeita junto (aprovado em 11/10/2026).
        trocaDesfeita: "Sua troca para o plano Mensal também será desfeita.",
        devolucaoFalhou: "Sua assinatura foi cancelada, mas não conseguimos devolver o valor agora. Já fomos avisados e vamos resolver. Você não precisa fazer nada.",
        erro: "Não foi possível cancelar. Tente de novo."
      },
      // Quando o banco pede uma confirmação: na troca para o Anual e no cartão novo com a cobrança atrasada.
      banco: {
        confirmando: "Seu banco pediu uma confirmação para esta cobrança. Conclua na janela do banco.",
        naoConcluiuNoPlano: "A confirmação do banco não foi concluída. O plano continua o mesmo e nada foi cobrado.",
        naoConcluiuNoCartao: "Cartão atualizado. A cobrança em aberto ainda precisa da confirmação do seu banco.",
        confirmar: "Confirmar pagamento"
      }
    },
    aula: {
      conteudoDoCurso: "Conteúdo do curso",
      carregando: "Carregando…",
      erro: "Não foi possível abrir a aula. Tente de novo.",
      naoEncontrada: "Aula não encontrada.",
      paraAssinantes: "Esta aula é para assinantes.",
      // O botão embaixo, só para quem está logado (Fase 4, etapa 4.2). Rascunho.
      assinar: "Assinar",
      // O mesmo botão para quem já foi assinante (decisão do operador, 10/10/2026).
      reativar: "Reativar assinatura",
      // Salvar para assistir depois (decisão do operador, 03/10/2026, "como no LinkedIn").
      salvarParaDepois: "Salvar para depois",
      salvarCurso: "Salvar curso",
      progressoNoCurso: "Progresso no curso",
      concluida: "Concluída",
      semVideo: "Esta aula ainda não tem vídeo.",
      semTexto: "Esta aula ainda não tem texto.",
      recursos: "Arquivos",
      recursosDaAula: "Arquivos para baixar",
      recursosSoAssinantes: "Os arquivos desta aula são para assinantes.",
      rascunho: "Rascunho",
      arquivado: "Arquivado",
      aulaDeVideo: "Aula em vídeo",
      aulaDeTexto: "Aula em texto",
      abrirIa: "Abrir o JilsonAI",
      fecharIa: "Fechar o JilsonAI",
      iaTitulo: "JilsonAI",
      iaEmBreve: "Em breve: tire as suas dúvidas sobre esta aula aqui mesmo, sem sair do vídeo.",
      sobreOCurso: "Sobre o curso",
      cursoSemAulas: "Este curso ainda não tem aulas.",
      // O botão no fim da aula de texto (decisão do operador, 06/10/2026 — texto aprovado por ele).
      proximaAula: "Próxima aula"
    }
  }
};

export type Dict = typeof pt;
