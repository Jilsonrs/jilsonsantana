import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import type { FichaDaCobranca } from "@jilson/core";
import { Button } from "@/components/ui/button";

const ROTULO: Record<keyof FichaDaCobranca["links"], string> = { trocarCartao: "Trocar o cartão (paga a cobrança atrasada)", reativar: "Reativar a assinatura", pagarComPix: "Pagar a cobrança atrasada com Pix" };

/** Os links para mandar ao aluno (etapa 4.7b, passo 3a): entrar e seguir para a tela certa — os mesmos dos e-mails da cobrança. */
export function LinksParaOAluno({ links, conta }: { links: FichaDaCobranca["links"]; /** Com conta, cada link também sai por e-mail (passo 3b). */ conta: string | null }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const enviar = useMutation({ mutationFn: (link: keyof FichaDaCobranca["links"]) => api.adminEnviarLink(conta ?? "", link) });
  const itens = (Object.keys(ROTULO) as (keyof FichaDaCobranca["links"])[]).flatMap((chave) => {
    const link = links[chave];
    return link ? [{ chave, link }] : [];
  });
  if (itens.length === 0) return <p className="text-muted-foreground">Nenhum link disponível neste ambiente.</p>;
  return (
    <ul aria-label="Links para o aluno" className="space-y-3">
      {itens.map(({ chave, link }) => (
        <li key={chave} className="space-y-1">
          <p className="text-sm text-foreground">{ROTULO[chave]}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all text-xs text-muted-foreground">{link}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFalhou(false);
                navigator.clipboard.writeText(link).then(
                  () => setCopiado(chave),
                  () => setFalhou(true),
                );
              }}
            >
              {copiado === chave ? "Copiado" : "Copiar"}
            </Button>
            {conta ? (
              <Button type="button" size="sm" variant="outline" disabled={enviar.isPending} onClick={() => enviar.mutate(chave)}>
                Enviar por e-mail
              </Button>
            ) : null}
          </div>
        </li>
      ))}
      {enviar.isSuccess ? (
        <li role="status" className="text-sm text-foreground">
          Feito: {enviar.data.detalhe}.
        </li>
      ) : null}
      {enviar.isError ? (
        <li role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(enviar.error)}
        </li>
      ) : null}
      {falhou ? (
        <li role="alert" className="text-sm font-medium text-destructive">
          Não foi possível copiar. Selecione o link e copie à mão.
        </li>
      ) : null}
    </ul>
  );
}
