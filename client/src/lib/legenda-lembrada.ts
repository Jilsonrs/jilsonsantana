import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { deveTentarDeNovo } from "@/lib/tentar-de-novo";

// A LEGENDA LEMBRADA (Bloco AULA, etapa 6 — decisão do operador, 07/10/2026, "como no
// LinkedIn"): começa desligada; o aluno liga no CC do próprio player, e ela continua
// ligada nas próximas aulas e ao sair e voltar, em qualquer aparelho, até ele desligar
// no mesmo CC. Sem botão novo.
//
// Como: o player.js não avisa quando o CC muda, então um script NOSSO, colado no HTML
// personalizado do player do Bunny (o texto está no `bunny.md`), avisa a página da
// aula com `{ origem: "jilsonsantana-legenda", ligada }`. A página grava a escolha na
// conta e abre cada aula com `captions=<idioma do curso>` (ligada) ou `captions=off`
// (desligada) — parâmetro de embed do Bunny Player que vence a memória do próprio player
// no aparelho (medido, `bunny.md`).

/** De onde o player do Bunny fala: só o player novo, o Bunny Player (07/10/2026). */
export const ORIGENS_DO_PLAYER: ReadonlyArray<string> = ["https://player.mediadelivery.net"];
const AVISO_DE_LEGENDA = "jilsonsantana-legenda";

/**
 * O aluno ligou (`true`) ou desligou (`false`) a legenda no CC do player? Só quando a
 * mensagem vem do documento que está NA MOLDURA do player desta aula (a própria janela
 * dela), servido pelo Bunny (a origem), no formato do nosso script. Qualquer outra coisa,
 * `null`: a mensagem é dado não confiável.
 *
 * A GARANTIA REAL (revisão de segurança, 07/10/2026): a origem do Bunny é a MESMA para
 * todo cliente dele — o que se confere é "um documento do Bunny na nossa moldura", não
 * "o nosso script". Por isso este canal só leva PREFERÊNCIA COSMÉTICA (a legenda): nunca
 * nada que dê acesso, mostre dado ou envolva dinheiro. O pior caso de um aviso forjado é
 * a legenda de alguém ligar ou desligar. A página também se isola de quem a abre
 * (`Cross-Origin-Opener-Policy`, em `server/src/app.ts`).
 */
export function avisoDeLegenda(evento: Pick<MessageEvent, "origin" | "source" | "data">, janela: Window | null): boolean | null {
  if (!janela || evento.source !== janela) return null;
  if (!ORIGENS_DO_PLAYER.includes(evento.origin)) return null;
  const dado: unknown = evento.data;
  if (typeof dado !== "object" || dado === null) return null;
  // Seguro: a linha acima provou que é um objeto; os dois campos são conferidos abaixo.
  const { origem, ligada } = dado as { origem?: unknown; ligada?: unknown };
  return origem === AVISO_DE_LEGENDA && typeof ligada === "boolean" ? ligada : null;
}

const PREFERENCIAS = "preferencias-do-aluno";

/** As preferências de quem está logado. Visitante: nenhuma busca, e nada lembrado. */
export function usePreferencias(logado: boolean) {
  return useQuery({ queryKey: [PREFERENCIAS], queryFn: api.getPreferencias, enabled: logado });
}

/**
 * Grava a legenda ligada ou desligada. A memória da tela muda na hora — a próxima aula
 * já abre com a escolha —, e a gravação insiste como as outras do aluno: a mesma
 * escolha repetida não muda nada no servidor (06/10/2026).
 */
export function useLembrarLegenda(): (ligada: boolean) => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (legendas: boolean) => api.salvarPreferencias({ legendas }),
    retry: deveTentarDeNovo,
    onMutate: (legendas) => {
      queryClient.setQueryData<api.PreferenciasDoAluno>([PREFERENCIAS], { legendas });
    },
    // Não gravou de vez: a tela volta a mostrar o que o servidor tem.
    onError: () => void queryClient.invalidateQueries({ queryKey: [PREFERENCIAS] }),
  });
  return mutate;
}
