// A ORIGEM DO VISITANTE (o UTM do primeiro acesso — `utm_source`/`utm_campaign`): é o que mede qual
// vídeo do YouTube traz aluno (CLAUDE.md → *Auth*, `acquisitionSource`). Fica no navegador e vai no
// pedido de assinar; a conta nasce com ela.

/** Onde o navegador guarda a origem. */
export const CHAVE_DA_ORIGEM = "jilson.attribution";

/**
 * O MESMO registro da origem que o app faz (`client/src/lib/attribution.ts`), para a HOME — página do
 * servidor, que não roda o app: sem isto, quem chega do YouTube direto na home e só depois vai assinar
 * perdia a origem (achado do passo 6 da etapa 4.7; correção pedida pelo operador em 27/10/2026).
 * Primeiro acesso vence; falha de armazenamento é ignorada. Vai escrito na página (`<script>`); o teste
 * do app o executa e confere que o app lê o que ele grava.
 */
export const SCRIPT_DA_ORIGEM = `(function(){try{var k=${JSON.stringify(CHAVE_DA_ORIGEM)};if(localStorage.getItem(k))return;var p=new URLSearchParams(location.search);var s=p.get("utm_source"),c=p.get("utm_campaign");if(!s&&!c)return;localStorage.setItem(k,JSON.stringify({source:s,campaign:c,capturedAt:new Date().toISOString()}));}catch(e){}})();`;
