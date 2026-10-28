// O SITE FOI ATUALIZADO COM A TELA ABERTA (achado do operador, 05/10/2026). A
// cada publicação os pedaços do app mudam de nome; quem estava com o site aberto
// pede o pedaço antigo, que não existe mais, e a tela ficava em branco. Recarregar
// a página traz a versão nova — então o app recarrega SOZINHO, uma vez.
//
// A trava: não recarrega de novo dentro de 30 s. Se o pedaço continuar faltando
// depois de recarregar (outro defeito), a tela de erro aparece em vez de a página
// ficar recarregando em ciclo. Sem armazenamento no navegador, não recarrega
// sozinho (não há como travar o ciclo): a tela de erro oferece o botão.
// Com um envio de vídeo em andamento também não: recarregar o cortaria.

import { CHAVE_DA_TRAVA, JANELA_DA_TRAVA } from "@/lib/arquivo-que-sumiu";
import { haTrabalhoEmAndamento } from "@/lib/versao";

// A trava é UMA só, com o vigia escrito na página (`arquivo-que-sumiu.ts`): os dois não recarregam em ciclo.
const CHAVE = CHAVE_DA_TRAVA;
export { JANELA_DA_TRAVA };

/** Recarregar a página — num objeto, para o teste poder observar (o jsdom não deixa trocar `location.reload`). */
export const pagina = { recarregar: (): void => window.location.reload() };

/** O erro é de um pedaço do app que não carregou (versão anterior do site)? */
export function ehErroDeVersaoAntiga(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload/i.test(mensagem);
}

/**
 * Recarrega a página, a não ser que já tenha recarregado há menos de 30 s, ou que
 * haja um envio de vídeo em andamento. Diz se recarregou.
 */
export function recarregarUmaVez(agora: number = Date.now()): boolean {
  if (haTrabalhoEmAndamento()) return false;
  try {
    const ultima = Number(window.sessionStorage.getItem(CHAVE) ?? 0);
    if (agora - ultima < JANELA_DA_TRAVA) return false;
    window.sessionStorage.setItem(CHAVE, String(agora));
  } catch {
    return false;
  }
  pagina.recarregar();
  return true;
}
