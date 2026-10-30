// OS CABEÇALHOS DE SEGURANÇA DE TODA RESPOSTA — o que o navegador obedece (`app.ts`, logo depois do `express.json()`).
//
// - A JANELA DA ESCOLA ISOLADA de quem a abre (achado P1 da revisão de segurança do Bloco AULA, etapa 6, 07/10/2026):
//   sem o `Cross-Origin-Opener-Policy`, um site de terceiros que abre a escola numa janela continua "no mesmo grupo"
//   dela, e o canal do aviso de legenda (que aceita a moldura do Bunny) fica menos garantido.
//   `same-origin-allow-popups`: quem abre a escola perde a referência a ela; as janelas que a escola abrir continuam
//   funcionando.
// - A ESCOLA NÃO SE DEIXA EMOLDURAR (E10 da revisão ampla da cobrança, 29/10/2026): sem o `frame-ancestors`, um site
//   qualquer punha a `/assinar` (ou a área do aluno) numa moldura e cobria os botões com os dele, para a pessoa clicar
//   sem ver o que clica. Só a própria escola pode emoldurar as páginas dela; o `X-Frame-Options` é o mesmo pedido para
//   navegador antigo. As molduras que a ESCOLA abre (o player do Bunny, o campo da Stripe) não mudam: o cabeçalho diz
//   quem pode emoldurar a escola, não o que ela emoldura.
// - SÓ HTTPS (E10): o navegador que já visitou a escola nunca mais tenta o endereço sem https — o primeiro pedido de
//   uma rede de café não pode ser desviado. Só em produção (no computador é http), por 1 ano, e sem os subdomínios:
//   o que mora neles não é deste servidor.
// Nas respostas que não são página (a API), o navegador ignora o que não se aplica.

/** Os cabeçalhos de toda resposta. Função pura. */
export function cabecalhosDeSeguranca(emProducao: boolean): Record<string, string> {
  return {
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Content-Security-Policy": "frame-ancestors 'self'",
    "X-Frame-Options": "SAMEORIGIN",
    ...(emProducao ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
  };
}
