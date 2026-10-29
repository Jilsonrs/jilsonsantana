import { useEffect, useRef, useState } from "react";
import type { TelaDoCampo } from "@jilson/core";
import { avisarCampoQueNaoAbriu } from "@/lib/api";
import { useT } from "@/lib/language";
import { CampoDoCartao } from "@/lib/stripe-do-site";

/** Quanto o campo da Stripe tem para ficar pronto: um celular devagar abre em poucos segundos. */
export const ESPERA_DO_CAMPO_MS = 15_000;

/**
 * O CAMPO DE PAGAMENTO VIGIADO (E3 da revisão ampla da cobrança, 29/10/2026 — plano → etapa 4.9b). O campo da Stripe
 * que não abre (um bloqueador, a rede de uma empresa, o Stripe.js que não chega, ou um defeito nosso nas opções — já
 * aconteceu duas vezes, em silêncio) deixava a pessoa sem conseguir pagar e o operador sem saber: o pedido de assinar
 * nem chega ao servidor. Aqui: se a Stripe não disser "pronto" em 15 s, ou disser que falhou, a frase APROVADA pelo
 * operador (P116) aparece e o servidor é avisado UMA vez, para alertá-lo. Se o campo ficar pronto depois, a frase some.
 */
export function CampoVigiado({ tela, pix = false, espera = ESPERA_DO_CAMPO_MS }: { tela: TelaDoCampo; pix?: boolean; espera?: number }) {
  const t = useT().assinar;
  const [naoAbriu, setNaoAbriu] = useState(false);
  const pronto = useRef(false);
  const avisou = useRef(false);
  function falhou(motivo: "nao-carregou" | "erro-ao-carregar") {
    if (pronto.current) return;
    setNaoAbriu(true);
    if (avisou.current) return;
    avisou.current = true;
    avisarCampoQueNaoAbriu({ tela, motivo }).catch(() => console.warn("[pagamento] o aviso do campo que não abriu não chegou ao servidor"));
  }
  // Efeito: o relógio do campo — a Stripe avisa quando ele fica pronto; se não avisar no prazo, ele não abriu.
  useEffect(() => {
    const relogio = setTimeout(() => falhou("nao-carregou"), espera);
    return () => clearTimeout(relogio);
    // Sem dependências de propósito: o relógio é de UM campo e começa quando ele monta (trocar cartão ↔ Pix monta
    // outro campo, e outro vigia).
  }, []);
  return (
    <div className="space-y-2">
      <CampoDoCartao
        pix={pix}
        aoFicarPronto={() => {
          pronto.current = true;
          setNaoAbriu(false);
        }}
        aoFalhar={() => falhou("erro-ao-carregar")}
      />
      {naoAbriu && (
        <p role="alert" className="text-sm text-destructive">
          {t.campoNaoCarregou}
        </p>
      )}
    </div>
  );
}
