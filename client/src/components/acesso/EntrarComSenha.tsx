import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { useIrPara } from "@/lib/versao";
import { useQueryClient } from "@tanstack/react-query";
import { loginSchema, type LoginInput } from "@jilson/core";
import { signIn } from "@/lib/auth-client";
import { pedirCodigo } from "@/lib/api";
import { falhaAoPedirCodigo, useDestinoDepoisDeEntrar } from "@/lib/acesso-por-codigo";
import { useT } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErroDoCampo, FalhaDoFormulario } from "./MolduraDeAcesso";

// ENTRAR COM E-MAIL E SENHA — o formulário da tela de entrar (movido da `LoginPage`, sem mudar o que
// ele faz), com os dois caminhos novos da etapa 4.7, passo 5 (decisões do operador, 21/10/2026):
// "Esqueci minha senha" e "Receber código de acesso" — o código no e-mail, e o campo da senha dá
// lugar ao do código.

type Props = { emailInicial?: string; aoEnviarCodigo: (email: string) => void };

export function EntrarComSenha({ emailInicial, aoEnviarCodigo }: Props) {
  const irPara = useIrPara();
  const destino = useDestinoDepoisDeEntrar();
  const t = useT();
  const queryClient = useQueryClient();
  // O TIPO da falha, não a frase: a frase sai do dicionário.
  const [formError, setFormError] = useState<"credenciais" | "falha" | null>(null);
  const [pedido, setPedido] = useState<"enviando" | "limite" | "falha" | null>(null);
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: emailInicial ?? "", password: "" } });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    setPedido(null);
    try {
      const { error } = await signIn.email({ email: values.email, password: values.password });
      if (error) {
        // 401 = bad credentials. Anything else (origin/CSRF, network, server) is
        // a different failure and must not be reported as "wrong password".
        if (error.status === 401) {
          setFormError("credenciais");
        } else {
          console.error("Falha no login:", error);
          setFormError("falha");
        }
        return;
      }
    } catch (err) {
      // `signIn.email` normalmente RESOLVE com `{ error }`, mas numa queda de
      // rede ela pode REJEITAR. Sem este catch a rejeição escapava do handler:
      // nenhuma mensagem aparecia e o botão ficava preso em "Entrando…", sem a
      // pessoa saber o que houve. Achado por teste, não por leitura.
      console.error("Falha no login:", err);
      setFormError("falha");
      return;
    }
    // QUEM ENTRA COMEÇA DO ZERO (decisão do operador, 11/10/2026): "Sair" já limpa o que as
    // telas guardaram, mas a sessão que acaba sozinha (venceu, ou o servidor a derrubou) não
    // passa por ele — sem isto, quem entrasse em seguida na mesma aba veria por instantes o que
    // era da conta anterior.
    queryClient.clear();
    irPara(destino, { substituir: true });
  }

  // "Receber código de acesso": só o e-mail precisa estar certo — a senha, aqui, não importa.
  async function receberCodigo() {
    setFormError(null);
    if (!(await trigger("email"))) return;
    const email = getValues("email").trim();
    setPedido("enviando");
    try {
      await pedirCodigo({ email, motivo: "entrar" });
      setPedido(null);
      aoEnviarCodigo(email);
    } catch (erro) {
      setPedido(falhaAoPedirCodigo(erro));
    }
  }

  // Numa credencial recusada o servidor diz "e-mail OU senha incorretos" — ele
  // não revela qual, de propósito (é o que impede alguém de descobrir quais
  // e-mails têm conta). Como não dá para saber qual campo está errado, os DOIS
  // são marcados; marcar só um seria uma dica errada.
  const emailInvalid = Boolean(errors.email) || Boolean(formError);
  const passwordInvalid = Boolean(errors.password) || Boolean(formError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email" className={emailInvalid ? "text-destructive" : undefined}>
          {t.login.email}
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={emailInvalid}
          aria-describedby={errors.email ? "email-error" : formError ? "form-error" : undefined}
          {...register("email")}
        />
        {errors.email && <ErroDoCampo id="email-error">{t.login.emailInvalido}</ErroDoCampo>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password" className={passwordInvalid ? "text-destructive" : undefined}>
          {t.login.senha}
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordInvalid}
          aria-describedby={errors.password ? "password-error" : formError ? "form-error" : undefined}
          {...register("password")}
        />
        {errors.password && <ErroDoCampo id="password-error">{t.login.senhaObrigatoria}</ErroDoCampo>}
      </div>
      {formError && <FalhaDoFormulario>{formError === "credenciais" ? t.login.credenciaisIncorretas : t.login.falha}</FalhaDoFormulario>}
      {(pedido === "limite" || pedido === "falha") && <FalhaDoFormulario id="codigo-falha">{pedido === "limite" ? t.comum.muitasTentativas : t.login.falha}</FalhaDoFormulario>}
      <Button type="submit" className="w-full h-11 rounded-lg" disabled={isSubmitting}>
        {isSubmitting ? t.login.entrando : t.login.entrar}
      </Button>
      <Button type="button" variant="outline" className="w-full h-11 rounded-lg" disabled={pedido === "enviando"} onClick={() => void receberCodigo()}>
        {pedido === "enviando" ? t.login.enviandoCodigo : t.login.receberCodigo}
      </Button>
      <p className="text-center text-sm">
        {/* O e-mail já digitado vai junto (no estado da navegação, nunca no endereço). */}
        <Link to="/esqueci-minha-senha" state={{ email: watch("email") }} className="text-muted-foreground underline-offset-4 hover:underline">
          {t.login.esqueciSenha}
        </Link>
      </p>
    </form>
  );
}
