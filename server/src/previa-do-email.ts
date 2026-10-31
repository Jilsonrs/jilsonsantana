import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pt } from "@jilson/core";
import { LOGO_DO_EMAIL, montarEmail, type MensagemDeEmail } from "./views/email.js";
import { montarAvisoDaCobranca, type EmailDevido } from "./views/email-da-cobranca.js";
import { montarLembrete } from "./views/email-do-lembrete.js";
import { reciboDoEmail } from "./views/recibo-no-email.js";

// A PRÉVIA DO MODELO DE E-MAIL (etapa 4.7, passo 3) — para o operador e o parceiro de design
// olharem o desenho sem mandar nada: `npm --workspace server run email:previa`, e abrir o arquivo
// que ele diz no navegador. Grava em `design-lab/email/` (fora do git) uma mensagem de EXEMPLO com
// título, parágrafos e botão, e copia o logo para junto dela: o arquivo aberto do disco não
// carrega imagem de outra pasta, e no e-mail de verdade o logo vem do site no ar.

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pasta = join(raiz, "design-lab", "email");
mkdirSync(pasta, { recursive: true });

const { html } = montarEmail(
  {
    assunto: "Exemplo de e-mail da escola",
    titulo: "Título do e-mail",
    paragrafos: [
      "Olá, Fulana!",
      "Este é um e-mail de exemplo: ele mostra o modelo que todo e-mail da escola usa — o logo, o título, o texto, o botão e o rodapé. O texto de cada e-mail de verdade vem do passo que o cria.",
      "Um segundo parágrafo, para ver o espaço entre eles.",
    ],
    botao: { texto: "Texto do botão", endereco: "https://www.jilsonsantana.com" },
  },
  pt.app.email,
);

const logo = LOGO_DO_EMAIL.arquivo.split("/").at(-1) ?? "logo.png";
copyFileSync(join(raiz, LOGO_DO_EMAIL.arquivo), join(pasta, logo));
const arquivo = join(pasta, "previa.html");
writeFileSync(arquivo, html.replace(LOGO_DO_EMAIL.endereco, logo));
console.log(`Prévia gravada em ${arquivo}`);

// OS E-MAILS DA COBRANÇA (etapa 4.7, passo 7), com os textos de fábrica do dicionário e datas de
// exemplo — montados pela MESMA função que o servidor usa, para o operador conferir o texto.
const DIA = 24 * 60 * 60 * 1000;
const falha = new Date();
const site = (caminho: string) => `https://www.jilsonsantana.com${caminho}`;
const trancaEm = new Date(falha.getTime() + 3 * DIA);
const naFalha: EmailDevido = { tipo: "COBRANCA_FALHOU", referencia: falha.toISOString(), trancaEm };
const noUltimoDia: EmailDevido = { tipo: "ANTES_DE_TRANCAR", referencia: falha.toISOString(), trancaEm };
const fim: EmailDevido = { tipo: "CANCELADA", referencia: "fim", trancaEm: null };
// O RECIBO DE EXEMPLO (4.7b, passo 6a): o mensal com o código BLACK50, como nas fotos.
const reciboDeExemplo = reciboDoEmail(
  { em: falha.toISOString(), centavos: 4995, moeda: "brl", forma: "cartao", cartao: { bandeira: "visa", final: "4242" }, situacao: "paga", devolvido: 0, numero: "81DD-3FD1-33E6-F9FB", plano: "mensal", periodo: { de: falha.toISOString(), ate: new Date(falha.getTime() + 30 * DIA).toISOString() }, detalhe: { preco: 9990, descontos: [{ codigo: "BLACK50", centavos: 4995 }], credito: 0 } },
  pt.app.faturamento,
);
const comRecibo = { recibo: reciboDeExemplo, endereco: site("/aluno/conta/faturamento/recibo/81dd3fd133e6f9fb") };
const exemplos: Array<[string, MensagemDeEmail]> = [
  // Com o Pix no ar (4.9b, E14): a frase do Pix depois do botão.
  ["previa-cobranca-falhou.html", montarAvisoDaCobranca(naFalha, { proximaTentativa: new Date(falha.getTime() + 2 * DIA) }, falha, pt.app.email, site, true)],
  ["previa-antes-de-trancar.html", montarAvisoDaCobranca(noUltimoDia, {}, falha, pt.app.email, site, true)],
  ["previa-cancelada-sem-pagamento.html", montarAvisoDaCobranca(fim, { encerradaSemPagamento: true }, falha, pt.app.email, site)],
  ["previa-cancelada.html", montarAvisoDaCobranca(fim, {}, falha, pt.app.email, site)],
  ["previa-prepago-terminando.html", montarAvisoDaCobranca({ tipo: "PREPAGO_TERMINANDO", referencia: trancaEm.toISOString(), trancaEm }, {}, falha, pt.app.email, site)],
  // A confirmação de quem assinou (4.9b, E18): no cartão, mensal e anual; no Pix, com o fim do acesso.
  ["previa-confirmada-mensal.html", montarAvisoDaCobranca({ tipo: "CONFIRMADA", referencia: "inicio", trancaEm: null }, { plano: "mensal" }, falha, pt.app.email, site, false, comRecibo)],
  // O recibo por e-mail na renovação e na troca de plano (4.7b, passo 6a).
  ["previa-pagamento-recebido.html", { assunto: pt.app.email.pagamentoRecebido.assunto, titulo: pt.app.email.pagamentoRecebido.titulo, paragrafos: [pt.app.email.pagamentoRecebido.texto], recibo: reciboDeExemplo, botao: { texto: pt.app.email.pagamentoRecebido.botao, endereco: comRecibo.endereco } }],
  ["previa-confirmada-anual.html", montarAvisoDaCobranca({ tipo: "CONFIRMADA", referencia: "inicio", trancaEm: null }, { plano: "anual" }, falha, pt.app.email, site)],
  ["previa-confirmada-pix.html", montarAvisoDaCobranca({ tipo: "CONFIRMADA", referencia: "inicio", trancaEm: new Date(falha.getTime() + 30 * DIA) }, { plano: "mensal" }, falha, pt.app.email, site)],
  // O lembrete de quem não terminou de assinar (etapa 4.7, passo 9): quem não marcou a caixa de novidades (o link de
  // pedir) e quem marcou (é lead: o link de descadastrar). Os links são de exemplo.
  ["previa-lembrete-sem-novidades.html", montarLembrete({ link: { tipo: "novidades", endereco: site("/novidades/exemplo") } }, pt.app.email.lembrete, site)],
  ["previa-lembrete-lead.html", montarLembrete({ link: { tipo: "descadastrar", endereco: site("/descadastrar/exemplo") } }, pt.app.email.lembrete, site)],
];
for (const [nome, mensagem] of exemplos) {
  const caminho = join(pasta, nome);
  writeFileSync(caminho, montarEmail(mensagem, pt.app.email).html.replace(LOGO_DO_EMAIL.endereco, logo));
  console.log(`Prévia gravada em ${caminho}`);
}
