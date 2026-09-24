import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useT } from "@/lib/language";
import { iniciais } from "@/components/nav/SecondaryNav";

type Usuario = { name?: string | null; email?: string | null; image?: string | null };

/**
 * O menu da conta, no canto superior direito — aluno e admin (decisão do
 * operador, 24/09/2026, a partir da Udemy, da Amazon, do LinkedIn e da Mosh).
 * A foto abre um painel com nome, e-mail, Minha conta, Faturamento e assinatura
 * e Sair.
 *
 * É um DISCLOSURE (botão que mostra/esconde um painel), e não um `role="menu"`:
 * menu ARIA promete navegação por setas, que isto não tem. Sem biblioteca e sem
 * a Popover API: o público inclui aparelho antigo, e um painel posicionado por
 * CSS comum funciona em qualquer navegador (guia modern-web-guidance →
 * resilient-context-menus-and-nested-dropdowns, "legacy fallback").
 *
 * "Faturamento e assinatura" aponta para uma tela que só nasce na Fase 4 —
 * decisão do operador: o link entra antes da página.
 */
export function AccountMenu({ usuario, onSignOut }: { usuario?: Usuario; onSignOut: () => void }) {
  const t = useT();
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

  const fechar = () => setAberto(false);

  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        aria-label={t.nav.abrirMenuConta}
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((v) => !v)}
        className="flex size-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar usuario={usuario} tamanho="size-9" />
      </button>

      {aberto && (
        <div
          id={idPainel}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card py-2 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-2">
            <Avatar usuario={usuario} tamanho="size-12" />
            <div className="min-w-0">
              {usuario?.name && <p className="truncate font-semibold text-foreground">{usuario.name}</p>}
              {usuario?.email && <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>}
            </div>
          </div>
          <ul className="py-2">
            <li>
              <Link to="/conta" onClick={fechar} className="block px-4 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                {t.nav.minhaConta}
              </Link>
            </li>
            <li>
              <Link to="/conta/faturamento" onClick={fechar} className="block px-4 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                {t.nav.faturamento}
              </Link>
            </li>
          </ul>
          <div className="border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                fechar();
                onSignOut();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t.nav.sair}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A foto, ou as iniciais quando não há foto. `alt` vazio: o nome está ao lado (ou no rótulo do botão). */
function Avatar({ usuario, tamanho }: { usuario?: Usuario; tamanho: "size-9" | "size-12" }) {
  const classe = `${tamanho} overflow-hidden rounded-full border border-border bg-surface-alt`;
  if (usuario?.image) {
    return <img src={usuario.image} alt="" className={`${classe} object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${classe} flex items-center justify-center font-display text-sm font-semibold text-muted-foreground`}>
      {iniciais(usuario?.name, usuario?.email)}
    </span>
  );
}
