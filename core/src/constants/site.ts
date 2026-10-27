// OS ENDEREÇOS DA VITRINE. A escola é só em português (decisão do operador,
// 12/10/2026 — etapa 4.6c): há um endereço por página, sem `/en`.
//
// Moram no `core` porque DOIS lugares apontam para eles: a home pública
// (`server/src/views/home.ts`) e o rodapé do app logado
// (`client/src/lib/footer.ts`). Duas cópias divergem, e a que diverge é a que
// ninguém está olhando.
//
// Os links apontam para o DESTINO FINAL mesmo onde a página ainda não existe
// (decisão do operador, set/2026): é melhor o link já nascer no lugar certo do
// que virar `#` e alguém esquecer de trocar depois.
export const ROTAS_PUBLICAS = {
  home: "/",
  cursos: "/cursos",
  trilhas: "/trilhas",
  assinar: "/assinar",
  faq: "/#faq",
  quemSomos: "/quem-somos",
  contato: "/contato",
  termos: "/termos",
  privacidade: "/privacidade",
  youtube: "https://www.youtube.com/@JilsonSantanaBI/",
} as const;

/** O endereço público de UM curso (decisão do operador, 14/09/2026: `/curso/:slug`). */
export function enderecoDoCurso(slug: string): string {
  return `/curso/${slug}`;
}

/**
 * A caixa de SUPORTE da escola (decisão do operador, P49, 20/10/2026): o "responder para" de todo
 * e-mail e o contato que a tela de depois do pagamento mostra a quem digitou o e-mail errado.
 */
export const EMAIL_DE_SUPORTE = "suporte@jilsonsantana.com";
