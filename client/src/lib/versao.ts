import { useEffect } from "react";
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

let trabalhosEmAndamento = 0;

/**
 * Enquanto este trabalho corre (o envio de um vídeo), a troca de tela continua
 * dentro do app mesmo com versão nova: carregar a página inteira o cortaria
 * (operador, 29/09/2026: trocar de passo no meio de um envio não interrompe nada).
 * A versão nova entra na primeira troca de tela depois que ele termina.
 */
export async function semInterromper<T>(trabalho: () => Promise<T>): Promise<T> {
  trabalhosEmAndamento++;
  try {
    return await trabalho();
  } finally {
    trabalhosEmAndamento--;
  }
}

/** Algo em andamento que carregar a página cortaria (um envio de vídeo)? */
export function haTrabalhoEmAndamento(): boolean {
  return trabalhosEmAndamento > 0;
}

/** A próxima troca de tela carrega a página inteira: há versão nova, e nada em andamento seria cortado. */
export function trocarDeVersaoAgora(): boolean {
  return haVersaoNova() && !haTrabalhoEmAndamento();
}

/** Carregar um endereço do jeito normal do navegador — num objeto, para o teste observar. */
export const navegador = { ir: (endereco: string): void => window.location.assign(endereco) };

/**
 * Ir para outra tela de dentro do código (ex.: a próxima aula ao fim do vídeo):
 * navegação interna, ou carregamento normal se já existe versão nova.
 */
export function useIrPara(): (endereco: string) => void {
  const navigate = useNavigate();
  return (endereco) => (trocarDeVersaoAgora() ? navegador.ir(endereco) : navigate(endereco));
}

/**
 * Os LINKS: com versão nova, o clique num link interno não chega ao app (o React
 * Router), e o navegador segue o link do jeito normal — carregando a página nova.
 * Escuta na fase de captura do documento, antes do app. Nova aba, download, link
 * de fora e clique com tecla modificadora seguem como sempre. Devolve quem desliga.
 */
export function desviarLinksQuandoHouverVersaoNova(documento: Document = document): () => void {
  const ouvir = (evento: MouseEvent) => {
    if (!trocarDeVersaoAgora() || evento.defaultPrevented || evento.button !== 0) return;
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

/** Um pedaço do app carregado sob demanda (`import()`). */
type Pedaco = () => Promise<unknown>;

/**
 * O que o caminho do aluno carrega sob demanda, baixado em segundo plano logo que
 * o app abre: uma aba aberta antes de uma publicação já tem tudo na memória, e
 * trocar entre aula de vídeo e de texto nunca pede arquivo ao servidor.
 * ⚠️ Todo `import()` do app entra numa destas listas, ou na lista de exceções de
 * `pedacos.test.ts`, com o motivo. O teste reprova se não entrar.
 */
export const PEDACOS_DO_ALUNO: ReadonlyArray<Pedaco> = [
  () => import("@/components/content/MarkdownText"),
  // O formulário de assinar (Fase 4, etapa 4.2). O script da Stripe em si só é baixado quando a
  // tela de assinar abre (`lib/stripe-do-site.tsx`), não aqui.
  () => import("@/components/assinar/FormularioDeAssinatura"),
];

/**
 * O mesmo para o admin, baixado só para quem é admin: o operador costuma publicar
 * com o editor aberto, e o passo seguinte não pode depender de um pedaço que a
 * publicação apagou. O seletor de ícones traz junto todos os desenhos do Lucide.
 */
export const PEDACOS_DO_ADMIN: ReadonlyArray<Pedaco> = [
  () => import("@/components/admin/course-content/ModuleLessonTree"),
  () => import("@/components/admin/IconPicker"),
];

/** Baixa os pedaços num momento ocioso, sem disputar com a tela que está abrindo. */
export function preCarregarPedacos(pedacos: ReadonlyArray<Pedaco>): void {
  const baixar = () => {
    for (const pedaco of pedacos) pedaco().catch(() => {});
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(baixar, { timeout: 5000 });
  else setTimeout(baixar, 3000);
}

/** No app de quem é admin, baixa também os pedaços do admin (uma vez por sessão do app). */
export function usePreCarregarDoAdmin(ehAdmin: boolean, pedacos: ReadonlyArray<Pedaco> = PEDACOS_DO_ADMIN): void {
  // Efeito: baixar em segundo plano é ação no navegador, não estado a derivar.
  useEffect(() => {
    if (ehAdmin) preCarregarPedacos(pedacos);
  }, [ehAdmin, pedacos]);
}
