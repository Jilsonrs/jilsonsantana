import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { VALIDADE_DO_CODIGO_EM_MINUTOS } from "@jilson/core";
import { signIn } from "@/lib/auth-client";
import { pedirCodigo } from "@/lib/api";
import { CODIGO_DE_6_NUMEROS, falhaAoGastarCodigo, falhaAoPedirCodigo, POS_LOGIN, type FalhaDoCodigo } from "@/lib/acesso-por-codigo";
import { useT } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { CampoDeCodigo } from "./CampoDeCodigo";
import { FalhaDoFormulario } from "./MolduraDeAcesso";

// ENTRAR COM O CÓDIGO (etapa 4.7, passo 5 — decisão do operador, 21/10/2026): "um botão receber
// código de acesso, a pessoa clica, o campo onde deveria colocar a senha muda para receber o código,
// a pessoa informa e entra" — sem criar senha nova na hora. O código já foi pedido (a tela de senha
// o pediu); aqui, digitá-lo, pedir outro, ou voltar para a senha.

const codigoSchema = z.object({ codigo: z.string().trim().regex(CODIGO_DE_6_NUMEROS) });
type CodigoInput = z.infer<typeof codigoSchema>;

type Props = { email: string; aoVoltar: () => void };

export function EntrarComCodigo({ email, aoVoltar }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [falha, setFalha] = useState<FalhaDoCodigo | null>(null);
  const [outro, setOutro] = useState<"enviando" | "enviado" | "limite" | "falha" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CodigoInput>({ resolver: zodResolver(codigoSchema) });

  async function entrar({ codigo }: CodigoInput) {
    setFalha(null);
    try {
      const { error } = await signIn.emailOtp({ email, otp: codigo });
      if (error) {
        setFalha(falhaAoGastarCodigo(error));
        return;
      }
    } catch (erro) {
      // Numa queda de rede a chamada REJEITA, em vez de devolver `{ error }` (o mesmo da senha).
      console.error("Falha ao entrar com o código:", erro);
      setFalha("falha");
      return;
    }
    // Quem entra começa do zero (o mesmo da senha — decisão do operador, 11/10/2026).
    queryClient.clear();
    navigate(POS_LOGIN, { replace: true });
  }

  async function pedirOutro() {
    setFalha(null);
    setOutro("enviando");
    try {
      await pedirCodigo({ email, motivo: "entrar" });
      setOutro("enviado");
    } catch (erro) {
      setOutro(falhaAoPedirCodigo(erro));
    }
  }

  const frase = { codigo: t.login.codigoRecusado, limite: t.comum.muitasTentativas, falha: t.login.falha };
  return (
    <form onSubmit={handleSubmit(entrar)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <p className="text-sm font-medium break-all">{email}</p>
        <p id="codigo-enviado" className="text-sm text-muted-foreground">
          {t.login.codigoEnviado.replace("{minutos}", String(VALIDADE_DO_CODIGO_EM_MINUTOS))}
        </p>
      </div>
      <CampoDeCodigo id="codigo" rotulo={t.login.codigo} erro={errors.codigo ? t.login.codigoInvalido : undefined} descritoPor="codigo-enviado" registro={register("codigo")} />
      {falha && <FalhaDoFormulario>{frase[falha]}</FalhaDoFormulario>}
      <Button type="submit" className="w-full h-11 rounded-lg" disabled={isSubmitting}>
        {isSubmitting ? t.login.entrando : t.login.entrar}
      </Button>
      <p className="text-center text-sm text-muted-foreground">{t.login.naoChegou}</p>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" className="w-full h-11 rounded-lg" disabled={outro === "enviando"} onClick={() => void pedirOutro()}>
          {outro === "enviando" ? t.login.enviandoCodigo : t.login.pedirOutro}
        </Button>
        {outro === "enviado" && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {t.login.outroEnviado}
          </p>
        )}
        {(outro === "limite" || outro === "falha") && <FalhaDoFormulario id="outro-falha">{frase[outro]}</FalhaDoFormulario>}
        <Button type="button" variant="ghost" className="w-full h-11 rounded-lg" onClick={aoVoltar}>
          {t.login.entrarComSenha}
        </Button>
      </div>
    </form>
  );
}
