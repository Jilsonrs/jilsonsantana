import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { pedirCodigo } from "@/lib/api";
import { falhaAoPedirCodigo } from "@/lib/acesso-por-codigo";
import { useT } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErroDoCampo, FalhaDoFormulario } from "./MolduraDeAcesso";

// "ESQUECI MINHA SENHA", o primeiro tempo (etapa 4.7, passo 5): o e-mail da conta, e o código vai
// para ele. A resposta é a mesma exista a conta ou não (quem pede não descobre nada).

const emailSchema = z.object({ email: z.string().trim().email() });
type EmailInput = z.infer<typeof emailSchema>;

type Props = { emailInicial: string; aoEnviar: (email: string) => void };

export function PedirCodigoDaSenha({ emailInicial, aoEnviar }: Props) {
  const t = useT();
  const [falha, setFalha] = useState<"limite" | "falha" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailInput>({ resolver: zodResolver(emailSchema), defaultValues: { email: emailInicial } });

  async function enviar({ email }: EmailInput) {
    setFalha(null);
    try {
      await pedirCodigo({ email, motivo: "senha" });
      aoEnviar(email);
    } catch (erro) {
      setFalha(falhaAoPedirCodigo(erro));
    }
  }

  return (
    <form onSubmit={handleSubmit(enviar)} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">{t.senhaNova.descricao}</p>
      <div className="space-y-1.5">
        <Label htmlFor="email" className={errors.email ? "text-destructive" : undefined}>
          {t.login.email}
        </Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        {errors.email && <ErroDoCampo id="email-error">{t.login.emailInvalido}</ErroDoCampo>}
      </div>
      {falha && <FalhaDoFormulario>{falha === "limite" ? t.comum.muitasTentativas : t.login.falha}</FalhaDoFormulario>}
      <Button type="submit" className="w-full h-11 rounded-lg" disabled={isSubmitting}>
        {isSubmitting ? t.login.enviandoCodigo : t.senhaNova.enviarCodigo}
      </Button>
    </form>
  );
}
