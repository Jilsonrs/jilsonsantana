import { ROTAS_PUBLICAS, type Dict } from "@jilson/core";
import { escapeHtml } from "../lib/html.js";

// O MENU DE CIMA E O RODAPÉ DO SITE — as peças que as páginas públicas do servidor dividem (etapa
// 4.7, passo 6c: a tela pública de assinar leva os dois, decisão do operador de 12/10/2026). A
// marcação é a da home, cortada de `home.ts` sem mudar um caractere (o teste da home e o retrato
// de antes e depois provam). O acabamento visual é do Antigravity.

/** As fontes do site (Google Fonts), como a home as carrega. */
export const FONTES_DO_SITE = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=MuseoModerno:wght@600;700&family=Outfit:wght@500;600;700&display=swap"
    rel="stylesheet">`;

export type SituacaoNoMenu = {
  dict: Dict;
  /** Há sessão válida: "Meus estudos" no lugar de "Entrar". */
  logado: boolean;
  /** Tem assinatura ativa: "Assine" some do menu e do rodapé (decisões do operador, 19/10/2026). */
  assinante: boolean;
};

/**
 * O menu de cima. Os links de seção (Cursos, Trilhas, Assine) levam às seções da HOME: nela, a
 * âncora sozinha (`#cursos`); em outra página, a home com a âncora (`/#cursos`) — o mesmo destino.
 */
export function topoDoSite({ dict, logado, assinante, naHome }: SituacaoNoMenu & { naHome: boolean }): string {
  const prefixo = naHome ? "" : "/";
  return `<nav class="navbar" aria-label="${escapeHtml(dict.common.a11y.mainNav)}">
    <div class="nav-container container">
      <div class="nav-logo" aria-label="Jilson Santana"><img src="/img/Logomarca.png" alt="Jilson Santana"></div>
      <div class="nav-links">
        <a href="${prefixo}#cursos">${escapeHtml(dict.common.nav.cursos)}</a>
        <a href="${prefixo}#trilhas">${escapeHtml(dict.common.nav.trilhas)}</a>
        ${assinante ? "" : `<a href="${prefixo}#assine">${escapeHtml(dict.common.nav.assine)}</a>`}
        ${logado
          ? `<a href="/inicio" class="btn-login">${escapeHtml(dict.common.nav.meusEstudos)}</a>`
          : `<a href="/login" class="btn-login">${escapeHtml(dict.common.nav.entrar)}</a>`}
      </div>
    </div>
  </nav>`;
}

/** O rodapé. */
export function rodapeDoSite({ dict, assinante }: Pick<SituacaoNoMenu, "dict" | "assinante">): string {
  const rotas = ROTAS_PUBLICAS;
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="nav-logo"><img src="/img/Logomarca.png" alt="Jilson Santana"></div>
        <div class="footer-links">
          <a href="${rotas.cursos}">${escapeHtml(dict.common.footer.links[0])}</a>
          <a href="${rotas.trilhas}">${escapeHtml(dict.common.footer.links[1])}</a>
          ${assinante ? "" : `<a href="${rotas.assinar}">${escapeHtml(dict.common.footer.links[2])}</a>`}
          <a href="${rotas.faq}">${escapeHtml(dict.common.footer.links[3])}</a>
          <a href="${rotas.quemSomos}">${escapeHtml(dict.common.footer.links[4])}</a>
          <a href="${rotas.contato}">${escapeHtml(dict.common.footer.links[5])}</a>
          <a href="${rotas.youtube}" target="_blank" rel="noopener noreferrer"
            aria-label="YouTube">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="display: block;">
              <path
                d="M2.5 17a24.12 24.12 0 0 1 0-10 2.41 2.41 0 0 1 2.67-1.77 28.11 28.11 0 0 1 13.66 0 2.41 2.41 0 0 1 2.67 1.77 24.12 24.12 0 0 1 0 10 2.41 2.41 0 0 1-2.67 1.77 28.11 28.11 0 0 1-13.66 0A2.41 2.41 0 0 1 2.5 17" />
              <path d="m10 15 5-3-5-3v6z" />
            </svg>
          </a>
          <a href="${rotas.termos}">${escapeHtml(dict.common.footer.links[6])}</a>
          <a href="${rotas.privacidade}">${escapeHtml(dict.common.footer.links[7])}</a>
        </div>
      </div>
      <div class="footer-bottom">
        <div>${escapeHtml(dict.common.footer.tagline)}</div>
        <div>${escapeHtml(dict.common.footer.copyright)}</div>
      </div>
    </div>
  </footer>`;
}
