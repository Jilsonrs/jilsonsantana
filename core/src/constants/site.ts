import type { LanguageCode } from "../schemas/site-text.js";

// OS ENDEREÇOS DA VITRINE, por idioma — um endereço por idioma, com segmentos em
// inglês sob /en (CLAUDE.md → Idiomas).
//
// Moram no `core` porque DOIS lugares apontam para eles: a home pública
// (`server/src/views/home.ts`) e o rodapé do app logado
// (`client/src/lib/footer.ts`). Duas cópias divergem, e a que diverge é a que
// ninguém está olhando.
//
// Os links apontam para o DESTINO FINAL mesmo onde a página ainda não existe
// (decisão do operador, set/2026): é melhor o link já nascer no lugar certo do
// que virar `#` e alguém esquecer de trocar depois.
//
// YouTube: um canal por idioma (decisão do operador, 24/09/2026 — `idiomas.md` §7).
export const ROTAS_PUBLICAS: Record<
  LanguageCode,
  {
    home: string;
    cursos: string;
    trilhas: string;
    assinar: string;
    faq: string;
    quemSomos: string;
    contato: string;
    termos: string;
    privacidade: string;
    youtube: string;
  }
> = {
  pt: {
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
  },
  en: {
    home: "/en",
    cursos: "/en/courses",
    trilhas: "/en/learning-paths",
    assinar: "/en/pricing",
    faq: "/en#faq",
    quemSomos: "/en/about",
    contato: "/en/contact",
    termos: "/en/terms",
    privacidade: "/en/privacy",
    youtube: "https://www.youtube.com/@jilsonen",
  },
};
