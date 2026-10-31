import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { criarCodigoSchema, USOS_DA_CORTESIA, type DuracaoDoCodigo } from "@jilson/core";
import * as api from "@/lib/api";
import { mensagemDoCodigoQueFalhou, novoPedido } from "@/lib/cobranca-codigos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tipo = "cortesia" | "desconto";

/** O que dizer quando um campo não passa, pelo nome do campo. */
const AVISO_DO_CAMPO: Record<string, string> = {
  usos: `A cortesia vale de 1 a ${USOS_DA_CORTESIA} usos.`,
  codigo: "O código leva letras, números e hífen: de 4 a 30.",
  percentual: "O desconto vai de 1% a 99%.",
  validoAte: "Escolha até quando o código vale.",
};

/**
 * CRIAR UM CÓDIGO PROMOCIONAL (etapa 4.7b, passo 6d — P142), com as regras de `billing.md` → *Códigos promocionais*: a
 * CORTESIA é 100%, em todas as cobranças, com o código sorteado pelo site e um limite de usos; o DESCONTO tem data de
 * validade e não tem limite de usos. O mesmo pedido enviado de novo (a resposta que se perdeu) não cria outro código.
 */
export function CriarCodigo() {
  const [tipo, setTipo] = useState<Tipo>("cortesia");
  const [usos, setUsos] = useState("1");
  const [codigo, setCodigo] = useState("");
  const [percentual, setPercentual] = useState("");
  const [duracao, setDuracao] = useState<DuracaoDoCodigo>("uma-vez");
  const [validoAte, setValidoAte] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  // O pedido vale para ESTE conteúdo: mudou um campo, é outro pedido.
  const pedido = useRef<{ conteudo: string; numero: string } | null>(null);
  const queryClient = useQueryClient();
  const criar = useMutation({
    mutationFn: api.adminCriarCodigo,
    onSuccess: () => {
      pedido.current = null;
      setCodigo("");
      setPercentual("");
      setValidoAte("");
      setUsos("1");
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "codigos"] });
    },
  });

  const enviar = () => {
    criar.reset();
    const corpo = tipo === "cortesia" ? { tipo, usos: Number(usos), ...(validoAte ? { validoAte } : {}) } : { tipo, codigo: codigo.trim().toUpperCase(), percentual: Number(percentual), duracao, validoAte };
    const conteudo = JSON.stringify(corpo);
    if (pedido.current?.conteudo !== conteudo) pedido.current = { conteudo, numero: novoPedido() };
    const conferido = criarCodigoSchema.safeParse({ ...corpo, pedido: pedido.current.numero });
    if (!conferido.success) {
      const campo = conferido.error.issues[0]?.path[0];
      setAviso((typeof campo === "string" && AVISO_DO_CAMPO[campo]) || "Confira os campos.");
      return;
    }
    setAviso(null);
    criar.mutate(conferido.data);
  };

  const radio = "h-4 w-4 border-border/60 text-primary focus:ring-primary";
  return (
    <form
      className="max-w-md space-y-4"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        enviar();
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Tipo</legend>
        <div className="flex gap-4">
          {(["cortesia", "desconto"] as const).map((opcao) => (
            <label key={opcao} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="radio" name="tipo-do-codigo" value={opcao} checked={tipo === opcao} onChange={() => setTipo(opcao)} className={radio} />
              {opcao === "cortesia" ? "Cortesia (100%)" : "Desconto"}
            </label>
          ))}
        </div>
      </fieldset>
      {tipo === "cortesia" ? (
        <>
          <p className="text-sm text-muted-foreground">O site sorteia o código (como PRESENTE-K7Q2X9), difícil de adivinhar. Vale 100% em todas as cobranças de quem o usar.</p>
          <div className="space-y-1">
            <Label htmlFor="usos-do-codigo">Quantos usos</Label>
            <Input id="usos-do-codigo" type="number" inputMode="numeric" min={1} max={USOS_DA_CORTESIA} value={usos} onChange={(evento) => setUsos(evento.target.value)} className="w-28" />
            <p className="text-sm text-muted-foreground">Até {USOS_DA_CORTESIA}. Cada uso é uma pessoa com acesso de graça.</p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="texto-do-codigo">Código</Label>
            <Input id="texto-do-codigo" value={codigo} maxLength={30} autoComplete="off" placeholder="BLACKFRIDAY50" onChange={(evento) => setCodigo(evento.target.value.toUpperCase())} />
            <p className="text-sm text-muted-foreground">Letras, números e hífen: de 4 a 30.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="percentual-do-codigo">Desconto (%)</Label>
            <Input id="percentual-do-codigo" type="number" inputMode="numeric" min={1} max={99} value={percentual} onChange={(evento) => setPercentual(evento.target.value)} className="w-28" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Vale para</legend>
            <div className="flex flex-wrap gap-4">
              {(["uma-vez", "para-sempre"] as const).map((opcao) => (
                <label key={opcao} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="duracao-do-codigo" value={opcao} checked={duracao === opcao} onChange={() => setDuracao(opcao)} className={radio} />
                  {opcao === "uma-vez" ? "Só a primeira cobrança" : "Todas as cobranças"}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <div className="space-y-1">
        <Label htmlFor="validade-do-codigo">{tipo === "cortesia" ? "Vale até (opcional)" : "Vale até"}</Label>
        <Input id="validade-do-codigo" type="date" value={validoAte} onChange={(evento) => setValidoAte(evento.target.value)} className="w-44" />
        {tipo === "desconto" ? <p className="text-sm text-muted-foreground">Sem limite de usos: o código de desconto vale até esta data.</p> : null}
      </div>
      <Button type="submit" disabled={criar.isPending}>
        {criar.isPending ? "Criando…" : "Criar código"}
      </Button>
      {aviso ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {aviso}
        </p>
      ) : null}
      {criar.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Criado: {criar.data.detalhe}.
        </p>
      ) : null}
      {criar.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDoCodigoQueFalhou(criar.error)}
        </p>
      ) : null}
    </form>
  );
}
