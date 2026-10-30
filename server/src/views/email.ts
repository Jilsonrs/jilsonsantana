import { escapeHtml } from "../lib/html.js";
import type { Dict } from "@jilson/core";

// O MODELO DE TODO E-MAIL DA ESCOLA (etapa 4.7, passo 3). Quem escreve um e-mail novo diz só o
// que muda — o assunto, o título, os parágrafos, o botão — e o modelo põe o resto: o logo, o
// rodapé e as duas versões que todo e-mail leva (a desenhada e a de texto puro, que o provedor do
// aluno usa para decidir se é spam e que aparece em quem lê sem imagens).
//
// O DESENHO É O DO SITE (decisão do operador, 21/10/2026, com o e-mail da Apple como referência):
// a mesma identidade visual em tudo. O logo oficial do menu da home, centralizado no topo do cartão
// branco (ajuste dele no mesmo dia: "dentro da área branca e um pouco menor"); o corpo com 660 de
// largura; o fundo cinza-claro e o cartão branco arredondado da vitrine; as fontes do
// site (Outfit nos títulos, Hanken Grotesk no texto); o botão em pílula azul, o mesmo `.btn` da
// home (`client/src/public-input.css`). Mudou o site? Este modelo acompanha.
//
// O e-mail não tem o CSS do site: o estilo vai escrito em cada elemento, e a estrutura é de
// tabela, que é o que o Outlook e o Gmail desenham igual. As fontes vêm do Google Fonts, como na
// home: o Mail da Apple e o do iPhone as usam; o Gmail e o Outlook ignoram e caem na fonte do
// sistema, que é a segunda da lista — o e-mail fica certo nos dois casos.
//
// TRAVA, a mesma das páginas públicas: todo texto passa por `escapeHtml()` aqui dentro — quem
// chama manda texto, nunca HTML (o nome do aluno ou do curso chega a um e-mail).
// E nenhum texto fica escrito aqui: o nome no lugar do logo (quando a imagem não carrega) e o
// rodapé vêm do dicionário (`app.email`), que o `enviarEmail()` lê pelo `getDict()`. Quem monta é
// ele, por dentro: assim um erro aqui (o botão sem http, por exemplo) vira "e-mail não saiu" e
// alerta, nunca um pedido derrubado.

/**
 * Um item depois do botão: um parágrafo em texto puro, ou um LINK de texto (o endereço só pode ser http(s)) — o
 * "Quero receber novidades" e o "Descadastrar" do lembrete de quem não terminou de assinar (etapa 4.7, passo 9).
 */
export type DepoisDoBotao = string | { link: string; endereco: string };

export type MensagemDeEmail = {
  assunto: string;
  /** O título grande do e-mail, no topo do cartão. */
  titulo?: string;
  /** Cada item é um parágrafo, em texto puro. */
  paragrafos: string[];
  /** O botão, depois dos parágrafos — o endereço só pode ser http(s). */
  botao?: { texto: string; endereco: string };
  /** O que vem DEPOIS do botão — a outra saída (o Pix na cobrança atrasada: 4.9b, E14), ou um link de texto (passo 9). */
  depoisDoBotao?: DepoisDoBotao[];
};

export type EmailMontado = { assunto: string; html: string; texto: string };

/**
 * O logo vem do SITE NO AR (o e-mail é aberto fora dele, então o endereço é completo). É um recorte
 * da `Logomarca.png` do menu da home, sem a sobra transparente: 284×88, mais que o dobro do tamanho
 * em que aparece (120 de largura) — fica nítido em tela de retina. Há teste que confere que o
 * arquivo existe no site.
 */
export const LOGO_DO_EMAIL = { endereco: "https://www.jilsonsantana.com/img/Logomarca-email.png", arquivo: "client/public/img/Logomarca-email.png", largura: 120, altura: 37 };
const LARGURA = 660;
const FONTES_DO_SITE = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500&family=Outfit:wght@600;700&display=swap";
const SISTEMA = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONTE_DO_TEXTO = `'Hanken Grotesk', ${SISTEMA}`;
const FONTE_DO_TITULO = `'Outfit', ${SISTEMA}`;
// As cores da vitrine (`public-input.css`): --brand-blue, --surface-alt, --text-main, --text-muted.
const AZUL = "#238FE8";
const FUNDO = "#F5F5F7";
const TEXTO = "#1D1D1F";
const TEXTO_SUAVE = "#86868B";
const LINHA = "#D2D2D7";

/** O endereço do botão: só http(s). Um `javascript:` num e-mail seria um link que executa código. */
function enderecoDoBotao(endereco: string): string {
  if (!/^https?:\/\/[^\s\\]+$/i.test(endereco)) throw new Error("[email] o botão do e-mail precisa de um endereço http(s)");
  return endereco;
}

/** O e-mail pronto para o `enviarEmail()`: as duas versões, com o logo e o rodapé da escola. */
// Só o topo e o rodapé: os outros textos de `app.email` (os do código, etapa 4.7, passo 5) são de quem monta a mensagem.
export function montarEmail(mensagem: MensagemDeEmail, textos: Pick<Dict["app"]["email"], "topo" | "rodape">): EmailMontado {
  // O assunto vira cabeçalho do e-mail: quebra de linha ali nunca é texto.
  const assunto = mensagem.assunto.replace(/[\r\n]+/g, " ");
  const botao = mensagem.botao ? { texto: mensagem.botao.texto, endereco: enderecoDoBotao(mensagem.botao.endereco) } : null;
  // Os links de texto passam pela mesma conferência do botão: só http(s).
  const depoisDoBotaoConferido = (mensagem.depoisDoBotao ?? []).map((item) => (typeof item === "string" ? item : { link: item.link, endereco: enderecoDoBotao(item.endereco) }));

  const titulo = mensagem.titulo
    ? `<h1 style="margin:0 0 24px;font-family:${FONTE_DO_TITULO};font-size:32px;line-height:1.2;font-weight:700;letter-spacing:-0.03em;color:${TEXTO};">${escapeHtml(mensagem.titulo)}</h1>`
    : "";
  const paragrafos = mensagem.paragrafos.map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join("\n                ");
  const depoisDoBotao = depoisDoBotaoConferido
    .map((item, i) => {
      const margem = `margin:${i === 0 ? 24 : 16}px 0 0;`;
      if (typeof item === "string") return `<p style="${margem}">${escapeHtml(item)}</p>`;
      return `<p style="${margem}"><a href="${escapeHtml(item.endereco)}" style="color:${AZUL};text-decoration:underline;">${escapeHtml(item.link)}</a></p>`;
    })
    .join("\n                ");
  const botaoHtml = botao
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
                  <tr>
                    <td style="border-radius:99px;background:${AZUL};">
                      <a href="${escapeHtml(botao.endereco)}" style="display:inline-block;padding:14px 28px;font-family:${FONTE_DO_TEXTO};font-size:17px;font-weight:500;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:99px;">${escapeHtml(botao.texto)}</a>
                    </td>
                  </tr>
                </table>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <link rel="stylesheet" href="${FONTES_DO_SITE}">
  <title>${escapeHtml(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:${FUNDO};-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">
        <table role="presentation" width="${LARGURA}" cellpadding="0" cellspacing="0" style="width:100%;max-width:${LARGURA}px;">
          <tr>
            <td align="center" style="background:#FFFFFF;border-radius:24px;padding:40px 40px 48px;text-align:center;font-family:${FONTE_DO_TEXTO};font-size:17px;line-height:1.6;color:${TEXTO};">
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                  <tr>
                    <td><img src="${LOGO_DO_EMAIL.endereco}" width="${LOGO_DO_EMAIL.largura}" height="${LOGO_DO_EMAIL.altura}" alt="${escapeHtml(textos.topo)}" style="display:block;width:${LOGO_DO_EMAIL.largura}px;height:auto;border:0;outline:none;text-decoration:none;font-family:${FONTE_DO_TITULO};font-size:20px;font-weight:700;color:${TEXTO};"></td>
                  </tr>
                </table>
                ${titulo}
                ${paragrafos}
                ${botaoHtml}
                ${depoisDoBotao}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${LINHA};font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 24px 0;font-family:${FONTE_DO_TEXTO};font-size:13px;line-height:1.5;color:${TEXTO_SUAVE};">${escapeHtml(textos.rodape)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  // A versão de texto puro: sem escape (não é HTML), com o endereço do botão por extenso.
  const texto =
    [
      textos.topo,
      ...(mensagem.titulo ? [mensagem.titulo] : []),
      ...mensagem.paragrafos,
      ...(botao ? [`${botao.texto}: ${botao.endereco}`] : []),
      ...depoisDoBotaoConferido.map((item) => (typeof item === "string" ? item : `${item.link}: ${item.endereco}`)),
      "—",
      textos.rodape,
    ].join("\n\n") + "\n";

  return { assunto, html, texto };
}
