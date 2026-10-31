import { Link } from "react-router";
import type { LinhaDoRegistro } from "@jilson/core";
import { QUEM, quando, textoDaLinha } from "@/lib/cobranca-registro";
import { enderecoDaFicha } from "@/lib/cobranca-ficha";

type Props = { linhas: LinhaDoRegistro[]; /** Na escola inteira, cada linha diz (e leva à ficha de) quem é o aluno. */ comAluno?: boolean };

/** As linhas do registro da cobrança: quando, quem fez e o quê (etapa 4.7b, passo 1f). */
export function LinhasDoRegistro({ linhas, comAluno = false }: Props) {
  if (linhas.length === 0) return <p className="text-muted-foreground">Nada registrado ainda.</p>;
  return (
    <ul aria-label="O que aconteceu" className="divide-y divide-border rounded-2xl border border-border/60">
      {linhas.map((linha) => {
        const ficha = comAluno && linha.aluno ? enderecoDaFicha({ conta: linha.aluno.id, assinatura: null }) : null;
        return (
          <li key={linha.id} className="space-y-1 px-5 py-3">
            <p className="text-sm text-muted-foreground">
              {quando(linha.em)} · {QUEM[linha.quem]}
            </p>
            <p className="text-foreground">{textoDaLinha(linha)}</p>
            {ficha && linha.aluno ? (
              <Link to={ficha} className="text-sm text-primary underline-offset-4 hover:underline">
                {linha.aluno.nome ?? linha.aluno.email}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
