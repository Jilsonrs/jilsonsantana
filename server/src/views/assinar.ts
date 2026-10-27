import { ROTAS_PUBLICAS, type Dict } from "@jilson/core";
import { escapeHtml } from "../lib/html.js";
import { FONTES_DO_SITE, rodapeDoSite, topoDoSite } from "./partes-do-site.js";

// A TELA PÚBLICA DE ASSINAR (etapa 4.7, passo 6c — billing.md → *A tela pública de assinar*): o
// menu de cima e o rodapé do site, e o formulário no meio (decisão do operador, 12/10/2026: "o
// check out entra no content"). O formulário é o app (o campo do cartão da Stripe é React), montado
// em `#root`; o resto é desta página. Só o VISITANTE a vê: quem está logado vai para a tela de
// assinar do app (`routes/assinar.ts`). Todo texto sai do dicionário; todo valor, por `escapeHtml`.
// O acabamento visual é do Antigravity.

export interface AssinarView {
  dict: Dict;
  baseUrl: string;
  /** As etiquetas do app (`lib/etiquetas-do-app.ts`) — o nosso próprio `index.html`, nunca dado de fora. */
  etiquetasDoApp: string;
}

export function renderAssinar({ dict, baseUrl, etiquetasDoApp }: AssinarView): string {
  const t = dict.app.assinar;
  const titulo = `${t.titulo} | Jilson Santana`;
  const endereco = `${baseUrl}${ROTAS_PUBLICAS.assinar}`;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titulo)}</title>
  <meta name="description" content="${escapeHtml(t.descricao)}">
  <link rel="canonical" href="${escapeHtml(endereco)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Jilson Santana">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="${escapeHtml(titulo)}">
  <meta property="og:description" content="${escapeHtml(t.descricao)}">
  <meta property="og:url" content="${escapeHtml(endereco)}">
  <meta property="og:image" content="${escapeHtml(baseUrl)}/img/og-home.jpg">
  <meta name="twitter:card" content="summary_large_image">
  ${etiquetasDoApp}
  <link rel="stylesheet" href="/css/public.css">
  ${FONTES_DO_SITE}
</head>
<body data-pagina-do-servidor="assinar">
  ${topoDoSite({ dict, logado: false, assinante: false, naHome: false })}

  <main id="conteudo-principal">
    <section class="section container">
      <div class="section-header">
        <h1>${escapeHtml(t.titulo)}</h1>
        <p>${escapeHtml(t.descricao)}</p>
      </div>
      <div id="root"></div>
    </section>
  </main>

  ${rodapeDoSite({ dict, assinante: false })}
</body>
</html>`;
}
