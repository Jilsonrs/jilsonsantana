import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * A IDENTIDADE da versão do app que este servidor entrega (decisão do operador,
 * 06/10/2026: atualizar o site sem atrapalhar quem está estudando). O Vite a grava
 * em `versao.txt`, ao lado do app montado (`client/vite.config.ts`); o servidor a
 * manda em toda resposta da API (`X-Versao-Do-App`), e a aba aberta antes de uma
 * publicação percebe a diferença e carrega a página inteira na próxima troca de
 * tela. Sem o arquivo (desenvolvimento), nada é mandado.
 */
export function lerVersaoDoApp(pastaDoApp: string): string | null {
  try {
    const versao = readFileSync(path.join(pastaDoApp, "versao.txt"), "utf8").trim();
    return versao.length > 0 ? versao : null;
  } catch {
    return null;
  }
}
