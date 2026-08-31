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
    <div className="mx-auto max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
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
                <p id="email-error" className="text-sm text-destructive">
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
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            {/* `role="alert"` faz o leitor de tela ANUNCIAR a falha assim que
                ela aparece. Sem isso, quem não vê a tela só descobre que o login
                falhou ao tentar de novo. */}
            {formError && (
              <p id="form-error" role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
