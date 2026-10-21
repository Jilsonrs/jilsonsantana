import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pt } from "@jilson/core";
import { LOGO_DO_EMAIL, montarEmail } from "./views/email.js";

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
