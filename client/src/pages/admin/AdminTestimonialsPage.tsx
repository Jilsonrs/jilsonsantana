import * as api from "@/lib/api";
import type { AdminTestimonial } from "@/lib/api";
import type { ConfigDaLista } from "@/lib/home-lists";
import { HomeListEditor } from "@/components/admin/HomeListEditor";

// Depoimentos da home (Bloco C3). Regras do operador (docs/content.md):
// depoimento REAL, com nome completo, e sai na hora se a pessoa pedir — o
// "Excluir" daqui apaga a linha de vez. Esconder sem apagar é o status.
// SEM ordem: a home sorteia 4 por visita (decisão do operador, 23/09/2026), então
// a tela não pede nem envia `displayOrder`; a lista vem do mais novo para o mais
// antigo.

const config: ConfigDaLista<AdminTestimonial> = {
  queryKey: "admin-testimonials",
  titulo: "Depoimentos",
  descricao: "O que aparece na seção de depoimentos da home. Só os publicados vão para o site.",
  rotuloNovo: "Novo depoimento",
  vazio: "Nenhum depoimento neste idioma ainda. Enquanto não houver um publicado, a seção não aparece na home.",
  comOrdem: false,
  principal: { rotulo: "Depoimento", linhas: 4, max: 1000 },
  secundario: { rotulo: "Nome completo", linhas: 1, max: 120 },
  ler: (t) => ({ principal: t.text, secundario: t.name }),
  listar: api.adminGetTestimonials,
  criar: (language, v) =>
    api.adminCreateTestimonial({ language, text: v.principal, name: v.secundario, status: v.status }),
  atualizar: (id, v) =>
    api.adminUpdateTestimonial(id, { text: v.principal, name: v.secundario, status: v.status }),
  excluir: api.adminDeleteTestimonial,
};

export function AdminTestimonialsPage() {
  return <HomeListEditor config={config} />;
}
