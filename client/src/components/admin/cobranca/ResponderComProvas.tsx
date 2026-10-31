import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CampoDaProva } from "@jilson/core";
import * as api from "@/lib/api";
import { mensagemDaAcaoQueFalhou } from "@/lib/cobranca-acoes";
import { dataCurta } from "@/lib/cobranca-admin";
import { dinheiro } from "@/lib/cobranca-ficha";
import { Button } from "@/components/ui/button";

// RESPONDER COM PROVAS (etapa 4.7b, passo 5b — decisão do operador, 31/10/2026, P140). Admin fica em português, com o texto
// aqui (decisão do operador, 23/09/2026); o operador confere usando.

/** O nome de cada campo das provas, como o operador lê. */
const NOME_DO_CAMPO: Record<CampoDaProva, string> = {
  customer_name: "Nome",
  customer_email_address: "E-mail",
  service_date: "Tem acesso desde",
  product_description: "O que a pessoa comprou",
  access_activity_log: "O que ela usou: as aulas e as horas",
  refund_policy_disclosure: "A política de reembolso",
  uncategorized_text: "O valor, a data e os e-mails que a escola mandou",
};

/** O motivo que o banco deu, como o operador lê; o que não estiver aqui aparece como veio. */
const MOTIVO: Partial<Record<string, string>> = {
  fraudulent: "fraude (a pessoa diz que não fez a compra)",
  unrecognized: "não reconhece a cobrança",
  subscription_canceled: "diz que tinha cancelado",
  product_not_received: "diz que não recebeu",
  product_unacceptable: "diz que o produto não serve",
  duplicate: "cobrança em dobro",
  credit_not_processed: "diz que a devolução não veio",
  general: "sem motivo específico",
};

/**
 * O conserto "Responder com provas" do caso da contestação: o painel monta as provas, e o operador as confere ANTES de enviar
 * — a prévia mostra o texto EXATO que vai ao banco. Enviar não tem volta: a confirmação diz isso. Depois, a ficha mostra a
 * situação da contestação; se a escola ganhar, "Liberar de novo".
 */
export function ResponderComProvas({ casoId }: { casoId: number }) {
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();
  const provas = useQuery({ queryKey: ["admin", "cobranca", "provas", casoId], queryFn: () => api.adminProvasDaContestacao(casoId), enabled: aberto });
  const enviar = useMutation({
    mutationFn: () => api.adminResolverCaso(casoId, "enviar-provas"),
    onSuccess: () => {
      setConfirmando(false);
      setAberto(false);
      return queryClient.invalidateQueries({ queryKey: ["admin", "cobranca", "casos"] });
    },
  });

  return (
    <div className="space-y-2">
      {!aberto ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            enviar.reset();
            setAberto(true);
          }}
        >
          Responder com provas
        </Button>
      ) : provas.isPending ? (
        <p className="text-sm text-muted-foreground">Montando as provas…</p>
      ) : provas.isError ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm font-medium text-destructive">
            {mensagemDaAcaoQueFalhou(provas.error)}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void provas.refetch()}>
              Tentar de novo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <section aria-label="As provas que vão ao banco" className="space-y-3 rounded-xl border border-border/60 p-3">
          <p className="text-sm text-foreground">
            {[provas.data.prazo ? `Prazo para responder: ${dataCurta(provas.data.prazo)}` : null, `motivo: ${MOTIVO[provas.data.motivo] ?? provas.data.motivo}`, `valor: ${dinheiro(provas.data.centavos, "brl")}`].filter((parte): parte is string => parte !== null).join(" · ")}
          </p>
          <dl className="space-y-3">
            {provas.data.campos.map(({ campo, texto }) => (
              <div key={campo}>
                <dt className="text-sm font-medium text-foreground">{NOME_DO_CAMPO[campo]}</dt>
                <dd className="max-h-60 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{texto}</dd>
              </div>
            ))}
          </dl>
          {confirmando ? (
            <div role="group" aria-label="Confirmar o envio" className="space-y-2">
              <p className="text-sm text-foreground">Depois de enviar, não dá para mudar: o banco decide com estas provas. A ficha mostra a situação da contestação.</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={enviar.isPending} onClick={() => enviar.mutate()}>
                  {enviar.isPending ? "Enviando…" : "Confirmar o envio"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => setConfirmando(true)}>
                Enviar ao banco
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
                Fechar
              </Button>
            </div>
          )}
        </section>
      )}
      {enviar.isSuccess ? (
        <p role="status" className="text-sm text-foreground">
          Feito: {enviar.data.detalhe}.
        </p>
      ) : null}
      {enviar.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDaAcaoQueFalhou(enviar.error)}
        </p>
      ) : null}
    </div>
  );
}
