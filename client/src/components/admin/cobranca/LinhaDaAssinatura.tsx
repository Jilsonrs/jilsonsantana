import type { ReactNode } from "react";
import { Link } from "react-router";
import type { AssinaturaDaLista } from "@jilson/core";
import { detalhesDaLinha, textoDaSituacao } from "@/lib/cobranca-admin";
import { enderecoDaFicha } from "@/lib/cobranca-ficha";

type Props = { assinatura: AssinaturaDaLista; /** Na lista, o nome leva à ficha; na própria ficha, não. */ comLink?: boolean; /** O que vem embaixo (as ações, na ficha). */ children?: ReactNode };

/** Uma assinatura numa linha: quem, a situação com a data, o plano, o "pago até", o código e a marca de teste. */
export function LinhaDaAssinatura({ assinatura, comLink = false, children }: Props) {
  const quem = assinatura.aluno ? (assinatura.aluno.nome ?? assinatura.aluno.email) : "Sem conta na escola";
  const endereco = comLink ? enderecoDaFicha({ conta: assinatura.aluno?.id ?? null, assinatura: assinatura.aluno ? null : assinatura.id }) : null;
  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {endereco ? (
          <Link to={endereco} className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
            {quem}
          </Link>
        ) : (
          <p className="truncate font-medium text-foreground">{quem}</p>
        )}
        {assinatura.aluno?.nome ? <p className="truncate text-sm text-muted-foreground">{assinatura.aluno.email}</p> : null}
      </div>
      <div className="text-sm sm:text-right">
        <p className="text-foreground">{textoDaSituacao(assinatura)}</p>
        <p className="text-muted-foreground">{detalhesDaLinha(assinatura)}</p>
      </div>
      </div>
      {children}
    </li>
  );
}
