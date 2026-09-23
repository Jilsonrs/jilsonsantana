import { ContentStatus, type LanguageCode } from "@jilson/core";

// O editor das listas da home (Bloco C3): depoimentos e perguntas frequentes
// têm a MESMA forma — dois textos, idioma, ordem e status — e só mudam de nome.
// Um editor só, configurado por página, em vez de duas telas copiadas que um
// dia divergem.

/** O formulário fala uma língua neutra; cada página traduz para os campos dela. */
export type ValoresDoItem = {
  principal: string;
  secundario: string;
  displayOrder: number;
  status: ContentStatus;
};

export type ItemDaLista = {
  id: number;
  language: LanguageCode;
  displayOrder: number;
  status: ContentStatus;
};

export type CampoDaLista = { rotulo: string; linhas: number; max: number };

export type ConfigDaLista<T extends ItemDaLista> = {
  queryKey: string;
  titulo: string;
  descricao: string;
  rotuloNovo: string;
  vazio: string;
  principal: CampoDaLista;
  secundario: CampoDaLista;
  ler: (item: T) => { principal: string; secundario: string };
  listar: () => Promise<T[]>;
  criar: (language: LanguageCode, valores: ValoresDoItem) => Promise<unknown>;
  atualizar: (id: number, valores: ValoresDoItem) => Promise<unknown>;
  excluir: (id: number) => Promise<void>;
};

// Nomes que o operador aprovou ao decidir o C3 (23/09/2026).
export const ROTULO_STATUS: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: "Rascunho",
  [ContentStatus.PUBLISHED]: "Publicado",
  [ContentStatus.ARCHIVED]: "Arquivado",
};

export const ROTULO_IDIOMA: Record<LanguageCode, string> = { pt: "Português", en: "Inglês" };

/** Item novo entra no FIM da lista do idioma: maior ordem + 10 (os passos de 10
 *  deixam espaço para encaixar um item entre dois sem renumerar). */
export function proximaOrdem(itens: ItemDaLista[]): number {
  return itens.reduce((maior, i) => Math.max(maior, i.displayOrder), 0) + 10;
}
