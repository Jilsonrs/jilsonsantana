/**
 * Protege contra injeção de HTML e XSS escapando caracteres especiais para texto
 * visível e atributos. Não escapa duplamente strings que já contêm entidades HTML.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  
  return unsafe
    // Só substitui "&" se não for parte de uma entidade HTML já existente
    .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Serializa um objeto em JSON seguro para ser incluído em uma tag <script type="application/ld+json">.
 * Ele escapa os símbolos '<' para `\\u003c` para impedir que um atacante consiga
 * injetar a string `</script>` e escapar do script block, o que quebraria a tag JSON.
 */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
