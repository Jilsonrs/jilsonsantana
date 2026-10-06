import path from "node:path";

/**
 * O endereço pede um ARQUIVO (tem extensão: `.js`, `.css`, `.png`…)? Então,
 * se ele não existe, a resposta é 404 — nunca a página do app no lugar.
 *
 * Por quê (05/10/2026, achado pelo operador): a cada publicação os pedaços do app
 * mudam de nome, e quem estava com o site aberto pede o pedaço antigo. Devolver a
 * página do app (HTML) no lugar do `.js` fazia o navegador falhar ao usá-la como
 * código, e a tela ficava em branco. Com 404, o app percebe e recarrega a versão
 * nova (`client/src/lib/recarregar.ts`). Endereço de TELA (sem extensão) continua
 * indo para o app.
 */
export function pedeArquivo(caminho: string): boolean {
  return path.extname(caminho) !== "";
}
