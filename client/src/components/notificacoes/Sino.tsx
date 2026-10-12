import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useT } from "@/lib/language";
import {
  haQuantoTempo,
  numeroDoSino,
  previaDoTexto,
  tituloDaNotificacao,
  useMarcarLida,
  useNotificacoes,
} from "@/lib/notificacoes";

/** Quantas cabem na lista do sino; o resto fica na página "Ver todas". */
export const NO_SINO = 5;
export const ROTA_DAS_NOTIFICACOES = "/aluno/notificacoes";

/**
 * O SINO DE NOTIFICAÇÕES, ao lado da foto (Bloco E, etapa 4 — decisões do
 * operador, 04/10/2026, a partir da Udemy, do Bunny e do YouTube): o número de
 * não lidas sobre o sino, e nada mais interrompe a aula. Clicar abre a lista das
 * mais recentes, com "Marcar todas como lidas" e "Ver todas".
 *
 * É um DISCLOSURE, como o menu da conta (`AccountMenu`): botão que mostra e
 * esconde um painel, que fecha com Esc e com clique fora.
 */
export function Sino() {
  const t = useT();
  const { data, isLoading, isError } = useNotificacoes();
  const { mutate: marcar } = useMarcarLida();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idPainel = useId();

  // Efeito, e não estado derivado: clique fora e Esc são eventos do DOCUMENTO,
  // fora da árvore do React — e só precisam existir enquanto o painel está aberto.
  useEffect(() => {
    if (!aberto) return;
    function cliqueFora(e: PointerEvent) {
      if (raiz.current && e.target instanceof Node && !raiz.current.contains(e.target)) setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    }
    document.addEventListener("pointerdown", cliqueFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", cliqueFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const naoLidas = data?.naoLidas ?? 0;
  const numero = numeroDoSino(naoLidas);
  const rotulo =
    naoLidas === 0
      ? t.notificacoes.titulo
      : naoLidas === 1
        ? t.notificacoes.rotuloComUmaNaoLida
        : t.notificacoes.rotuloComNaoLidas.replace("{n}", String(naoLidas));
  const itens = (data?.itens ?? []).slice(0, NO_SINO);

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((v) => !v)}
        className="relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" aria-hidden="true" />
        {numero && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm"
          >
            {numero}
          </span>
        )}
      </button>

      {aberto && (
        <div id={idPainel} className="absolute right-0 top-full z-50 pt-2">
          <div className="w-80 sm:w-96 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
            <h2 className="border-b border-border/40 px-5 py-3.5 text-base font-semibold tracking-tight text-foreground">{t.notificacoes.titulo}</h2>

            {isLoading && <p className="px-5 py-6 text-sm text-muted-foreground">{t.comum.carregando}</p>}
            {isError && (
              <p role="alert" className="px-5 py-6 text-sm text-destructive">
                {t.notificacoes.erro}
              </p>
            )}
            {data && itens.length === 0 && (
              <div className="flex flex-col items-center justify-center px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">{t.notificacoes.vazio}</p>
              </div>
            )}

            {itens.length > 0 && (
              <ul className="max-h-96 divide-y divide-border/40 overflow-y-auto">
                {itens.map((n) => (
                  <li key={n.id}>
                    <Link
                      // A mensagem completa; abrir é o que a marca como lida (06/10/2026).
                      to={`${ROTA_DAS_NOTIFICACOES}/${n.id}`}
                      onClick={() => setAberto(false)}
                      className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-primary"}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {tituloDaNotificacao(n, t)}
                          {!n.lida && <span className="sr-only"> ({t.notificacoes.naoLida})</span>}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{previaDoTexto(n.texto)}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{haQuantoTempo(n.criadaEm)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-5 py-3">
              <button
                type="button"
                onClick={() => marcar(undefined)}
                disabled={naoLidas === 0}
                className="text-sm font-medium text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
              >
                {t.notificacoes.marcarTodas}
              </button>
              <Link
                to={ROTA_DAS_NOTIFICACOES}
                onClick={() => setAberto(false)}
                className="rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                {t.notificacoes.verTodas}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
