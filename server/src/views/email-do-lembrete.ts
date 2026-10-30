import { ROTAS_PUBLICAS } from "@jilson/core";
import { enderecoDoSite } from "../lib/endereco-do-site.js";
import type { TipoDeLink } from "../lib/links-do-email.js";
import type { DepoisDoBotao, MensagemDeEmail } from "./email.js";

// O LEMBRETE DE QUEM NÃO TERMINOU DE ASSINAR (etapa 4.7, passo 9 — decisões do operador, 29/10/2026), MONTADO: o
// texto, a partir do dicionário (`app.email.lembrete`). Sem banco e sem rede — QUANDO ele sai mora em
// `lib/quem-nao-terminou.ts`, e a prévia (`npm --workspace server run email:previa`) monta com esta mesma função. Quem
// chama manda texto, nunca HTML: o modelo (`email.ts`) escapa tudo.
//   - o botão leva à tela de assinar;
//   - quem NÃO marcou "Quero receber novidades" ganha o link para pedir (clicou, vira lead; não clicou, os dados saem
//     em 7 dias); quem marcou (é lead) ganha o link para descadastrar.

/** Os textos do lembrete (`app.email.lembrete`). `{nome}` é trocado no código. */
export type TextosDoLembrete = {
  assunto: string;
  titulo: string;
  ola: string;
  naoConcluida: string;
  botao: string;
  querNovidades: string;
  linkNovidades: string;
  apagamos: string;
  eLead: string;
  linkDescadastrar: string;
  naoFoiVoce: string;
};

/** Para quem é o lembrete: o nome digitado (pode faltar) e o link — o de pedir as novidades, ou o de descadastrar. */
export type Lembrete = { nome: string | null; link: { tipo: TipoDeLink; endereco: string } | null };

/** O lembrete montado. Função pura. `enderecoDe`: o endereço absoluto de um caminho do site — sem um que sirva, sai sem o botão. */
export function montarLembrete(lembrete: Lembrete, t: TextosDoLembrete, enderecoDe: (caminho: string) => string | null = enderecoDoSite): MensagemDeEmail {
  const assinar = enderecoDe(ROTAS_PUBLICAS.assinar);
  const { link } = lembrete;
  const depois: DepoisDoBotao[] =
    link?.tipo === "novidades"
      ? [t.querNovidades, { link: t.linkNovidades, endereco: link.endereco }, t.apagamos]
      : link?.tipo === "descadastrar"
        ? [t.eLead, { link: t.linkDescadastrar, endereco: link.endereco }]
        : [];
  return {
    assunto: t.assunto,
    titulo: t.titulo,
    paragrafos: [...(lembrete.nome ? [t.ola.replace("{nome}", lembrete.nome)] : []), t.naoConcluida],
    ...(assinar ? { botao: { texto: t.botao, endereco: assinar } } : {}),
    depoisDoBotao: [...depois, t.naoFoiVoce],
  };
}
