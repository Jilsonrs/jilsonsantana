import { useState } from "react";
import type { FichaDaCobranca } from "@jilson/core";
import { Button } from "@/components/ui/button";

const ROTULO: Record<keyof FichaDaCobranca["links"], string> = { trocarCartao: "Trocar o cartão (paga a cobrança atrasada)", reativar: "Reativar a assinatura", pagarComPix: "Pagar a cobrança atrasada com Pix" };

/** Os links para mandar ao aluno (etapa 4.7b, passo 3a): entrar e seguir para a tela certa — os mesmos dos e-mails da cobrança. */
export function LinksParaOAluno({ links }: { links: FichaDaCobranca["links"] }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
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
          </div>
        </li>
      ))}
      {falhou ? (
        <li role="alert" className="text-sm font-medium text-destructive">
          Não foi possível copiar. Selecione o link e copie à mão.
        </li>
      ) : null}
    </ul>
  );
}
