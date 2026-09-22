import { escapeHtml, jsonLd } from "../lib/html.js";
import type { Dict } from "@jilson/core";

export interface HomeCourse {
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  camadas?: string[];
}

/**
 * Home pública renderizada no servidor (sem React).
 * O HTML é o mock aprovado (design-lab/home-lab.html), transposto mecanicamente:
 * mesma marcação, mesmas classes. Só o que é dado sai daqui — textos vêm do
 * dicionário (@jilson/core) e cursos vêm do banco.
 * TRAVA: todo valor de fora passa por escapeHtml().
 */
/** Escapa tudo, menos a quebra de linha intencional que vem do dicionário. */
const allowBr = (s: string): string => escapeHtml(s).replace(/&lt;br\s*\/?&gt;/g, "<br>");

export function renderHome(
  dict: Dict,
  lang: "pt" | "en",
  courses: HomeCourse[],
  featuredCourse: HomeCourse | null,
  canSubscribe: boolean,
  baseUrl: string,
): string {
  const isPt = lang === "pt";
  const currentUrl = isPt ? baseUrl : `${baseUrl}/en`;
  const alternateUrl = isPt ? `${baseUrl}/en` : baseUrl;
  const title = `${dict.hero.titlePrefix} ${dict.hero.titleEmphasis} ${dict.hero.titleSuffix}`;

  // Seletor PT | EN: dois links, um por endereço — sem cookie e sem negociação
  // por cabeçalho ("UM ENDEREÇO POR IDIOMA", CLAUDE.md → Idiomas). O idioma
  // atual leva `aria-current`; o outro fica em cinza, como no mock. Aparece no
  // topo e no rodapé, por isso é função: só a indentação muda.
  const seletorIdioma = (recuo: string) => `<div style="display: flex; gap: 16px; align-items: center;">
${recuo}  <a href="/"${isPt ? ' aria-current="page"' : ' style="color: var(--text-muted);"'}>PT</a>
${recuo}  <a href="/en"${isPt ? ' style="color: var(--text-muted);"' : ' aria-current="page"'}>EN</a>
${recuo}</div>`;

  return `<!DOCTYPE html>
<html lang="${isPt ? "pt-BR" : "en"}">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Jilson Santana</title>
  <meta name="description" content="${escapeHtml(dict.hero.subtitle)}">
  <link rel="canonical" href="${escapeHtml(currentUrl)}">
  <link rel="alternate" hreflang="${isPt ? "en" : "pt-BR"}" href="${escapeHtml(alternateUrl)}">
  <link rel="alternate" hreflang="${isPt ? "pt-BR" : "en"}" href="${escapeHtml(currentUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(baseUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Jilson Santana">
  <meta property="og:locale" content="${isPt ? "pt_BR" : "en_US"}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(dict.hero.subtitle)}">
  <meta property="og:url" content="${escapeHtml(currentUrl)}">
  <meta property="og:image" content="${escapeHtml(baseUrl)}/img/og-home.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/css/public.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=MuseoModerno:wght@600;700&family=Outfit:wght@500;600;700&display=swap"
    rel="stylesheet">
  <script type="application/ld+json">${jsonLd({
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Jilson Santana",
    url: currentUrl,
    description: dict.hero.subtitle,
  })}</script>
</head>
<body>
<!-- 0. Header / Nav -->
  <nav class="navbar" aria-label="${escapeHtml(dict.a11y.mainNav)}">
    <div class="nav-container container">
      <div class="nav-logo" aria-label="Jilson Santana"><span>#</span>Jilson Santana</div>
      <div class="nav-links">
        <a href="#cursos">${escapeHtml(dict.nav.cursos)}</a>
        <a href="#trilhas">${escapeHtml(dict.nav.trilhas)}</a>
        <a href="#assine">${escapeHtml(dict.nav.assine)}</a>
        <a href="#" class="btn-login">${escapeHtml(dict.nav.entrar)}</a>
        <span style="color: var(--border-color);">|</span>
        ${seletorIdioma("        ")}
      </div>
    </div>
  </nav>

  <main id="conteudo-principal">

    <!-- 1. Hero (inclui o curso em destaque) -->
    <section class="hero container" aria-label="${escapeHtml(dict.a11y.hero)}">
      <h1>${escapeHtml(dict.hero.titlePrefix)} <span class="emphasis">${escapeHtml(dict.hero.titleEmphasis)}</span> ${escapeHtml(dict.hero.titleSuffix)}</h1>
      <p>${escapeHtml(dict.hero.subtitle)}</p>

      <!-- Curso em destaque -->
      ${featuredCourse ? ((f) => `<div class="apple-card horizontal reveal-on-scroll" style="margin-top: 80px; margin-bottom: 0;">
        <div class="apple-card-content">
          <span class="tag tag-blue" style="margin-bottom: 16px;">${escapeHtml(dict.hero.featuredBadge)}</span>
          <div class="course-badges" aria-label="${escapeHtml(dict.a11y.courseBadges)}">
            <div class="badge-icon" title="Fundamentos Sólidos">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div class="badge-icon" title="Recursos Modernos">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div class="badge-icon" title="Com IA do seu lado" style="color: var(--brand-blue);">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2">
                <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
              </svg>
            </div>
          </div>
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.subtitle ?? "")}</p>
          <a href="/curso/${escapeHtml(f.slug)}" aria-label="${escapeHtml(f.title)}"
            style="color: var(--brand-blue); text-decoration: none; font-weight: 500; font-size: 1.1rem; display: inline-flex; align-items: center; gap: 4px; margin-top: 16px; transition: opacity 0.2s;"
            onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">${escapeHtml(dict.hero.accessCourse)}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        </div>
        <div class="card-img-container">
          <a href="/curso/${escapeHtml(f.slug)}" aria-label="${escapeHtml(f.title)}">
            <img src="${escapeHtml(f.thumbnailUrl ?? "")}" alt="${escapeHtml(f.title)}"
              style="width: 650px; height: 400px; object-fit: cover; border-radius: 0; box-shadow: -10px 10px 40px rgba(0,0,0,0.15); transition: transform 0.3s;"
              onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          </a>
        </div>
      </div>
    `)(featuredCourse) : ""}</section>

    <!-- 2. ${escapeHtml(dict.nav.cursos)} -->
    <section id="cursos" class="section container" aria-label="${escapeHtml(dict.a11y.catalog)}">
      <div class="section-header reveal-on-scroll">
        <h2>${escapeHtml(dict.catalog.titlePrefix)} <span style="color: var(--brand-blue);">${escapeHtml(dict.catalog.titleEmphasis)}</span> ${escapeHtml(dict.catalog.titleSuffix)}</h2>
        <p>${escapeHtml(dict.catalog.subtitle)}</p>
      </div>

      <div class="apple-grid">
        <!-- 4 Colunas Lado a Lado -->
        <div class="apple-grid-4">
${courses.map((c) => `
          <div class="course-card reveal-on-scroll">
            <a href="/curso/${escapeHtml(c.slug)}"
              aria-label="${escapeHtml(c.title)}">
              <img src="${escapeHtml(c.thumbnailUrl ?? "")}"
                alt="${escapeHtml(c.title)}" class="course-card-img"
                style="transition: opacity 0.3s;" onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'">
            </a>
            <div class="course-card-content">
              <div class="course-badges" aria-label="${escapeHtml(dict.a11y.courseBadges)}">
                <div class="badge-icon" title="Fundamentos Sólidos"><svg aria-hidden="true" width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg></div>
                <div class="badge-icon" title="Recursos Modernos"><svg aria-hidden="true" width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg></div>
                <div class="badge-icon" title="Com IA do seu lado" style="color: var(--brand-blue);"><svg
                    aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2">
                    <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
                  </svg></div>
              </div>
              <h3>${escapeHtml(c.title)}</h3>
              <p>${escapeHtml(c.subtitle ?? "")}</p>
              <a href="/curso/${escapeHtml(c.slug)}" aria-label="${escapeHtml(dict.catalog.accessCourse)} ${escapeHtml(c.title)}"
                style="color: var(--brand-blue); text-decoration: none; font-weight: 500; font-size: 1.05rem; display: inline-flex; align-items: center; gap: 4px; margin-top: 16px; transition: opacity 0.2s;"
                onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">${escapeHtml(dict.catalog.accessCourse)}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            </div>
          </div>`).join("")}
        </div>
<!-- Link Ver Todos -->
        <div style="text-align: center; margin-top: 48px;" class="reveal-on-scroll">
          <a href="#" class="btn"
            style="background-color: #0071e3; font-size: 1.15rem; padding: 14px 32px; text-decoration: none;">${escapeHtml(dict.catalog.viewAll)}</a>
        </div>
      </div>
    </section>

    <!-- 3. Para Quem É -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header reveal-on-scroll">
          <h2>${allowBr(dict.target.titlePrefix)} <span class="emphasis">${escapeHtml(dict.target.titleEmphasis)}</span>${escapeHtml(dict.target.titleSuffix)}</h2>
          <p>${escapeHtml(dict.target.subtitle)}</p>
        </div>

        <div class="steps-container reveal-on-scroll">
          <div class="step-card">
            <div style="margin-bottom: 24px; color: var(--brand-blue);">
              <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.5">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <h3 style="display: flex; align-items: baseline; gap: 8px;">
              <span class="step-num" style="margin-bottom: 0; font-size: 1.5rem; color: var(--text-muted);">${escapeHtml(dict.target.steps[0].num)}</span>
              ${escapeHtml(dict.target.steps[0].title)}
            </h3>
            <p>${escapeHtml(dict.target.steps[0].desc)}</p>
          </div>
          <div class="step-card">
            <div style="margin-bottom: 24px; color: var(--brand-blue);">
              <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h3 style="display: flex; align-items: baseline; gap: 8px;">
              <span class="step-num" style="margin-bottom: 0; font-size: 1.5rem; color: var(--text-muted);">${escapeHtml(dict.target.steps[1].num)}</span>
              ${escapeHtml(dict.target.steps[1].title)}
            </h3>
            <p>${escapeHtml(dict.target.steps[1].desc)}
            </p>
          </div>
          <div class="step-card">
            <div style="margin-bottom: 24px; color: var(--brand-blue);">
              <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.5">
                <path
                  d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
              </svg>
            </div>
            <h3 style="display: flex; align-items: baseline; gap: 8px;">
              <span class="step-num" style="margin-bottom: 0; font-size: 1.5rem; color: var(--text-muted);">${escapeHtml(dict.target.steps[2].num)}</span>
              ${escapeHtml(dict.target.steps[2].title)}
            </h3>
            <p>${escapeHtml(dict.target.steps[2].desc)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. ${escapeHtml(dict.nav.trilhas)} -->
    <section id="trilhas" class="section container">
      <!-- Row 1: Text Left (DOM Order), Image Right (DOM Order) -->
      <div class="reveal-on-scroll"
        style="display: flex; flex-direction: column; gap: 40px; max-width: 1270px; margin: 0 auto;">

        <!-- Top Row: Art Left, Text Right -->
        <div class="trilhas-top-grid">

          <!-- Left Side: UI Mockup (LinkedIn Style Timeline) -->
          <div
            style="width: 100%; display: flex; align-items: center; justify-content: center; background: #F8FAFC; border-radius: 24px; padding: 40px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03); position: relative; min-height: 330px;">

            <div style="display: flex; flex-direction: column; width: 100%; max-width: 400px; position: relative;">
              <!-- The Vertical Line -->
              <div
                style="position: absolute; left: 15px; top: 15px; bottom: 30px; width: 2px; background: #E2E8F0; z-index: 1;">
              </div>

              <!-- Timeline Item 1 -->
              <div style="display: flex; gap: 24px; margin-bottom: 24px; position: relative; z-index: 2;">
                <!-- Node -->
                <div
                  style="width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; border: 2px solid var(--brand-blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--brand-blue);"></div>
                </div>
                <!-- Card -->
                <div
                  style="background: #FFFFFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 16px; flex-grow: 1; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                  <div
                    style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--brand-gray); margin-bottom: 4px;">
                    ${escapeHtml(dict.trilhas.mockUi.course1)}</div>
                  <h4
                    style="font-family: 'Outfit', sans-serif; font-size: 1rem; margin: 0 0 8px 0; color: var(--brand-black);">
                    ${escapeHtml(dict.trilhas.mockUi.course1Title)}</h4>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="height: 4px; background: #E2E8F0; border-radius: 2px; flex-grow: 1;">
                      <div style="width: 100%; height: 100%; background: #10B981; border-radius: 2px;"></div>
                    </div>
                    <span
                      style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #10B981; font-weight: bold;">${escapeHtml(dict.trilhas.mockUi.completed)}</span>
                  </div>
                </div>
              </div>

              <!-- Timeline Item 2 -->
              <div style="display: flex; gap: 24px; margin-bottom: 24px; position: relative; z-index: 2;">
                <!-- Node -->
                <div
                  style="width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; border: 2px solid var(--brand-blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(35, 143, 232, 0.1);">
                  <div style="width: 14px; height: 14px; border-radius: 50%; background: var(--brand-blue);"></div>
                </div>
                <!-- Card -->
                <div
                  style="background: #FFFFFF; border: 1px solid var(--brand-blue); border-radius: 12px; padding: 16px; flex-grow: 1; box-shadow: 0 8px 24px rgba(35, 143, 232, 0.12);">
                  <div
                    style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--brand-blue); margin-bottom: 4px; font-weight: 700;">
                    ${escapeHtml(dict.trilhas.mockUi.course2)}</div>
                  <h4
                    style="font-family: 'Outfit', sans-serif; font-size: 1rem; margin: 0 0 8px 0; color: var(--brand-black);">
                    ${escapeHtml(dict.trilhas.mockUi.course2Title)}</h4>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="height: 4px; background: #E2E8F0; border-radius: 2px; flex-grow: 1;">
                      <div style="width: 30%; height: 100%; background: var(--brand-blue); border-radius: 2px;"></div>
                    </div>
                    <span
                      style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--brand-gray);">${escapeHtml(dict.trilhas.mockUi.remaining)}</span>
                  </div>
                </div>
              </div>

              <!-- Timeline Item 3 (Certificate) -->
              <div style="display: flex; gap: 24px; position: relative; z-index: 2;">
                <!-- Node -->
                <div
                  style="width: 32px; height: 32px; border-radius: 50%; background: #FFFFFF; border: 2px solid #E2E8F0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                  </svg>
                </div>
                <!-- Card -->
                <div style="background: transparent; padding: 6px 16px; flex-grow: 1; opacity: 0.6;">
                  <h4
                    style="font-family: 'Outfit', sans-serif; font-size: 1rem; margin: 0 0 4px 0; color: var(--brand-black);">
                    ${escapeHtml(dict.trilhas.mockUi.certificateTitle)}</h4>
                  <div style="font-family: 'Hanken Grotesk', sans-serif; font-size: 0.85rem; color: var(--brand-gray);">
                    ${escapeHtml(dict.trilhas.mockUi.certificateDesc)}</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Right Side: Text -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <h2 style="font-size: 2.5rem; margin: 0; letter-spacing: -0.02em; line-height: 1.15;">${escapeHtml(dict.trilhas.title)}</h2>
            <p style="color: var(--text-muted); font-size: 1.1rem; line-height: 1.6; margin: 0;">${escapeHtml(dict.trilhas.subtitle)}</p>
          </div>

        </div>

        <!-- Bottom Row: 4 Points (4 Columns) -->
        <div class="trilhas-bottom-grid">

          <!-- Item 1 -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="color: var(--brand-blue); flex-shrink: 0; display: flex;">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
                  <line x1="9" y1="3" x2="9" y2="18"></line>
                  <line x1="15" y1="6" x2="15" y2="21"></line>
                </svg>
              </div>
              <h4 style="font-size: 1.2rem; margin: 0;">${escapeHtml(dict.trilhas.features[0].title)}</h4>
            </div>
            <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5; margin: 0;">${escapeHtml(dict.trilhas.features[0].desc)}</p>
          </div>

          <!-- Item 2 -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="color: var(--brand-blue); flex-shrink: 0; display: flex;">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </div>
              <h4 style="font-size: 1.2rem; margin: 0;">${escapeHtml(dict.trilhas.features[1].title)}</h4>
            </div>
            <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5; margin: 0;">${escapeHtml(dict.trilhas.features[1].desc)}</p>
          </div>

          <!-- Item 3 -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; min-height: 28px;">
              <img src="/img/JilsonAI.png" alt="${escapeHtml(dict.trilhas.features[2].title)}" style="height: 22px; width: auto; object-fit: contain;">
            </div>
            <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5; margin: 0;">${escapeHtml(dict.trilhas.features[2].desc)}</p>
          </div>

          <!-- Item 4 -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="color: var(--brand-blue); flex-shrink: 0; display: flex;">
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h4 style="font-size: 1.2rem; margin: 0;">${escapeHtml(dict.trilhas.features[3].title)}</h4>
            </div>
            <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.5; margin: 0;">${escapeHtml(dict.trilhas.features[3].desc)}</p>
          </div>

        </div>

        <div style="display: flex; justify-content: center; margin-top: 16px;">
          <button ${canSubscribe ? "" : "disabled"} class="btn"
            style="padding: 14px 32px; font-size: 1.05rem; border-radius: 40px; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);">${escapeHtml(dict.trilhas.viewAll)}</button>
        </div>
      </div>
    </section>

    <!-- 5. ${escapeHtml(dict.trilhas.features[2].title)} -->
    <section class="section container" style="padding-top: 0;">
      <div class="ai-container reveal-on-scroll">
        <div class="ai-bg-glow"></div>
        <div class="ai-content">
          <div
            style="font-family: var(--font-mono); font-weight: bold; font-size: 1.6rem; margin-bottom: 24px; letter-spacing: 0.05em;">
            <span style="color: #fff;">Jilson</span><span style="color: var(--brand-blue);">AI</span>
          </div>
          <h2 style="font-size: clamp(2.5rem, 4vw, 3rem);">${allowBr(dict.ai.titlePrefix)} <span
              class="emphasis">${escapeHtml(dict.ai.titleEmphasis)}</span>${escapeHtml(dict.ai.titleSuffix)}</h2>
          <p style="font-size: 1rem; margin-bottom: 40px; max-width: 600px;">${escapeHtml(dict.ai.subtitle)}</p>

          <ul class="ai-features-list">
${dict.ai.features.map((f) => `            <li>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <div style="font-size: 0.95rem; color: #E4E4E7;"><strong>${escapeHtml(f.label)}</strong> ${escapeHtml(f.text)}</div>
            </li>`).join("\n")}
          </ul>
        </div>
        <div class="ai-visual">
          <!-- O Widget Interativo "${escapeHtml(dict.trilhas.features[2].title)}" -->
          <div class="ai-glass-panel chat-panel">

            <!-- Chat Header -->
            <div class="chat-header">
              <img src="/img/Jilson-Santana.png" alt="${escapeHtml(dict.a11y.chatAvatar)}"
                style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; object-position: center 2px; background: #fff; border: 1px solid rgba(35, 143, 232, 0.4); box-shadow: 0 0 12px rgba(35, 143, 232, 0.3);">
              <div class="chat-header-info">
                <h4>JilsonAI</h4>
                <span>${escapeHtml(dict.ai.chatMock.status)}</span>
              </div>
            </div>

            <!-- Chat Messages -->
            <div class="chat-messages" id="ai-chat-messages">
              <div class="chat-bubble user">
                ${escapeHtml(dict.ai.chatMock.userMsg)}
              </div>

              <div class="chat-bubble ai">
                ${escapeHtml(dict.ai.chatMock.aiMsg)}
              </div>

              <!-- Typing Indicator (simulando que está pensando no próximo passo) -->
              <div class="chat-bubble ai" style="width: fit-content; padding: 12px;">
                <div class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>

            <!-- Chat Footer -->
            <div class="chat-footer">
              <div class="chat-input-mock">
                <span>${escapeHtml(dict.ai.chatMock.placeholder)}</span>
                <div class="chat-send-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- 6. Barra de Autoridade -->
    <section class="section section-alt">
      <div class="container author-section">
        <div class="author-img-box">
          <img src="/img/Jilson-Santana.png" alt="Jilson Santana" onerror="this.style.opacity='0'">
        </div>
        <div class="author-content">
          <h2>${escapeHtml(dict.author.titlePrefix)} <span class="emphasis">${escapeHtml(dict.author.titleEmphasis)}</span>${escapeHtml(dict.author.titleSuffix)}</h2>
          <p>${escapeHtml(dict.author.subtitle)}</p>

          <div class="author-credentials">
            <span>${escapeHtml(dict.author.credentials[0])}</span>
            <span>${escapeHtml(dict.author.credentials[1])}</span>
          </div>

          <p
            style="font-size: 1.15rem; color: var(--text-main); font-weight: 500; line-height: 1.6; margin-bottom: 32px; font-style: italic;">
            ${escapeHtml(dict.author.quote)}</p>

          <div class="stat-row">
            <div class="stat-item">
              <strong>${escapeHtml(dict.author.stats[0].value)}</strong>
              <span>${escapeHtml(dict.author.stats[0].label)}</span>
            </div>
            <div class="stat-item">
              <strong>${escapeHtml(dict.author.stats[1].value)}</strong>
              <span>${escapeHtml(dict.author.stats[1].label)}</span>
            </div>
            <div class="stat-item">
              <strong>${escapeHtml(dict.author.stats[2].value)}</strong>
              <span>${escapeHtml(dict.author.stats[2].label)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 7. Prova Social -->
    <section class="section container">
      <div class="section-header">
        <span class="tag tag-box" style="margin-bottom: 16px;">${escapeHtml(dict.testimonials.tag)}</span>
        <h2>${escapeHtml(dict.testimonials.title)}</h2>
      </div>

      <div class="testimonials-grid">
${dict.testimonials.list.map((t) => `        <div class="test-card">
          <p>${escapeHtml(t.text)}</p>
          <div class="test-author-box">
            <div class="test-avatar"
              style="background: #E8F1FB; color: var(--brand-blue); font-weight: 700; font-size: 0.95rem;"
              aria-hidden="true">${escapeHtml(t.initials)}</div>
            <div class="test-author">
              <h4>${escapeHtml(t.name)}</h4>
            </div>
          </div>
        </div>`).join("\n")}
      </div>
    </section>

    <!-- 8. ${escapeHtml(dict.nav.assine)} -->
    <section id="assine" class="section section-alt">
      <div class="container">
        <div class="section-header">
          <h2>${escapeHtml(dict.pricing.titlePrefix)} <span class="emphasis">${escapeHtml(dict.pricing.titleEmphasis)}</span>${escapeHtml(dict.pricing.titleSuffix)}</h2>
        </div>

        <div class="pricing-grid" style="grid-template-columns: 1fr; max-width: 460px;">
          <!-- ${escapeHtml(dict.pricing.monthlyTitle)} -->
          <div class="price-card featured" style="padding-top: 48px;">
            <h3>${escapeHtml(dict.pricing.monthlyTitle)}</h3>

            <div
              style="background-color: #ECFDF5; color: #059669; border-radius: 8px; padding: 8px 16px; margin: 16px auto 24px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-mono); font-weight: 600; font-size: clamp(0.6rem, 3vw, 0.75rem); letter-spacing: 0.05em; white-space: nowrap;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              ${escapeHtml(dict.pricing.discountBadge)}
            </div>

            <div class="price-value">${escapeHtml(dict.pricing.pricePt)}<span style="font-size: 1rem;">${escapeHtml(dict.pricing.period)}</span></div>
            <p class="price-desc">${escapeHtml(dict.pricing.desc)}</p>
            <button ${canSubscribe ? "" : "disabled"} class="btn" style="width: 100%;">${escapeHtml(dict.pricing.btn)}</button>

            <ul class="price-list">
              <li>${escapeHtml(dict.pricing.features[0])}</li>
              <li>${escapeHtml(dict.pricing.features[1])}</li>
              <li>${escapeHtml(dict.pricing.features[2])}</li>
              <li>${escapeHtml(dict.pricing.features[3])}</li>
              <li>${escapeHtml(dict.pricing.features[4])}</li>
            </ul>
          </div>
        </div>

        <p style="text-align: center; color: var(--text-muted); margin-top: 48px; font-size: 1.1rem;">${escapeHtml(dict.pricing.footer)}</p>
      </div>
    </section>

    <!-- 9. FAQ -->
    <section id="faq" class="section container">
      <div class="section-header">
        <h2>${escapeHtml(dict.faq.title)}</h2>
      </div>

      <div class="faq-list">
${dict.faq.list.map((item) => `        <details>
          <summary>${escapeHtml(item.q)}</summary>
          <p>${escapeHtml(item.a)}</p>
        </details>`).join("\n")}
      </div>
    </section>

    <!-- Chamada final -->
    <section class="section container" style="text-align: center; padding-top: 0;">
      <h2 style="font-size: clamp(2.5rem, 4vw, 3.5rem); margin: 0 auto 48px; max-width: 800px; line-height: 1.1;">${escapeHtml(dict.cta.title)}</h2>
      <button ${canSubscribe ? "" : "disabled"} class="btn" style="padding: 24px 64px; font-size: 1.35rem;">${escapeHtml(dict.cta.btn)}</button>
    </section>

    <!-- Footer -->
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="nav-logo"><span>#</span>Jilson Santana</div>
        <div class="footer-links">
          <a href="#">${escapeHtml(dict.footer.links[0])}</a>
          <a href="#">${escapeHtml(dict.footer.links[1])}</a>
          <a href="#">${escapeHtml(dict.footer.links[2])}</a>
          <a href="#">${escapeHtml(dict.footer.links[3])}</a>
          <a href="#">${escapeHtml(dict.footer.links[4])}</a>
          <a href="#">${escapeHtml(dict.footer.links[5])}</a>
          <a href="https://www.youtube.com/@JilsonSantanaBI/" target="_blank" rel="noopener noreferrer"
            aria-label="YouTube">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="display: block;">
              <path
                d="M2.5 17a24.12 24.12 0 0 1 0-10 2.41 2.41 0 0 1 2.67-1.77 28.11 28.11 0 0 1 13.66 0 2.41 2.41 0 0 1 2.67 1.77 24.12 24.12 0 0 1 0 10 2.41 2.41 0 0 1-2.67 1.77 28.11 28.11 0 0 1-13.66 0A2.41 2.41 0 0 1 2.5 17" />
              <path d="m10 15 5-3-5-3v6z" />
            </svg>
          </a>
          <a href="#">${escapeHtml(dict.footer.links[6])}</a>
          <a href="#">${escapeHtml(dict.footer.links[7])}</a>
          <span style="color: var(--border-color);">|</span>
          ${seletorIdioma("          ")}
        </div>
      </div>
      <div class="footer-bottom">
        <div>${escapeHtml(dict.footer.tagline)}</div>
        <div>${escapeHtml(dict.footer.copyright)}</div>
      </div>
    </div>
  </footer>

  <script>
    // IntersectionObserver para todos os browsers (garante que anima apenas 1 vez e não reverte)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target); // Anima apenas 1 vez
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
  </script>
</body>
</html>`;
}
