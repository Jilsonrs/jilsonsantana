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
      entrar: "Sign in"
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
      title: "What my students are saying.",
      list: [
        {
          text: "This instructor exceeded all expectations! A fully hands-on course, with skills you can apply right away. In my 30 years of teaching, I have never seen such excellent methodology.",
          initials: "EF",
          name: "Edson Garcia Fernandes"
        },
        {
          text: "The instructor explains step by step, so even a complete beginner can understand everything. I knew almost nothing, and now I even understand a bit of programming!",
          initials: "NM",
          name: "Nicole Silveira Manoel"
        },
        {
          text: "Incredible! I just finished this course and I am speechless. As an educator, I like to learn by doing, so I found the course structure perfect. Thank you so much!",
          initials: "BV",
          name: "Beatriz Veloso"
        },
        {
          text: "It made a real difference in my daily work. It also helped my team perform better, because every week I shared what I learned. That way we grew together.",
          initials: "VQ",
          name: "Vinicius Dias de Queiroz"
        }
      ]
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
      title: "Frequently asked questions",
      list: [
        {
          q: "Is this for someone who has never worked with data? Do I need to know how to code or be good at math?",
          a: "Yes, it is. The school is built for business professionals. You don't need previous experience. We teach step by step, from absolute zero to advanced topics."
        },
        {
          q: "Does it work for my field?",
          a: "Yes. Data is everywhere: finance, marketing, HR, logistics. The tools and methods we teach are universal and apply to any industry."
        },
        {
          q: "Where do I start?",
          a: "We offer ready-made learning paths, plus personalized suggestions from JilsonAI to guide your first step."
        },
        {
          q: "Do I need to buy any tools?",
          a: "No. Most of the tools we cover have complete free versions, enough for you to apply what you learn."
        },
        {
          q: "Are the lessons recorded? What if I can't keep up?",
          a: "Yes, every lesson is recorded and you learn at your own pace, rewatching as many times as you want."
        },
        {
          q: "How are the courses chosen?",
          a: "We offer a few hand-picked courses, focused on tools and methods you can apply at work tomorrow morning."
        },
        {
          q: "How does support work? What is JilsonAI?",
          a: "JilsonAI is a smart partner trained on our method to help you right away. If it cannot solve your problem, Jilson steps in."
        },
        {
          q: "Is there a certificate? Does it work on LinkedIn?",
          a: "Yes. When you finish a path or a course, you get a valid certificate that you can share directly to your LinkedIn profile."
        },
        {
          q: "How is this different from free videos on YouTube?",
          a: "Here you get a structured path from start to finish, official support, exercises with real data, and a certificate."
        },
        {
          q: "Can I buy a single course?",
          a: "No. We work with a monthly or annual subscription, which gives you full access to the catalog and regular updates."
        },
        {
          q: "How and when am I charged?",
          a: "You can pay R$ 99,90 every month, or R$ 995 once a year on the annual plan."
        },
        {
          q: "How do I cancel? Can I come back later?",
          a: "Cancel with one click in your dashboard, with no fees. When you come back, your history and certificates will be waiting for you."
        },
        {
          q: "Does the subscription cover the courses in Portuguese?",
          a: "Yes, the same subscription gives you access to all the content in both languages."
        },
        {
          q: "Is there a refund?",
          a: "Yes, we offer a 7-day money-back guarantee."
        },
        {
          q: "Can companies subscribe? Do you issue invoices?",
          a: "Yes, we issue an invoice for every payment. For corporate plans or multiple seats, get in touch."
        }
      ]
    },
    cta: {
      title: "Ready to master data, AI and whatever comes next?",
      btn: "Subscribe"
    }
  }
};
