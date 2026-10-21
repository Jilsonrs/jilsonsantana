import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useT } from "@/lib/language";
import { MolduraDeAcesso } from "@/components/acesso/MolduraDeAcesso";
import { PedirCodigoDaSenha } from "@/components/acesso/PedirCodigoDaSenha";
import { CriarSenhaNova } from "@/components/acesso/CriarSenhaNova";

// "ESQUECI MINHA SENHA" (etapa 4.7, passo 5 — decisões do operador, 21/10/2026: o código de 6
// números no e-mail, "como a Apple e os grandes fazem"). Dois tempos, a mesma moldura da tela de
// entrar: o e-mail; depois o código e a senha nova. Quem vem da tela de entrar traz o e-mail já
// digitado (no estado da navegação, nunca no endereço).

/** O e-mail que a tela de entrar mandou junto — ou nada. */
function emailDaNavegacao(estado: unknown): string {
  if (typeof estado !== "object" || estado === null || !("email" in estado)) return "";
  const email = (estado as { email?: unknown }).email;
  return typeof email === "string" ? email : "";
}

export function EsqueciMinhaSenhaPage() {
  const t = useT();
  const location = useLocation();
  const [email, setEmail] = useState<string | null>(null);

  return (
    <MolduraDeAcesso tituloPrefixo={t.senhaNova.tituloPrefixo} tituloEnfase={t.senhaNova.tituloEnfase} area={t.login.area} tituloDoCartao={t.senhaNova.criar}>
      {email === null ? <PedirCodigoDaSenha emailInicial={emailDaNavegacao(location.state)} aoEnviar={setEmail} /> : <CriarSenhaNova email={email} />}
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-muted-foreground underline-offset-4 hover:underline">
          {t.senhaNova.voltar}
        </Link>
      </p>
    </MolduraDeAcesso>
  );
}
