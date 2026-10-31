import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { codigoDoErro } from "@/lib/course-form";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A frase do que não deu. "Ocupada", aqui, é a conta (ou o e-mail) com outra operação em andamento. */
function mensagem(erro: unknown): string {
  return codigoDoErro(erro) === "Ocupada" ? "A conta está com outra operação em andamento. Tente de novo em instantes." : mensagemDaAcaoQueFalhou(erro);
}

/**
 * CORRIGIR O E-MAIL (etapa 4.7b, passo 3c — decisão do operador P121): o e-mail certo → o código vai PARA ELE → o código
 * que a pessoa recebeu → a troca. A troca encerra as sessões e a senha: a pessoa entra pelo código no e-mail novo.
 */
export function CorrigirEmail({ conta }: { conta: string }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState<{ para: string; minutos: number } | null>(null);
  const queryClient = useQueryClient();
  const fechar = () => {
    setAberto(false);
    setEmail("");
    setCodigo("");
    setEnviado(null);
    pedir.reset();
  };
  const pedir = useMutation({
    mutationFn: (para: string) => api.adminPedirCodigoDoEmail(conta, para),
    onSuccess: (feito, para) => setEnviado({ para, minutos: feito.minutos }),
  });
  const trocar = useMutation({
    mutationFn: (dados: { para: string; codigo: string }) => api.adminCorrigirEmail(conta, dados.para, dados.codigo),
    onSuccess: () => {
      fechar();
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "ficha"] });
    },
  });

  if (!aberto) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            trocar.reset();
            setAberto(true);
          }}
        >
          Corrigir o e-mail
        </Button>
        {trocar.isSuccess ? <p role="status" className="text-sm text-foreground">E-mail corrigido para {trocar.data.email}. As sessões e a senha antigas foram encerradas.</p> : null}
      </div>
    );
  }

  if (!enviado) {
    return (
      <form
        className="max-w-md space-y-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          const para = email.trim().toLowerCase();
          if (para) pedir.mutate(para);
        }}
      >
        <Label htmlFor="email-certo">O e-mail certo</Label>
        <p className="text-sm text-muted-foreground">Antes, confira que quem pede é quem pagou (o CPF, o recibo). O código vai para o e-mail certo, e a troca só vale com ele.</p>
        <div className="flex flex-wrap gap-2">
          <Input id="email-certo" type="email" value={email} maxLength={254} autoComplete="off" onChange={(evento) => setEmail(evento.target.value)} />
          <Button type="submit" disabled={pedir.isPending || !email.trim()}>
            {pedir.isPending ? "Enviando…" : "Enviar o código"}
          </Button>
          <Button type="button" variant="ghost" onClick={fechar}>
            Cancelar
          </Button>
        </div>
        {pedir.isError ? <p role="alert" className="text-sm font-medium text-destructive">{mensagem(pedir.error)}</p> : null}
      </form>
    );
  }

  return (
    <form
      className="max-w-md space-y-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (codigo.trim()) trocar.mutate({ para: enviado.para, codigo: codigo.trim() });
      }}
    >
      <p role="status" className="text-sm text-foreground">
        Código enviado para {enviado.para}. Ele vale por {enviado.minutos} minutos.
      </p>
      <Label htmlFor="codigo-do-email">O código que a pessoa recebeu</Label>
      <p className="text-sm text-muted-foreground">A troca encerra as sessões da pessoa e apaga a senha: ela entra com o código no e-mail novo.</p>
      <div className="flex flex-wrap gap-2">
        <Input id="codigo-do-email" inputMode="numeric" value={codigo} maxLength={6} autoComplete="off" onChange={(evento) => setCodigo(evento.target.value)} />
        <Button type="submit" disabled={trocar.isPending || !codigo.trim()}>
          {trocar.isPending ? "Trocando…" : "Confirmar a troca"}
        </Button>
        <Button type="button" variant="ghost" onClick={fechar}>
          Cancelar
        </Button>
      </div>
      {trocar.isError ? <p role="alert" className="text-sm font-medium text-destructive">{mensagem(trocar.error)}</p> : null}
    </form>
  );
}
