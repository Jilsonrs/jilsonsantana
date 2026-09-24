import type { CommonTexts } from "@/lib/api";

// O rodapé do app logado, no aluno e no admin (decisão do operador, 24/09/2026).
// É DADO, como o mapa de navegação: o parceiro de design formata o componente
// (`components/layout/AppFooter.tsx`), não mexe aqui.
//
// OS TEXTOS NÃO MORAM AQUI. Cada item aponta para um texto de `common.footer`,
// o MESMO do rodapé da home, editável em Admin → Textos: editou uma vez, muda
// nos dois lugares. O número é a posição na lista `common.footer.links` do
// dicionário — a mesma que `server/src/views/home.ts` usa.
//
// Os destinos são páginas PÚBLICAS do servidor, não telas do app. Quem somos,
// Contato, Termos e Privacidade ainda não existem e dão tela vazia até
// existirem: o operador decidiu (24/09) que o link entra antes da página. Não
// "conserte" isso com a regra 12 do design-lab/GEMINI.md (item planejado não
// vira link) — aquela regra é do menu, e aqui a decisão foi explícita.

export type ItemDoRodape =
  | { tipo: "pagina"; href: string; texto: (t: CommonTexts) => string }
  | { tipo: "youtube"; href: string };

export const ITENS_DO_RODAPE: ItemDoRodape[] = [
  { tipo: "pagina", href: "/#faq", texto: (t) => t.footer.links[3] },
  { tipo: "pagina", href: "/quem-somos", texto: (t) => t.footer.links[4] },
  { tipo: "pagina", href: "/contato", texto: (t) => t.footer.links[5] },
  { tipo: "youtube", href: "https://www.youtube.com/@JilsonSantanaBI/" },
  { tipo: "pagina", href: "/termos", texto: (t) => t.footer.links[6] },
  { tipo: "pagina", href: "/privacidade", texto: (t) => t.footer.links[7] },
];
