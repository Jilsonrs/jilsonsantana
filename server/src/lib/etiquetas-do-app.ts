import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// O APP NUMA PÁGINA DO SERVIDOR (etapa 4.7, passo 6c). A tela pública de assinar é uma página do
// servidor — o menu e o rodapé do site (decisão do operador, 12/10/2026) — com o app no meio, só
// com o formulário (o campo do cartão da Stripe é React). O app entra pelas MESMAS etiquetas que o
// `index.html` dele traz: em produção, o que o Vite montou (os nomes mudam a cada versão); em dev,
// o que o servidor do Vite entrega (com o recarregar ao vivo). Um caminho só nos dois ambientes: o
// que muda é de onde vem o `index.html`.

/** O `index.html` montado, na imagem: `server/public` (o `Dockerfile` copia o `client/dist` para lá). */
const INDEX_MONTADO = fileURLToPath(new URL("../../public/index.html", import.meta.url));

/**
 * As etiquetas do app num `index.html`: os scripts (com endereço ou escritos ali, como o do
 * recarregar ao vivo em dev) e as folhas de estilo e os pré-carregamentos — na ordem em que vêm.
 * O resto (título, ícone, `<div id="root">`) é da página do servidor. Função pura.
 */
export function etiquetasDoApp(html: string): string {
  const etiquetas = html.match(/<script\b[^>]*>[\s\S]*?<\/script>|<link\b[^>]*>/gi) ?? [];
  return etiquetas.filter((e) => e.toLowerCase().startsWith("<script") || /\brel=["']?(stylesheet|modulepreload)["'\s>]/i.test(e)).join("\n  ");
}

let doMontado: string | null = null;

/** As etiquetas para a página: em produção, lidas uma vez do `index.html` montado; fora dela, do Vite. */
export async function etiquetasDaPagina(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    // O arquivo é da imagem e não muda enquanto ela roda. Uma falha não fica guardada.
    doMontado ??= etiquetasDoApp(await readFile(INDEX_MONTADO, "utf8"));
    return doMontado;
  }
  const vite = process.env.VITE_DEV_URL || "http://localhost:5173";
  const resposta = await fetch(`${vite}/index.html`, { headers: { accept: "text/html" } });
  if (!resposta.ok) throw new Error(`[site] o Vite não entregou o index.html do app (${resposta.status}) — o dev:client está ligado?`);
  return etiquetasDoApp(await resposta.text());
}
