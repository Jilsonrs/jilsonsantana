// O ENDEREÇO DO SITE PARA OS LINKS DOS E-MAILS (etapa 4.7, passo 5): o `BETTER_AUTH_URL`, a mesma
// origem do site (o servidor e o site saem do mesmo container). EM PRODUÇÃO, SÓ HTTPS: um
// `BETTER_AUTH_URL` gravado sem esquema, com `http://` ou copiado do dev faria o botão do e-mail
// apontar para o lugar errado — aí o e-mail sai sem o botão (o texto diz o caminho), e a subida do
// servidor já alertou (`index.ts`).

/** O endereço absoluto de um caminho do site (`/login`) — ou nada, se a base não serve. */
export function enderecoDoSite(caminho: string, ambiente: NodeJS.ProcessEnv = process.env): string | null {
  const base = ambiente.BETTER_AUTH_URL;
  if (!base) return null;
  let endereco: URL;
  try {
    endereco = new URL(caminho, base);
  } catch {
    return null;
  }
  if (endereco.protocol !== "https:" && !(ambiente.NODE_ENV !== "production" && endereco.protocol === "http:")) return null;
  return endereco.toString();
}
