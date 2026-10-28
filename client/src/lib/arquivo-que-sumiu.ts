import type { Plugin } from "vite";

// O ARQUIVO DO APP QUE SUMIU (achado do operador, 27/10/2026 — a página em branco). A cada publicação
// os arquivos do app mudam de nome e os antigos deixam de existir. Quando o navegador reabre uma
// página guardada de antes (o Safari reabriu uma de dois dias antes), ela pede o arquivo PRINCIPAL
// antigo, e sem ele o app nem começa: a proteção de `recarregar.ts`, que mora no app, nunca roda.
// Este vigia vai ESCRITO na página, antes do app: um arquivo do app que não chega recarrega a página
// uma vez, e o recarregar traz a versão nova. A MESMA trava do app (esta chave e os 30 s): não
// recarrega em ciclo, e sem armazenamento no navegador não recarrega.

/** Onde o navegador anota a hora em que a página recarregou por versão — o app e o vigia usam a mesma. */
export const CHAVE_DA_TRAVA = "jilson:recarregou-por-versao";
/** Não recarrega de novo dentro deste tempo (ms). */
export const JANELA_DA_TRAVA = 30_000;

/**
 * O vigia, como texto (vai na página como `<script>`, e o teste o executa). Escrito à moda antiga
 * (`var`, `function`) de propósito: script escrito na página não passa pela conversão do Vite, e tem
 * de rodar no piso de aparelhos (iOS 15). Só reage a arquivo DESTE site em `/assets/` — os do app —
 * que seja script ou folha de estilo. `recarregar` existe para o teste observar a recarga (o jsdom
 * não deixa trocar `location.reload`); a página usa o padrão.
 */
export function scriptDoVigia(recarregar = "location.reload()"): string {
  return `(function(){addEventListener("error",function(e){var a=e.target;if(!a||(a.tagName!=="SCRIPT"&&a.tagName!=="LINK"))return;var s=String(a.src||a.href||"");if(s.indexOf(location.origin+"/assets/")!==0)return;try{var k=${JSON.stringify(CHAVE_DA_TRAVA)},agora=Date.now();if(agora-Number(sessionStorage.getItem(k)||0)<${JANELA_DA_TRAVA})return;sessionStorage.setItem(k,String(agora));}catch(x){return;}${recarregar};},true);})();`;
}

/** O vigia que vai na página. */
export const SCRIPT_DO_ARQUIVO_QUE_SUMIU = scriptDoVigia();

/** O plugin do Vite que escreve o vigia no COMEÇO do `<head>` da página do app (`vite.config.ts`), antes dos arquivos do app. */
export function vigiaDoArquivoQueSumiu(): Plugin {
  return {
    name: "vigia-do-arquivo-que-sumiu",
    transformIndexHtml: () => [{ tag: "script", children: SCRIPT_DO_ARQUIVO_QUE_SUMIU, injectTo: "head-prepend" }],
  };
}
