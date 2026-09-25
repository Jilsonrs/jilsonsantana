import { ROTAS_PUBLICAS, type LanguageCode } from "@jilson/core";
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
// OS DESTINOS seguem o idioma do app e vêm de `ROTAS_PUBLICAS` (core), a mesma
// lista da home: em inglês, o aluno vai para os endereços em inglês e para o
// canal do YouTube em inglês.
//
// Várias páginas ainda não existem (Quem somos, Contato, Termos, Privacidade) e
// dão tela vazia até existirem: o operador decidiu (24/09) que o link entra
// antes da página. Não "conserte" isso com a regra 12 do design-lab/GEMINI.md
// (item planejado não vira link) — aquela regra é do menu, e aqui a decisão foi
// explícita.

export type ItemDoRodape =
  | { tipo: "pagina"; href: string; texto: (t: CommonTexts) => string }
  | { tipo: "youtube"; href: string };

export function itensDoRodape(idioma: LanguageCode): ItemDoRodape[] {
  const r = ROTAS_PUBLICAS[idioma];
  return [
    { tipo: "pagina", href: r.faq, texto: (t) => t.footer.links[3] },
    { tipo: "pagina", href: r.quemSomos, texto: (t) => t.footer.links[4] },
    { tipo: "pagina", href: r.contato, texto: (t) => t.footer.links[5] },
    { tipo: "youtube", href: r.youtube },
    { tipo: "pagina", href: r.termos, texto: (t) => t.footer.links[6] },
    { tipo: "pagina", href: r.privacidade, texto: (t) => t.footer.links[7] },
  ];
}
