import { lazy, Suspense, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Bold, Italic, List, ListOrdered, type LucideIcon } from "lucide-react";
import { envolver, prefixarLinhas, type Edicao } from "@/lib/markdown-toolbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Texto em Markdown, como o GitHub: botões em cima do campo e a aba Visualizar
// (decisão do operador, 27/09/2026). O texto é guardado como está. Serve à
// descrição do curso, ao texto da aula de texto (Bloco E, etapa 2) e às mensagens
// do curso (04/10/2026): cada formulário tem um campo de texto com um desses nomes.
type NomeDoCampo = "description" | "content" | "welcomeMessage" | "congratsMessage";
type CamposDeTexto = Record<NomeDoCampo, string>;

// A peça que desenha o Markdown (~37 KB compactados) só baixa quando alguém abre
// Visualizar. Importada direto, entraria no pacote que TODO aluno baixa, por uma
// prévia que só o admin usa (medido em 27/09/2026: 194 → 231 KB).
const MarkdownText = lazy(() =>
  import("@/components/content/MarkdownText").then((m) => ({ default: m.MarkdownText })),
);

type Aba = "escrever" | "visualizar";
type Editar = (texto: string, inicio: number, fim: number) => Edicao;

const BOTOES: { rotulo: string; Icone: LucideIcon; editar: Editar }[] = [
  { rotulo: "Negrito", Icone: Bold, editar: (t, i, f) => envolver(t, i, f, "**") },
  { rotulo: "Itálico", Icone: Italic, editar: (t, i, f) => envolver(t, i, f, "_") },
  { rotulo: "Lista", Icone: List, editar: (t, i, f) => prefixarLinhas(t, i, f, "lista") },
  {
    rotulo: "Lista numerada",
    Icone: ListOrdered,
    editar: (t, i, f) => prefixarLinhas(t, i, f, "numerada"),
  },
];

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "escrever", rotulo: "Escrever" },
  { valor: "visualizar", rotulo: "Visualizar" },
];

export function MarkdownField({
  id,
  name,
  maxLength,
  describedBy,
  rotuloDoModo = "Modo de edição da descrição",
}: {
  id: string;
  name: NomeDoCampo;
  maxLength: number;
  describedBy?: string;
  /** O nome das abas Escrever/Visualizar para o leitor de tela. */
  rotuloDoModo?: string;
}) {
  // O formulário de quem usa tem o campo `name`; o tipo aqui só precisa dele.
  const { register, setValue, control } = useFormContext<CamposDeTexto>();
  const valor = useWatch({ control, name });
  const [aba, setAba] = useState<Aba>("escrever");
  const campo = useRef<HTMLTextAreaElement | null>(null);
  const { ref, ...registro } = register(name);

  function aplicar(editar: Editar) {
    const el = campo.current;
    if (!el) return;
    const r = editar(el.value, el.selectionStart, el.selectionEnd);
    setValue(name, r.texto, { shouldDirty: true, shouldValidate: true });
    el.focus();
    el.setSelectionRange(r.inicio, r.fim);
  }

  function mudarAbaPeloTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const outra = aba === "escrever" ? "visualizar" : "escrever";
    setAba(outra);
    document.getElementById(`${id}-aba-${outra}`)?.focus();
  }

  return (
    <div className="rounded-md border border-input">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-input px-2 py-1">
        <div
          role="tablist"
          aria-label={rotuloDoModo}
          className="flex gap-1"
          onKeyDown={mudarAbaPeloTeclado}
        >
          {ABAS.map((a) => (
            <button
              key={a.valor}
              type="button"
              role="tab"
              id={`${id}-aba-${a.valor}`}
              aria-selected={aba === a.valor}
              aria-controls={`${id}-painel-${a.valor}`}
              tabIndex={aba === a.valor ? 0 : -1}
              onClick={() => setAba(a.valor)}
              className={cn(
                "rounded px-3 py-1.5 text-sm",
                aba === a.valor ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
        {aba === "escrever" && (
          <div className="flex gap-1">
            {BOTOES.map(({ rotulo, Icone, editar }) => (
              <Button
                key={rotulo}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={rotulo}
                title={rotulo}
                onClick={() => aplicar(editar)}
              >
                <Icone className="h-4 w-4" aria-hidden />
              </Button>
            ))}
          </div>
        )}
      </div>

      <div
        id={`${id}-painel-escrever`}
        role="tabpanel"
        aria-labelledby={`${id}-aba-escrever`}
        hidden={aba !== "escrever"}
      >
        <Textarea
          id={id}
          rows={8}
          maxLength={maxLength}
          aria-describedby={describedBy}
          className="min-h-[180px] rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          {...registro}
          ref={(el) => {
            ref(el);
            campo.current = el;
          }}
        />
      </div>
      <div
        id={`${id}-painel-visualizar`}
        role="tabpanel"
        aria-labelledby={`${id}-aba-visualizar`}
        hidden={aba !== "visualizar"}
        className="min-h-[180px] px-3 py-2"
      >
        {aba === "visualizar" &&
          (valor.trim() === "" ? (
            <p className="text-sm text-muted-foreground">Nada para visualizar ainda.</p>
          ) : (
            <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
              <MarkdownText texto={valor} />
            </Suspense>
          ))}
      </div>
    </div>
  );
}
