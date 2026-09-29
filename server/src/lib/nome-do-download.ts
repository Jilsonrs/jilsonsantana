/**
 * O nome com que o aluno baixa o arquivo: o NOME ORIGINAL que o operador enviou
 * (pedido dele, 29/09/2026: "se enviei x.zip, baixa x.zip"), limpo na hora da
 * entrega — a defesa fica na renderização, não na gravação.
 *
 * Tira o que engana ou quebra o cabeçalho: caracteres de controle, os invisíveis
 * de direção de texto (com eles, `relatorio<U+202E>fdp.exe` aparece como `relatorioexe.pdf`
 * — achado P2 da revisão de segurança de 28/09) e as barras. Função pura, com teste.
 */
export function nomeParaDownload(nome: string): string {
  const limpo = nome
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "")
    .replace(/[/\\]/g, "_")
    .trim();
  return limpo.length > 0 ? limpo : "arquivo";
}
