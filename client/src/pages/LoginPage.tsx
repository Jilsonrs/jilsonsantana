import { useState } from "react";
import { Navigate } from "react-router";
import { useSession } from "@/lib/auth-client";
import { useT } from "@/lib/language";
import { useDestinoDepoisDeEntrar } from "@/lib/acesso-por-codigo";
import { MolduraDeAcesso } from "@/components/acesso/MolduraDeAcesso";
import { EntrarComSenha } from "@/components/acesso/EntrarComSenha";
import { EntrarComCodigo } from "@/components/acesso/EntrarComCodigo";

// A TELA DE ENTRAR. Duas formas, a mesma moldura (decisões do operador, 21/10/2026 — etapa 4.7,
// passo 5): com e-mail e SENHA, e com o CÓDIGO no e-mail ("Receber código de acesso": o campo da
// senha dá lugar ao do código). "Esqueci minha senha" leva à tela da senha nova.

type Modo = { tipo: "senha"; email?: string } | { tipo: "codigo"; email: string };

export function LoginPage() {
  const t = useT();
  const { data: session, isPending } = useSession();
  const [modo, setModo] = useState<Modo>({ tipo: "senha" });
  // Depois de entrar: o Início, ou a tela de assinar quando se chegou pelo "Já tem conta? Entrar"
  // (lista fechada — `lib/acesso-por-codigo.ts`).
  const destino = useDestinoDepoisDeEntrar();

  // Already signed in -> skip the form.
  if (!isPending && session) {
    return <Navigate to={destino} replace />;
  }

  return (
    <MolduraDeAcesso tituloPrefixo={t.login.tituloPrefixo} tituloEnfase={t.login.tituloEnfase} area={t.login.area} tituloDoCartao={t.login.entrar}>
      {modo.tipo === "senha" ? (
        <EntrarComSenha emailInicial={modo.email} aoEnviarCodigo={(email) => setModo({ tipo: "codigo", email })} />
      ) : (
        <EntrarComCodigo email={modo.email} aoVoltar={() => setModo({ tipo: "senha", email: modo.email })} />
      )}
    </MolduraDeAcesso>
  );
}
