import type { Config } from "tailwindcss";
import base from "./tailwind.config";

/**
 * Tailwind da SUPERFÍCIE PÚBLICA — separado do app de propósito.
 *
 * O `tailwind.config.ts` varre `client/src/**`, que é o app do aluno e do
 * admin. Compilar o CSS público com ele fazia a vitrine carregar as classes de
 * TODA tela do React: 50 KB viraram 68 KB só com a tela nova de textos, e
 * cresceria a cada tela daqui pra frente — justamente na página que existe
 * para carregar leve, sem bundle de JS.
 *
 * Aqui o `content` olha SÓ o template do servidor. Herda tema, fontes e cores
 * do config base: a consistência visual mora nos tokens, não na varredura
 * (CLAUDE.md → Rendering Boundary).
 */
const config: Config = {
  ...base,
  content: ["../server/src/views/**/*.ts"],
};

export default config;
