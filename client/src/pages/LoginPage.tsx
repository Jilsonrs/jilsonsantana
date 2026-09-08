import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@jilson/core";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Depois de entrar, o aluno cai na HOME DELE — não na conta (destino de tarefa)
// nem no catálogo (uma seção da home, não o começo). A home cresce para virar
// painel de estudo; este é o único lugar que aponta para ela.
const POS_LOGIN = "/inicio";

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Already signed in -> skip the form.
  if (!isPending && session) {
    return <Navigate to={POS_LOGIN} replace />;
  }

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        // 401 = bad credentials. Anything else (origin/CSRF, network, server) is
        // a different failure and must not be reported as "wrong password".
        if (error.status === 401) {
          setFormError("E-mail ou senha incorretos.");
        } else {
          console.error("Falha no login:", error);
          setFormError("Não foi possível entrar agora. Tente novamente.");
        }
        return;
      }
    } catch (err) {
      // `signIn.email` normalmente RESOLVE com `{ error }`, mas numa queda de
      // rede ela pode REJEITAR. Sem este catch a rejeição escapava do handler:
      // nenhuma mensagem aparecia e o botão ficava preso em "Entrando…", sem a
      // pessoa saber o que houve. Achado por teste, não por leitura.
      console.error("Falha no login:", err);
      setFormError("Não foi possível entrar agora. Tente novamente.");
      return;
    }
    navigate(POS_LOGIN, { replace: true });
  }

  // Numa credencial recusada o servidor diz "e-mail OU senha incorretos" — ele
  // não revela qual, de propósito (é o que impede alguém de descobrir quais
  // e-mails têm conta). Como não dá para saber qual campo está errado, os DOIS
  // são marcados; marcar só um seria uma dica errada.
  const emailInvalid = Boolean(errors.email) || Boolean(formError);
  const passwordInvalid = Boolean(errors.password) || Boolean(formError);

  return (
    <div className="relative overflow-hidden">
      {/* "Luz de IA" (§6): gradiente radial azul no canto esquerdo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 size-[800px] bg-[radial-gradient(circle,hsl(var(--primary)/0.05)_0%,transparent_70%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-[440px] px-6 py-16">
        <div className="mb-10 flex flex-col items-center text-center">
          <h1 className="text-[2.5rem] font-semibold leading-none tracking-tight">
            Acesso <span className="font-emphasis italic text-primary">Seguro</span>.
          </h1>
          <p className="mt-4 font-mono text-[0.75rem] tracking-[0.1em] text-muted-foreground uppercase">
            [ Área do Aluno ]
          </p>
        </div>

        <Card className="relative overflow-hidden border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.03),0_20px_40px_rgba(35,143,232,0.03)] sm:rounded-2xl">
          {/* Fio de luz no topo do card (accent) */}
          <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-primary to-transparent" />
          
          <CardHeader className="pt-8 pb-4">
            <CardTitle className="sr-only">Entrar</CardTitle>
          </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className={emailInvalid ? "text-destructive" : undefined}
              >
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={emailInvalid}
                aria-describedby={
                  errors.email ? "email-error" : formError ? "form-error" : undefined
                }
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-[13px] text-destructive/90 flex items-center gap-2 mt-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]"></span>
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className={passwordInvalid ? "text-destructive" : undefined}
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={passwordInvalid}
                aria-describedby={
                  errors.password
                    ? "password-error"
                    : formError
                      ? "form-error"
                      : undefined
                }
                {...register("password")}
              />
              {errors.password && (
                <p id="password-error" className="text-[13px] text-destructive/90 flex items-center gap-2 mt-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]"></span>
                  {errors.password.message}
                </p>
              )}
            </div>
            {/* `role="alert"` faz o leitor de tela ANUNCIAR a falha assim que
                ela aparece. Sem isso, quem não vê a tela só descobre que o login
                falhou ao tentar de novo. */}
            {formError && (
              <div id="form-error" role="alert" className="flex items-center gap-2.5 mt-2 p-3 border border-destructive/20 rounded-lg bg-destructive/5 text-[13px] text-destructive/90 font-medium">
                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]"></span>
                <span>{formError}</span>
              </div>
            )}
            <Button type="submit" className="w-full h-11 rounded-lg" disabled={isSubmitting}>
              {isSubmitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
