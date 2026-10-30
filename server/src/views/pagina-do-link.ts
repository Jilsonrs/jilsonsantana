import { EMAIL_DE_SUPORTE, type Dict } from "@jilson/core";
import { escapeHtml } from "../lib/html.js";
import type { TipoDeLink } from "../lib/links-do-email.js";
import { FONTES_DO_SITE, rodapeDoSite, topoDoSite } from "./partes-do-site.js";

// AS PÁGINAS DOS LINKS DO E-MAIL (etapa 4.7, passo 9 — decisões do operador, 29/10/2026): "Quero receber novidades"
// (o botão do lembrete de quem não terminou de assinar) e "Descadastrar" (todo e-mail a um lead). Páginas do servidor,
// como a `/assinar`: o menu e o rodapé do site, e no meio o texto e UM botão (um formulário que envia o pedido) — abrir o
// link não faz nada sozinho: os programas de segurança de e-mail abrem os links por conta própria. Fora do Google
// (`noindex`). Todo texto sai do dicionário (`app.linksDoEmail`, fora de Admin → Textos, como os do e-mail) e todo valor
// passa por `escapeHtml`. O acabamento visual é do Antigravity.

export type PaginaDoLink =
  /** A pergunta, com o botão: `email`, o da ficha ou do lead; `acao`, o caminho do próprio link (nunca o endereço pedido). */
  | { tipo: TipoDeLink; estado: "pedir"; email: string; acao: string }
  | { tipo: TipoDeLink; estado: "pronto" }
  /** O link adulterado, de outro tipo, vencido (a ficha apagada aos 7 dias) ou recusado (outro site). */
  | { tipo: TipoDeLink; estado: "nao-vale" };

export function renderPaginaDoLink(dict: Dict, pagina: PaginaDoLink): string {
  const t = dict.app.linksDoEmail;
  const novidades = pagina.tipo === "novidades";
  const titulo = `${novidades ? t.tituloNovidades : t.tituloDescadastrar} | Jilson Santana`;
  let corpo: string;
  if (pagina.estado === "pedir") {
    const [pergunta, texto, botao] = novidades ? [t.novidadesTitulo, t.novidadesTexto, t.novidadesBotao] : [t.descadastrarTitulo, t.descadastrarTexto, t.descadastrarBotao];
    corpo = `<h1>${escapeHtml(pergunta)}</h1>
        <p>${escapeHtml(texto.replace("{email}", pagina.email))}</p>
        <form method="post" action="${escapeHtml(pagina.acao)}">
          <button type="submit" class="btn">${escapeHtml(botao)}</button>
        </form>`;
  } else if (pagina.estado === "pronto") {
    corpo = `<h1>${escapeHtml(t.pronto)}</h1>
        <p>${escapeHtml(novidades ? t.novidadesPronto : t.descadastrarPronto)}</p>`;
  } else {
    corpo = `<h1>${escapeHtml(t.naoValeTitulo)}</h1>
        <p>${escapeHtml(t.naoValeTexto.replace("{contato}", EMAIL_DE_SUPORTE))}</p>`;
  }
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(titulo)}</title>
  <link rel="stylesheet" href="/css/public.css">
  ${FONTES_DO_SITE}
</head>
<body data-pagina-do-servidor="link-do-email">
  ${topoDoSite({ dict, logado: false, assinante: false, naHome: false })}

  <main id="conteudo-principal">
    <section class="section container">
      <div class="section-header">
        ${corpo}
      </div>
    </section>
  </main>

  ${rodapeDoSite({ dict, assinante: false })}
</body>
</html>`;
}
