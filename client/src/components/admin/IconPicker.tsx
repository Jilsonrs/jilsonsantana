import { useState, useRef, useEffect, useId, useMemo, type KeyboardEvent } from "react";
import { useFormContext } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseFormValues } from "@/lib/course-form";
import { CATALOGO, LIMITE_DE_RESULTADOS, buscarIcones, desenhoDoIcone } from "./catalogo-de-icones";
import { nomeDoIcone } from "./nomes-dos-icones";

const TOTAL = CATALOGO.length.toLocaleString("pt-BR");

/**
 * O SELETOR DE ÍCONE de um Destaque (desenho do Antigravity, 30/09/2026; nomes em
 * português, 03/10; busca entre TODOS os ícones do Lucide, 05/10 — decisões do
 * operador). Grava o nome técnico; mostra o nome em português. Pelo teclado:
 * Enter abre e o cursor já está na busca; setas andam na lista; Enter escolhe;
 * Esc fecha e devolve o foco ao botão. Carregado por `lazy()`: traz todos os
 * desenhos do Lucide, que o aluno nunca baixa.
 */
export default function IconPicker({ index, rotuloId }: { index: number; rotuloId: string }) {
  const { register, watch, setValue } = useFormContext<CourseFormValues>();
  const [isOpen, setIsOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const botaoId = useId();
  const listaId = useId();
  const opcaoId = (n: number) => `${listaId}-${n}`;

  const currentIconKey = watch(`highlights.${index}.icon`);
  const CurrentIcon = currentIconKey ? desenhoDoIcone(currentIconKey) : null;

  const resultados = useMemo(() => buscarIcones(busca), [busca]);
  const visiveis = resultados.slice(0, LIMITE_DE_RESULTADOS);

  // Efeito: fechar ao clicar fora é ouvir o documento inteiro, fora do React.
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      // Seguro: o alvo de um clique no documento é sempre um nó.
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function abrir() {
    setBusca("");
    // Abre com o ícone salvo já marcado, se ele estiver entre os sugeridos.
    setAtivo(Math.max(0, buscarIcones("").findIndex((i) => i.token === currentIconKey)));
    setIsOpen(true);
  }

  function fechar() {
    setIsOpen(false);
    botaoRef.current?.focus();
  }

  function escolher(token: string) {
    setValue(`highlights.${index}.icon`, token, { shouldDirty: true });
    fechar();
  }

  function mover(para: number) {
    const n = Math.min(Math.max(para, 0), visiveis.length - 1);
    setAtivo(n);
    document.getElementById(opcaoId(n))?.scrollIntoView?.({ block: "nearest" });
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") mover(ativo + 1);
    else if (e.key === "ArrowUp") mover(ativo - 1);
    else if (e.key === "Enter") {
      // Sem isto, o Enter enviaria o formulário do curso.
      e.preventDefault();
      if (visiveis[ativo]) escolher(visiveis[ativo].token);
      return;
    } else return;
    e.preventDefault();
  }

  return (
    <div
      className="relative"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && isOpen) {
          e.stopPropagation();
          fechar();
        }
      }}
    >
      <input type="hidden" {...register(`highlights.${index}.icon`)} />

      <Button
        ref={botaoRef}
        id={botaoId}
        type="button"
        variant="outline"
        aria-labelledby={`${rotuloId} ${botaoId}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full justify-start text-left font-normal flex items-center gap-2"
        onClick={() => (isOpen ? fechar() : abrir())}
      >
        {currentIconKey ? (
          <>
            {CurrentIcon && <CurrentIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{nomeDoIcone(currentIconKey)}</span>
          </>
        ) : (
          <span className="text-muted-foreground truncate">Selecione...</span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-12 left-0 z-50 w-72 rounded-md border bg-popover shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <div className="border-b p-2">
            <input
              // O cursor vai direto para a busca ao abrir: é o pedido.
              autoFocus
              type="text"
              role="combobox"
              aria-label="Buscar ícone"
              aria-expanded="true"
              aria-controls={listaId}
              aria-autocomplete="list"
              aria-activedescendant={visiveis[ativo] ? opcaoId(ativo) : undefined}
              placeholder="Buscar (ex.: caixa, construção)"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={aoTeclar}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {visiveis.length === 0 ? (
            <p role="status" className="p-3 text-sm text-muted-foreground">
              Nenhum ícone encontrado para “{busca.trim()}”.
            </p>
          ) : (
            <ul id={listaId} role="listbox" aria-labelledby={rotuloId} className="max-h-72 overflow-y-auto p-1">
              {visiveis.map(({ token, nome, Icone }, n) => (
                <li
                  key={token}
                  id={opcaoId(n)}
                  role="option"
                  aria-selected={n === ativo}
                  onMouseEnter={() => setAtivo(n)}
                  onClick={() => escolher(token)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                    n === ativo && "bg-accent text-accent-foreground",
                    token === currentIconKey && "text-primary",
                  )}
                >
                  <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{nome}</span>
                  {token === currentIconKey && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </li>
              ))}
            </ul>
          )}

          {(!busca.trim() || resultados.length > LIMITE_DE_RESULTADOS) && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              {!busca.trim()
                ? `Sugeridos. Digite para buscar entre os ${TOTAL} ícones.`
                : `Mostrando ${LIMITE_DE_RESULTADOS} de ${resultados.length}. Continue digitando para filtrar.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
