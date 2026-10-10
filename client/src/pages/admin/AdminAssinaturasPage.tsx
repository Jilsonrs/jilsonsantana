import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { sincronizarContaSchema, type SincronizarContaInput } from "@jilson/core";
import * as api from "@/lib/api";
import { descricaoDaConferida, mensagemDeErroDaSincronia } from "@/lib/sincronia";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/**
 * ADMIN → ASSINATURAS (Fase 4, etapa 4.4 — item de menu decidido pelo operador, 10/10/2026):
 * conferir na Stripe a assinatura de UM aluno e acertar o acesso dele. É a recuperação de
 * quando um aviso da Stripe se perde: quem pagou e continua trancado, ou quem a Stripe já
 * encerrou e continua com acesso. A tela diz só DE QUEM (o e-mail); o que conferir e o que
 * gravar é o servidor que decide. Sem tentar de novo sozinha: quem repete é o operador.
 * Admin: texto em português, na tela (RASCUNHO do agente, a revisar pelo operador).
 */
export function AdminAssinaturasPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SincronizarContaInput>({ resolver: zodResolver(sincronizarContaSchema) });
  const conferir = useMutation({ mutationFn: (dados: SincronizarContaInput) => api.adminSincronizarConta(dados.email) });
  const resultado = conferir.data;

  return (
    <PageContainer>
      <PageHeader title="Assinaturas" description="Confira na Stripe a assinatura de um aluno e acerte o acesso dele." />

      <div className="space-y-12">
        <PageSection
          title="Conferir na Stripe"
          description="Use quando alguém pagou e continua sem acesso, ou quando a assinatura acabou e a pessoa continua com acesso. O site busca na Stripe o que vale agora e acerta a conta."
        >
          <Card className="max-w-3xl">
            <CardContent className="space-y-6 pt-6">
              <form noValidate onSubmit={handleSubmit((dados) => conferir.mutate(dados))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-do-aluno">E-mail do aluno</Label>
                  <Input
                    id="email-do-aluno"
                    type="email"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-do-aluno-erro" : undefined}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p id="email-do-aluno-erro" role="alert" className="text-sm font-medium text-destructive">
                      Informe um e-mail válido.
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={conferir.isPending}>
                  {conferir.isPending ? "Conferindo…" : "Conferir na Stripe"}
                </Button>
              </form>

              {conferir.isError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {mensagemDeErroDaSincronia(conferir.error)}
                </p>
              )}

              {resultado && (
                <div role="status" className="space-y-4 border-t border-border pt-6">
                  <p className="font-medium text-foreground">{resultado.temAcesso ? "Esta conta tem acesso." : "Esta conta está sem acesso."}</p>
                  {resultado.assinaturas.length === 0 ? (
                    <p className="text-muted-foreground">Esta conta não tem nenhuma assinatura na Stripe.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-2xl border border-border/60">
                      {resultado.assinaturas.map((a) => (
                        <li key={a.id} className="space-y-1 px-5 py-4">
                          <p className="break-all font-mono text-sm text-muted-foreground">{a.id}</p>
                          <p className="text-foreground">{descricaoDaConferida(a)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </PageContainer>
  );
}
