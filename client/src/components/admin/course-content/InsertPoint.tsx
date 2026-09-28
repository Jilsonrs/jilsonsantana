import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type OpcaoDeInsercao = {
  valor: string;
  rotulo: string;
  /** Ainda não existe (o quiz): aparece como texto EM BREVE, sem ação. */
  emBreve?: true;
};

/**
 * O "+" ENTRE DOIS ITENS (Bloco E, etapa 2 — decisão do operador, 27/09/2026):
 * insere aula ou módulo naquela posição.
 *
 * Aparece ao passar o mouse E ao receber o foco do teclado. Fica escondido por
 * OPACIDADE, nunca por `hidden`: o botão continua na ordem do Tab e na árvore de
 * acessibilidade (GEMINI.md, regra 3), senão quem navega pelo teclado não o acha.
 *
 * Com uma opção só (o módulo), vai direto para o título.
 */
export function InsertPoint({
  rotulo,
  opcoes,
  aoInserir,
}: {
  /** O nome do botão para o leitor de tela, com o lugar ("Inserir depois de Fórmulas"). */
  rotulo: string;
  opcoes: OpcaoDeInsercao[];
  aoInserir: (valor: string, titulo: string) => Promise<unknown>;
}) {
  const [escolhida, setEscolhida] = useState<OpcaoDeInsercao | null>(null);
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");

  const inserir = useMutation({
    mutationFn: ({ valor, texto }: { valor: string; texto: string }) => aoInserir(valor, texto),
    onSuccess: fechar,
  });

  function fechar() {
    setAberto(false);
    setEscolhida(null);
    setTitulo("");
  }

  function abrir() {
    setAberto(true);
    const ativas = opcoes.filter((o) => !o.emBreve);
    if (opcoes.length === 1 && ativas.length === 1) setEscolhida(ativas[0]);
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (escolhida && titulo.trim()) inserir.mutate({ valor: escolhida.valor, texto: titulo.trim() });
  }

  if (!aberto) {
    return (
      <div className="group relative flex h-6 items-center justify-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-px bg-border opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
        />
        <button
          type="button"
          aria-label={rotulo}
          onClick={abrir}
          className="relative z-10 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="my-2 space-y-3 rounded-lg border border-dashed border-border p-3">
      {!escolhida ? (
        <div className="flex flex-wrap items-center gap-2">
          {opcoes.map((o) =>
            o.emBreve ? (
              <span key={o.valor} aria-disabled="true" className="flex items-center gap-2 px-2 text-sm text-muted-foreground/60">
                {o.rotulo}
                <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.08em]">
                  EM BREVE
                </span>
              </span>
            ) : (
              <Button key={o.valor} type="button" variant="outline" size="sm" onClick={() => setEscolhida(o)}>
                {o.rotulo}
              </Button>
            ),
          )}
          <Button type="button" variant="ghost" size="sm" onClick={fechar}>
            Cancelar
          </Button>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-wrap items-center gap-2">
          <Input
            autoFocus
            aria-label={`Título: ${escolhida.rotulo}`}
            placeholder={`Título: ${escolhida.rotulo}`}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" size="sm" disabled={!titulo.trim() || inserir.isPending}>
            Criar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={fechar}>
            Cancelar
          </Button>
        </form>
      )}
      {inserir.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível inserir. Tente de novo.
        </p>
      )}
    </div>
  );
}
