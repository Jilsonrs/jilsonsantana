import { useNavigate } from "react-router-dom";

// ATUALIZAR O SITE SEM ATRAPALHAR QUEM ESTÁ ESTUDANDO (decisão do operador,
// 06/10/2026 — "recarrega só se houver versão nova", como o Next.js faz).
//
// O app roda no navegador; o servidor diz, em toda resposta da API, qual versão ele
// é (`X-Versao-Do-App`). Quando ela não bate com a deste app, a aba aberta é de
// antes de uma publicação. Então a PRÓXIMA troca de tela — o clique num link, a
// passagem automática ao fim do vídeo — deixa de ser navegação interna e vira um
// carregamento normal de página, que já traz a versão nova. Sem aviso e sem botão:
// para o aluno, é só a próxima aula abrindo.
//
// Sem a informação (desenvolvimento, ou servidor de antes desta mudança), nada muda.

export const VERSAO_DESTE_APP: string = __VERSAO_DO_APP__;

let versaoDoServidor: string | null = null;

/** Guarda a versão que o servidor informou numa resposta. */
export function anotarVersaoDoServidor(versao: unknown): void {
  if (typeof versao === "string" && versao.length > 0) versaoDoServidor = versao;
}

/** O servidor já é outra versão: a próxima troca de tela carrega a página inteira. */
export function haVersaoNova(): boolean {
  return versaoDoServidor !== null && versaoDoServidor !== VERSAO_DESTE_APP;
}

/** Só para os testes: volta ao estado de "nada informado". */
export function esquecerVersaoDoServidor(): void {
  versaoDoServidor = null;
}

/** Carregar um endereço do jeito normal do navegador — num objeto, para o teste observar. */
export const navegador = { ir: (endereco: string): void => window.location.assign(endereco) };

/**
 * Ir para outra tela de dentro do código (ex.: a próxima aula ao fim do vídeo):
 * navegação interna, ou carregamento normal se já existe versão nova.
 */
export function useIrPara(): (endereco: string) => void {
  const navigate = useNavigate();
  return (endereco) => (haVersaoNova() ? navegador.ir(endereco) : navigate(endereco));
}

/**
 * Os LINKS: com versão nova, o clique num link interno não chega ao app (o React
 * Router), e o navegador segue o link do jeito normal — carregando a página nova.
 * Escuta na fase de captura do documento, antes do app. Nova aba, download, link
 * de fora e clique com tecla modificadora seguem como sempre. Devolve quem desliga.
 */
export function desviarLinksQuandoHouverVersaoNova(documento: Document = document): () => void {
  const ouvir = (evento: MouseEvent) => {
    if (!haVersaoNova() || evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const link = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    if (link.origin !== window.location.origin) return;
    evento.stopPropagation();
  };
  documento.addEventListener("click", ouvir, true);
  return () => documento.removeEventListener("click", ouvir, true);
}

/**
 * O que o caminho do aluno carrega sob demanda, baixado em segundo plano logo que
 * o app abre: uma aba aberta antes de uma publicação já tem tudo na memória, e
 * trocar entre aula de vídeo e de texto nunca pede arquivo ao servidor.
 * ⚠️ Pedaço novo carregado sob demanda no caminho do aluno entra nesta lista.
 */
export const PEDACOS_DO_ALUNO: ReadonlyArray<() => Promise<unknown>> = [() => import("@/components/content/MarkdownText")];

/** Baixa os pedaços do aluno num momento ocioso, sem disputar com a tela que está abrindo. */
export function preCarregarPedacosDoAluno(pedacos: ReadonlyArray<() => Promise<unknown>> = PEDACOS_DO_ALUNO): void {
  const baixar = () => {
    for (const pedaco of pedacos) pedaco().catch(() => {});
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(baixar, { timeout: 5000 });
  else setTimeout(baixar, 3000);
}
