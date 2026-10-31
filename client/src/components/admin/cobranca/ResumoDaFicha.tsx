import type { FichaDaCobranca } from "@jilson/core";
import { dataCurta } from "@/lib/cobranca-admin";
import { textoDoEmail } from "@/lib/cobranca-ficha";

type Props = { ficha: FichaDaCobranca };

/** O cartão que a Stripe cobra, o CPF ou CNPJ (escondido) e os e-mails da cobrança (etapa 4.7b, passo 1d). */
export function ResumoDaFicha({ ficha }: Props) {
  const { cartao, documento, emails, stripeIndisponivel } = ficha;
  const mes = cartao ? String(cartao.mes).padStart(2, "0") : "";
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Cartão</dt>
          <dd className="text-foreground">{stripeIndisponivel ? "A Stripe não respondeu." : cartao ? `${cartao.bandeira} •••• ${cartao.final} · vence ${mes}/${cartao.ano}` : "Nenhum cartão salvo."}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">CPF ou CNPJ</dt>
          <dd className="text-foreground">{stripeIndisponivel ? "A Stripe não respondeu." : (documento ?? "Não informado.")}</dd>
        </div>
      </dl>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">E-mails da cobrança</h3>
        {emails.length === 0 ? (
          <p className="text-muted-foreground">Nenhum e-mail da cobrança para esta pessoa.</p>
        ) : (
          <ul aria-label="E-mails da cobrança" className="space-y-1">
            {emails.map((email) => (
              <li key={`${email.tipo}-${email.em}`} className="text-foreground">
                {textoDoEmail(email.tipo)} · {email.saiu ? `saiu em ${dataCurta(email.em)}` : "não saiu"}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
