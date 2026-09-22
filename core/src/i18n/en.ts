import type { Dict } from "./pt.js";

// Inglês internacional, simples e direto — a voz do LinkedIn Learning, não a de
// uma agência. As regras (registro, o que evitar, o que nunca se traduz) estão
// em docs/idiomas.md → "Como o inglês é escrito". Se uma frase aqui precisar de
// contexto brasileiro para fazer sentido, ela está errada.
export const en: Dict = {
  a11y: {
    mainNav: "Main navigation",
    hero: "Main highlight",
    catalog: "Course catalog",
    courseBadges: "Course attributes",
    chatAvatar: "Jilson avatar"
  },
  nav: {
    cursos: "Courses",
    trilhas: "Learning paths",
    assine: "Pricing",
    entrar: "Sign in"
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
    subtitle: "AI is redefining the world of work. More than certificates, the market asks for skills you can prove. Explore a living catalog focused on Data, Automation and applied AI, built for the real problems companies face today.",
    accessCourse: "View course",
    viewAll: "See all courses"
  },
  target: {
    titlePrefix: "AI rewrote the rules.<br>Become the professional who",
    titleEmphasis: "sets the pace",
    titleSuffix: ".",
    subtitle: "Build the Data and AI skills companies are looking for.",
    steps: [
      {
        num: "01",
        title: "Start where you are",
        desc: "From zero or with experience, there is always a next step."
      },
      {
        num: "02",
        title: "Straight to the point",
        desc: "Learn the techniques and tools that make an immediate difference in your work, with no time wasted."
      },
      {
        num: "03",
        title: "Lifelong learning",
        desc: "Keep up to date so you stay relevant and can lead the change in your projects or your business."
      }
    ]
  },
  trilhas: {
    title: "Guided or skill-based learning paths, all the way to the certificate.",
    subtitle: "Pick a goal, follow a ready-made path, or build your own.",
    features: [
      {
        title: "Ready-made paths",
        desc: "A defined route that fits your career."
      },
      {
        title: "Build your own",
        desc: "Take a ready-made path and shape it your way."
      },
      {
        title: "JilsonAI",
        desc: "Not sure where to start? Tell it where you want to get to and it shows you the path."
      },
      {
        title: "Certificate",
        desc: "One certificate for each path you finish, listing the skills you built."
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
    subtitle: "Trained on my method. It thinks alongside you, explains the reasoning, and tells you what it is assuming. And when it cannot solve it, I step in.",
    features: [
      {
        label: "Thinks with you:",
        text: "it knows the course you are taking and asks when it needs to understand more."
      },
      {
        label: "Explains the why:",
        text: "it does not just hand you the answer."
      },
      {
        label: "Never leaves you stuck:",
        text: "when it cannot solve it, it calls Jilson."
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
    quote: "\"I'll guide you until you feel confident with data, AI and whatever comes next. If you are after practical skills you can apply in the real world without wasting time, you are in the right place.\"",
    stats: [
      { value: "107K+", label: "Students worldwide" },
      { value: "70+", label: "Countries" },
      { value: "4,150+", label: "Corporate learners" }
    ]
  },
  testimonials: {
    tag: "SUCCESS STORIES",
    title: "What people who learned with me are saying.",
    list: [
      {
        text: "This instructor is far beyond any expectation! A fully hands-on course, with things you can apply right away. In my 30 years of teaching, I have never seen such sharp instruction.",
        initials: "EF",
        name: "Edson Garcia Fernandes"
      },
      {
        text: "The instructor explains very well, step by step, so even someone who has never opened the program understands everything. I knew very little, almost nothing, and now I even understand a bit of programming!",
        initials: "NM",
        name: "Nicole Silveira Manoel"
      },
      {
        text: "Incredible! I have just finished this course and I am speechless. As an educator, I like to learn by doing, so I found the whole plan perfect. Thank you so much, teacher.",
        initials: "BV",
        name: "Beatriz Veloso"
      },
      {
        text: "It made a real difference in my day-to-day work. It also helped my team perform better, because every week I passed on what I had learned. That way we grew together.",
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
    discountBadge: "17% OFF ON THE ANNUAL PLAN",
    // ATENÇÃO: hoje a página em inglês mostra o preço em real, porque o template
    // usa `pricePt` nos dois idiomas. `priceEn`/`priceEnAnnual` existem e NÃO são
    // usados. Trocar isso é a decisão "preço mostrado × preço cobrado" da Fase 4
    // (docs/billing.md) — não é tradução.
    pricePt: "R$ 99,90",
    pricePtAnnual: "R$ 995",
    priceEn: "US$ 30",
    priceEnAnnual: "US$ 299",
    period: "/month",
    desc: "Billed every month. Cancel anytime.",
    btn: "Subscribe",
    features: [
      "Access to every course and learning path",
      "Certificate of completion",
      "Support from JilsonAI + Jilson",
      "Content kept up to date with the latest changes",
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
        a: "A few courses, hand-picked, focused on the tools and methods you can apply at work tomorrow morning."
      },
      {
        q: "How does support work? What is JilsonAI?",
        a: "JilsonAI is a smart partner trained on our method to help you right away. If it cannot solve your problem, Jilson steps in."
      },
      {
        q: "Is there a certificate? Does it work on LinkedIn?",
        a: "Yes. When you finish a path or a course, you get a valid certificate you can share straight to your LinkedIn profile."
      },
      {
        q: "How is this different from free videos on YouTube?",
        a: "Here you get a structured path with a beginning, a middle and an end, official support, exercises with real data, and a certificate."
      },
      {
        q: "Can I buy a single course?",
        a: "No. The model is a subscription, monthly or annual, which gives you the whole catalog and constant updates."
      },
      {
        q: "How and when am I charged?",
        a: "You can pay R$ 99,90 every month, or R$ 995 once a year on the annual plan."
      },
      {
        q: "How do I cancel? Can I come back later?",
        a: "Cancel with one click in your student dashboard, with no fee. Whenever you come back, your history and your certificates are waiting for you."
      },
      {
        q: "Does the subscription cover the courses in Portuguese?",
        a: "Yes, the same subscription gives you access to all the content in both languages."
      },
      {
        q: "Is there a refund?",
        a: "Yes, you have a legal right to change your mind."
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
};
