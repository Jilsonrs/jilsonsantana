import type { Dict } from "./pt.js";

// Inglês internacional, simples e direto — a voz do LinkedIn Learning, não a de
// uma agência. A régua completa e o CICLO DE REVISÃO obrigatório para texto novo
// estão em docs/idiomas.md → "Como o inglês é escrito". Se uma frase aqui
// precisar de contexto brasileiro para fazer sentido, ela está errada.
export const en: Dict = {
  common: {
    nav: {
      cursos: "Courses",
      trilhas: "Learning paths",
      assine: "Pricing",
      entrar: "Sign in",
      meusEstudos: "My learning"
    },
    a11y: {
      mainNav: "Main navigation"
    },
    footer: {
      links: [
        "Courses",
        "Learning paths",
        "Pricing",
        "FAQ",
        "About",
        "Contact",
        "Terms",
        "Privacy"
      ],
      tagline: "Data and AI, made simple.",
      copyright: "© 2026 Jilson Santana. All rights reserved. Reproduction in whole or in part is prohibited without written permission."
    },
    camadas: {
      UNIVERSAL: {
        nome: "Solid foundations",
        texto: "Core skills that work in any version — apply them with what you already have."
      },
      MODERNO: {
        nome: "Modern features",
        texto: "The latest features that speed up your work, mastered by few."
      },
      IA: {
        nome: "AI on your side",
        texto: "AI as your copilot to generate logic, fix errors, and save time."
      }
    }
  },
  home: {
    a11y: {
      hero: "Main highlight",
      catalog: "Course catalog",
      courseBadges: "Course attributes",
      chatAvatar: "Jilson avatar"
    },
    hero: {
      titlePrefix: "Become a",
      titleEmphasis: "data expert",
      titleSuffix: "in the AI era.",
      subtitle: "Courses and guided learning paths, with JilsonAI by your side.",
      featuredBadge: "FEATURED COURSE",
      accessCourse: "View course"
    },
    catalog: {
      titlePrefix: "A modern school with",
      titleEmphasis: "AI",
      titleSuffix: "in its DNA.",
      subtitle: "AI is redefining work. More than certificates, the market demands skills you can prove. Explore a dynamic catalog focused on Data, Automation, and applied AI, built for real business problems.",
      accessCourse: "View course",
      viewAll: "See all courses"
    },
    target: {
      titlePrefix: "AI rewrote the rules.<br>Become the professional who",
      titleEmphasis: "leads the way",
      titleSuffix: ".",
      subtitle: "Build the Data and AI skills companies need.",
      steps: [
        {
          num: "01",
          title: "Start where you are",
          desc: "Whether you are a beginner or have experience, there is always a next step."
        },
        {
          num: "02",
          title: "Straight to the point",
          desc: "Learn techniques and tools that make an immediate impact on your work, without wasting time."
        },
        {
          num: "03",
          title: "Lifelong learning",
          desc: "Stay updated to remain relevant and lead change in your projects or business."
        }
      ]
    },
    trilhas: {
      title: "Guided or skill-based learning paths, from start to certificate.",
      subtitle: "Pick a goal, follow a ready-made path, or build your own.",
      features: [
        {
          title: "Ready-made paths",
          desc: "A clear path that fits your career."
        },
        {
          title: "Build your own",
          desc: "Take a ready-made path and customize it to your needs."
        },
        {
          title: "JilsonAI",
          desc: "Not sure where to start? Tell it your goal and it will show you the path."
        },
        {
          title: "Certificate",
          desc: "Earn a certificate for each completed path, listing the skills you built."
        }
      ],
      viewAll: "See all learning paths",
      mockUi: {
        course1: "COURSE 1",
        course1Title: "Excel + Claude AI: Data Analysis",
        completed: "Completed",
        course2: "COURSE 2 (Current)",
        course2Title: "Power BI + AI: from basics to advanced",
        remaining: "1h 45m left",
        certificateTitle: "Path certificate",
        certificateDesc: "Unlocked when you finish the path."
      }
    },
    ai: {
      titlePrefix: "Always by your side.<br>Not a chatbot, a",
      titleEmphasis: "partner.",
      titleSuffix: "",
      subtitle: "Trained on my method. It thinks with you, explains its reasoning, and states its assumptions. And if it cannot solve a problem, I step in.",
      features: [
        {
          label: "Thinks with you:",
          text: "it knows the course you are taking and asks questions when it needs more context."
        },
        {
          label: "Explains why:",
          text: "it doesn't just give you the answer."
        },
        {
          label: "Never leaves you stuck:",
          text: "if it cannot find the solution, it calls Jilson."
        }
      ],
      chatMock: {
        status: "Online and ready",
        userMsg: "I want to automate the report I send every Monday. Where do I start?",
        aiMsg: "Let's take this step by step. I'm assuming you build that report by hand today and send it by email — is that right? If so, the first step is not the agent, it's standardizing the data. Tell me where the data comes from.",
        placeholder: "Ask JilsonAI something..."
      }
    },
    author: {
      titlePrefix: "Hi, I'm",
      titleEmphasis: "Jilson.",
      titleSuffix: "",
      subtitle: "I have a passion for making the complex simple, especially when it comes to data.",
      credentials: [
        "Data, BI & AI specialist",
        "12+ years as a data analyst and developer"
      ],
      quote: "\"I'll guide you until you feel confident with data, AI, and whatever comes next. If you want practical skills you can apply in the real world without wasting time, you are in the right place.\"",
      stats: [
        {
          value: "107K+",
          label: "Students worldwide"
        },
        {
          value: "70+",
          label: "Countries"
        },
        {
          value: "4,150+",
          label: "Corporate learners"
        }
      ]
    },
    testimonials: {
      tag: "SUCCESS STORIES",
      title: "What my students are saying."
    },
    pricing: {
      titlePrefix: "One plan.",
      titleEmphasis: "Everything included.",
      titleSuffix: "",
      monthlyTitle: "Monthly",
      discountBadge: "17% OFF THE ANNUAL PLAN",
      pricePt: "R$ 99,90",
      pricePtAnnual: "R$ 995",
      priceEn: "US$ 30",
      priceEnAnnual: "US$ 299",
      period: "/month",
      desc: "Billed every month. Cancel anytime.",
      btn: "Subscribe",
      features: [
        "Access to all courses and learning paths",
        "Certificate of completion",
        "Support from JilsonAI + Jilson",
        "Content always updated with the latest trends",
        "Pay by card or Pix"
      ],
      footer: "Full access from day one. No lock-in and no penalty: if you cancel and come back, you pick up where you left off."
    },
    faq: {
      title: "Frequently asked questions"
    },
    cta: {
      title: "Ready to master data, AI and whatever comes next?",
      btn: "Subscribe"
    }
  },

  app: {
    header: {
      catalogo: "Catalog",
      entrar: "Sign in"
    },
    nav: {
      principal: "Main",
      menuDaSecao: "Section menu",
      abrirMenu: "Open menu",
      abrirMenuConta: "Open account menu",
      menu: "Menu",
      descricaoMenu: "Main site navigation.",
      navegacao: "Navigation",
      geral: "General",
      contaPessoal: "Personal account",
      sair: "Sign out",
      inicio: "Home",
      cursos: "Courses",
      trilhas: "Learning paths",
      minhasTrilhas: "My learning paths",
      jilsonai: "JilsonAI",
      certificados: "Certificates",
      minhaConta: "My account",
      seusDados: "Your details",
      preferencias: "Preferences",
      senhaEAcesso: "Password and access",
      sessoesAtivas: "Active sessions",
      faturamento: "Billing and subscription",
      integracoes: "Integrations"
    },
    login: {
      tituloPrefixo: "Secure",
      tituloEnfase: "Access",
      area: "[ Student Area ]",
      entrar: "Sign in",
      entrando: "Signing in…",
      email: "Email",
      senha: "Password",
      emailInvalido: "Enter a valid email address.",
      senhaObrigatoria: "Enter your password.",
      credenciaisIncorretas: "Incorrect email or password.",
      falha: "We couldn't sign you in right now. Please try again in a few minutes."
    },
    footer: {
      erroIdioma: "We couldn't change the language. Please try again."
    },
    comum: {
      carregando: "Loading…"
    },
    inicio: {
      ola: "Hi",
      intro: "This is your starting point. The courses you begin show up here, so you can pick up where you left off.",
      continueTitulo: "Keep learning",
      continueVazio: "Lessons in progress show up here once you start a course. Pick one from the catalog, and your progress will be waiting for you.",
      verCatalogo: "Browse the catalog",
      porOndeComecar: "Where to start",
      portaCatalogo: "Catalog",
      portaCatalogoLegenda: "COURSES AND LEARNING PATHS",
      portaMinhasTrilhas: "My learning paths",
      portaMinhasTrilhasLegenda: "WHAT YOU SAVED"
    },
    conta: {
      titulo: "My account",
      descricao: "Manage your sign-in details.",
      seusDados: "Your details",
      seusDadosDescricao: "Your basic account information.",
      nome: "Name",
      email: "Email",
      papel: "Role"
    },
    minhasTrilhas: {
      titulo: "My learning paths",
      descricao: "Learning paths and selections you saved to study.",
      erro: "We couldn't load your learning paths.",
      vazio: "You haven't saved any learning paths yet.",
      verCatalogo: "Browse learning paths",
      voltar: "← Back to My learning paths",
      erroDetalhe: "We couldn't load this learning path.",
      semConteudo: "This learning path has no content yet."
    },
    catalogo: {
      cursos: "Courses",
      trilhas: "Learning paths",
      catalogoCursos: "Course catalog",
      catalogoTrilhas: "Learning path catalog",
      aulas: "Lessons",
      vazioCursos: "No courses available yet.",
      vazioTrilhas: "No learning paths available yet.",
      erroCursos: "We couldn't load the courses.",
      erroTrilhas: "We couldn't load the learning paths.",
      nadaEncontrado: "No results for"
    },
    busca: {
      placeholder: "Search learning paths, courses, and lessons…",
      rotulo: "Search"
    },
    niveis: {
      INICIANTE: "Beginner",
      INTERMEDIARIO: "Intermediate",
      AVANCADO: "Advanced"
    },
    curso: {
      modulo: "module",
      modulos: "modules",
      aula: "lesson",
      aulas: "lessons",
      naoEncontrado: "Course not found.",
      conteudo: "Course content",
      faq: "Frequently asked questions",
      aprender: "What you'll learn",
      requisitos: "Prerequisites",
      paraQuem: "Who this course is for"
    },
    trilha: {
      naoEncontrada: "Learning path not found.",
      conteudo: "Learning path content",
      entrarParaSalvar: "Sign in to save",
      salva: "Learning path saved ✓",
      salvando: "Saving…",
      salvar: "Save learning path",
      erroSalvar: "We couldn't save this learning path. Please try again."
    }
  }
};
