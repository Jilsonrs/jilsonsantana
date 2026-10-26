import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { senhaNovaSchema, VALIDADE_DO_CODIGO_EM_MINUTOS } from "@jilson/core";
import { emailOtp, signIn } from "@/lib/auth-client";
import { pedirCodigo } from "@/lib/api";
import { CODIGO_DE_6_NUMEROS, falhaAoGastarCodigo, falhaAoPedirCodigo, POS_LOGIN, type FalhaDoCodigo } from "@/lib/acesso-por-codigo";
import { useT } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoDeCodigo } from "./CampoDeCodigo";
import { ErroDoCampo, FalhaDoFormulario } from "./MolduraDeAcesso";

// "ESQUECI MINHA SENHA", o segundo tempo (etapa 4.7, passo 5 — decisões do operador, 21/10/2026): o
// código e a senha nova, na mesma tela. Criada a senha, a pessoa JÁ ENTRA neste aparelho; os outros
// aparelhos saem (o servidor derruba as sessões). Serve também a quem pagou e ainda não tem senha:
// o código cria a primeira. A senha nunca é aparada (`senhaNovaSchema`).

const senhaNovaFormSchema = z.object({ codigo: z.string().trim().regex(CODIGO_DE_6_NUMEROS), senha: senhaNovaSchema });
type SenhaNovaInput = z.infer<typeof senhaNovaFormSchema>;

type Props = { email: string };

export function CriarSenhaNova({ email }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [falha, setFalha] = useState<FalhaDoCodigo | null>(null);
  const [outro, setOutro] = useState<"enviando" | "enviado" | "limite" | "falha" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SenhaNovaInput>({ resolver: zodResolver(senhaNovaFormSchema) });

  async function criar({ codigo, senha }: SenhaNovaInput) {
    setFalha(null);
    try {
      const { error } = await emailOtp.resetPassword({ email, otp: codigo, password: senha });
      if (error) {
        setFalha(falhaAoGastarCodigo(error));
        return;
      }
      // A senha está criada: entra com ela, neste aparelho.
      const entrou = await signIn.email({ email, password: senha });
      if (entrou.error) {
        navigate("/login", { replace: true });
        return;
      }
    } catch (erro) {
      console.error("Falha ao criar a senha nova:", erro);
      setFalha("falha");
      return;
    }
    // Quem entra começa do zero (o mesmo da tela de entrar — decisão do operador, 11/10/2026).
    queryClient.clear();
    navigate(POS_LOGIN, { replace: true });
  }

  async function pedirOutro() {
    setFalha(null);
    setOutro("enviando");
    try {
      await pedirCodigo({ email, motivo: "senha" });
      setOutro("enviado");
    } catch (erro) {
      setOutro(falhaAoPedirCodigo(erro));
    }
  }

  const frase = { codigo: t.login.codigoRecusado, limite: t.comum.muitasTentativas, falha: t.login.falha };
  const erroDaSenha = errors.senha ? (errors.senha.type === "too_small" ? t.senhaNova.senhaCurta : errors.senha.type === "too_big" ? t.senhaNova.senhaLonga : t.senhaNova.senhaVazia) : undefined;
  return (
    <form onSubmit={handleSubmit(criar)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <p className="text-sm font-medium break-all">{email}</p>
        <p id="codigo-enviado" className="text-sm text-muted-foreground">
          {t.login.codigoEnviado.replace("{minutos}", String(VALIDADE_DO_CODIGO_EM_MINUTOS))}
        </p>
      </div>
      <CampoDeCodigo id="codigo" rotulo={t.login.codigo} erro={errors.codigo ? t.login.codigoInvalido : undefined} descritoPor="codigo-enviado" registro={register("codigo")} />
      <div className="space-y-1.5">
        <Label htmlFor="senha" className={erroDaSenha ? "text-destructive" : undefined}>
          {t.senhaNova.senha}
        </Label>
        <Input id="senha" type="password" autoComplete="new-password" aria-invalid={Boolean(erroDaSenha)} aria-describedby={erroDaSenha ? "senha-erro" : "senha-regra"} {...register("senha")} />
        {erroDaSenha ? (
          <ErroDoCampo id="senha-erro">{erroDaSenha}</ErroDoCampo>
        ) : (
          <p id="senha-regra" className="text-[13px] text-muted-foreground">
            {t.senhaNova.regra}
          </p>
        )}
      </div>
      {falha && <FalhaDoFormulario>{frase[falha]}</FalhaDoFormulario>}
      <Button type="submit" className="w-full h-11 rounded-lg" disabled={isSubmitting}>
        {isSubmitting ? t.senhaNova.criando : t.senhaNova.criar}
      </Button>
      <p className="text-center text-sm text-muted-foreground">{t.login.naoChegou}</p>
      <Button type="button" variant="outline" className="w-full h-11 rounded-lg" disabled={outro === "enviando"} onClick={() => void pedirOutro()}>
        {outro === "enviando" ? t.login.enviandoCodigo : t.login.pedirOutro}
      </Button>
      {outro === "enviado" && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {t.login.outroEnviado}
        </p>
      )}
      {(outro === "limite" || outro === "falha") && <FalhaDoFormulario id="outro-falha">{frase[outro]}</FalhaDoFormulario>}
    </form>
  );
}
