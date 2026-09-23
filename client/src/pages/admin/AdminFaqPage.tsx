import * as api from "@/lib/api";
import type { AdminHomeFaq } from "@/lib/api";
import type { ConfigDaLista } from "@/lib/home-lists";
import { HomeListEditor } from "@/components/admin/HomeListEditor";

// Perguntas frequentes da home (Bloco C3). Mesma tela dos depoimentos — só os
// nomes dos campos mudam. A FAQ de cada CURSO é outra coisa e mora no
// formulário do curso.

const config: ConfigDaLista<AdminHomeFaq> = {
  queryKey: "admin-home-faq",
  titulo: "Perguntas frequentes",
  descricao: "As perguntas da home. Só as publicadas vão para o site.",
  rotuloNovo: "Nova pergunta",
  vazio: "Nenhuma pergunta neste idioma ainda. Enquanto não houver uma publicada, a seção não aparece na home.",
  principal: { rotulo: "Pergunta", linhas: 2, max: 300 },
  secundario: { rotulo: "Resposta", linhas: 4, max: 3000 },
  ler: (f) => ({ principal: f.question, secundario: f.answer }),
  listar: api.adminGetHomeFaq,
  criar: (language, v) =>
    api.adminCreateHomeFaq({ language, question: v.principal, answer: v.secundario, displayOrder: v.displayOrder, status: v.status }),
  atualizar: (id, v) =>
    api.adminUpdateHomeFaq(id, { question: v.principal, answer: v.secundario, displayOrder: v.displayOrder, status: v.status }),
  excluir: api.adminDeleteHomeFaq,
};

export function AdminFaqPage() {
  return <HomeListEditor config={config} />;
}
