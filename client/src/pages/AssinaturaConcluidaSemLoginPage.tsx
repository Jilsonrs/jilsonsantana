import { useEffect, useState } from "react";
import { EMAIL_DE_SUPORTE } from "@jilson/core";
import { CriarSenhaDepoisDePagar } from "@/components/assinar/CriarSenhaDepoisDePagar";
import { QrDeNovo } from "@/components/assinar/QrDeNovo";
import { useConfirmacaoSemLogin } from "@/lib/assinar";
import { useT } from "@/lib/language";
import { lerTentativa } from "@/lib/tentativa-de-assinar";
import { navegador } from "@/lib/versao";

/**
 * DEPOIS DO PAGAMENTO, SEM CONTA (etapa 4.7, passo 6e2): o que vai no meio da página do servidor
 * `/assinar/concluido`. Pelo código da tentativa que ESTA aba guardou (`lib/tentativa-de-assinar.ts` —
 * nunca o endereço), pergunta se o pagamento valeu; valeu, a pessoa cria a senha aqui e já entra
 * (decisão do operador, 21/10/2026). A tela repete o e-mail: é aqui que se percebe um erro de digitação.
 * Sem tentativa nesta aba (outra aba, outro aparelho, ou já usada), a conta se abre pela tela de
 * entrar, com o código por e-mail.
 */
export function AssinaturaConcluidaSemLoginPage({ conferirACada = 2000, demora = 20_000 }: { conferirACada?: number; demora?: number }) {
  const t = useT().assinar;
  const [guardada] = useState(lerTentativa);
  const confirmacao = useConfirmacaoSemLogin(guardada?.tentativa ?? null, conferirACada);
  const [demorou, setDemorou] = useState(false);

  // Efeito: sem tentativa, a página troca por outra — navegação não acontece enquanto se desenha.
  useEffect(() => {
    if (!guardada) navegador.ir("/login");
  }, [guardada]);
  // Efeito: é um relógio — "está demorando" depende do tempo que passou, não de dado nenhum.
  useEffect(() => {
    const relogio = setTimeout(() => setDemorou(true), demora);
    return () => clearTimeout(relogio);
  }, [demora]);

  if (!guardada) return null;
  const confirmada = confirmacao.data?.confirmada === true;
  const [antes, depois = ""] = t.emailErrado.split("{contato}");
  return (
    <div className="max-w-2xl space-y-6">
      {confirmada ? (
        <>
          <h1 className="text-2xl font-semibold text-foreground">{t.confirmadaSemLogin}</h1>
          <p className="text-foreground">{t.crieSuaSenha.replace("{email}", guardada.email)}</p>
          <CriarSenhaDepoisDePagar tentativa={guardada.tentativa} />
          <p className="text-sm text-muted-foreground">
            {antes}
            <a href={`mailto:${EMAIL_DE_SUPORTE}`} className="underline underline-offset-2 hover:text-foreground">
              {EMAIL_DE_SUPORTE}
            </a>
            {depois}
          </p>
        </>
      ) : (
        <div className="space-y-3" aria-live="polite">
          <h1 className="text-2xl font-semibold text-foreground">{t.confirmando}</h1>
          {demorou && <p className="text-muted-foreground">{t.demorando}</p>}
        </div>
      )}
      {/* Quem pagou com Pix e fechou a janela do QR sem pagar (etapa 4.9): o botão enquanto o pagamento
          não vale. Fica montado nos dois estados: é ao receber "confirmado" que ele esquece o Pix. */}
      <QrDeNovo confirmado={confirmada} />
    </div>
  );
}
