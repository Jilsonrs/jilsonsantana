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
//     em 7 dias); quem marcou (é lead) ganha o link para descadastrar;
//   - SÓ TEXTO FIXO, SEM O NOME DIGITADO (decisão do operador, 30/10/2026, depois da revisão de segurança): o lembrete
//     vai para uma caixa que ninguém provou, e o nome — escrito por quem digitou o e-mail — servia a um golpe assinado
//     pela escola ("seu acesso foi bloqueado, regularize em…"). Nada do que o visitante digita entra neste e-mail.

/** Os textos do lembrete (`app.email.lembrete`). */
export type TextosDoLembrete = {
  assunto: string;
  titulo: string;
  naoConcluida: string;
  botao: string;
  querNovidades: string;
  linkNovidades: string;
  apagamos: string;
  eLead: string;
  linkDescadastrar: string;
  naoFoiVoce: string;
};

/** O link do lembrete — o de pedir as novidades, ou o de descadastrar. Nada que o visitante digitou. */
export type Lembrete = { link: { tipo: TipoDeLink; endereco: string } | null };

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
    paragrafos: [t.naoConcluida],
    ...(assinar ? { botao: { texto: t.botao, endereco: assinar } } : {}),
    depoisDoBotao: [...depois, t.naoFoiVoce],
  };
}
