import { useState } from "react";
import { lerDocumentoFiscal, Plano, type PlanosDaAssinatura } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampoDoDocumento } from "@/components/assinar/CampoDoDocumento";
import { CampoVigiado } from "@/components/assinar/CampoVigiado";
import { pagarAAtrasadaComPix } from "@/lib/api";
import { dinheiro, telaDeConcluido } from "@/lib/assinar";
import { codigoDoErro } from "@/lib/course-form";
import { passouDoLimite } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { guardarPix } from "@/lib/pix-pendente";
import { CartaoProvider, useCartao } from "@/lib/stripe-do-site";
import { semInterromper } from "@/lib/versao";

/** Por que a pessoa sai desta tela sem o QR: a cobrança já não está atrasada, ou ela já tem acesso (pagou no meio). */
export type SaidaDoPix = "nao-atrasada" | "ja-assinante";

type Props = {
  dados: PlanosDaAssinatura;
  /** O plano da assinatura atrasada — o servidor gera o Pix do MESMO plano (o pedido não o escolhe). */
  plano: Plano;
  /** O clique foi aceito para seguir: a partir daqui a atrasada pode estar encerrada, e a tela não volta sozinha. */
  aoComecar: () => void;
  aoConcluir: () => void;
  aoSair: (saida: SaidaDoPix) => void;
};

/**
 * PAGAR COM PIX A COBRANÇA ATRASADA (Fase 4, etapa 4.9b, E14 — decisão do operador, P118; a tela e os textos aprovados
 * em 30/10/2026). O texto diz o que acontece (a assinatura no cartão se encerra, o plano, o valor e o período, que o Pix
 * não renova) ANTES do clique. O envio: confere o CPF ou CNPJ → confere o campo → o servidor encerra a atrasada e gera o
 * Pix → o QR da própria Stripe. O valor mostrado é o preço de agora do plano, o mesmo que o servidor cobra.
 * Sem o Pix no ar, só a frase de erro (com o suporte): o botão de Faturamento não sabe se o Pix está no ar.
 */
export function FormularioDoPixDaAtrasada(props: Props) {
  const t = useT();
  const escolhido = props.dados.planos.find((p) => p.plano === props.plano);
  if (!escolhido || !props.dados.pix) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t.assinar.erro}
      </p>
    );
  }
  return (
    <CartaoProvider pedido={{ chavePublicavel: props.dados.chavePublicavel, centavos: escolhido.centavos, moeda: escolhido.moeda, formasDePagamento: props.dados.formasDePagamento, pix: props.dados.pix }}>
      <Conteudo {...props} valor={dinheiro(escolhido.centavos, escolhido.moeda)} />
    </CartaoProvider>
  );
}

function Conteudo({ dados, plano, valor, aoComecar, aoConcluir, aoSair }: Props & { valor: string }) {
  const t = useT();
  const textos = t.faturamento.pixDaAtrasada;
  const cartao = useCartao();
  const [documento, setDocumento] = useState("");
  const [erroDoDocumento, setErroDoDocumento] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const anual = plano === Plano.ANUAL;
  const explicacao = textos.texto
    .replace("{plano}", anual ? t.assinar.anual : t.assinar.mensal)
    .replace("{valor}", valor)
    .replace("{periodo}", anual ? textos.umAno : textos.umMes);

  async function enviar() {
    if (enviando) return;
    if (!lerDocumentoFiscal(documento)) return setErroDoDocumento(t.assinar.documentoInvalido);
    setEnviando(true);
    setErro(null);
    try {
      // Carregar a página no meio cortaria o pagamento (`lib/versao.ts`).
      await semInterromper(async () => {
        const preenchido = await cartao.validar();
        if (!preenchido.ok) return setErro(preenchido.mensagem ?? t.assinar.erro);
        aoComecar();
        const criada = await pagarAAtrasadaComPix({ documento });
        if (criada.estado !== "pagar") return aoConcluir();
        // Guardado ANTES de o QR abrir: a tela de concluído o mostra de novo ("Mostrar o QR de novo").
        guardarPix({ segredo: criada.segredo, chavePublicavel: dados.chavePublicavel, ...(criada.email ? { email: criada.email } : {}) });
        const voltarPara = telaDeConcluido(false);
        const confirmado = criada.email ? await cartao.confirmar(criada.segredo, "pix", voltarPara, { email: criada.email }) : await cartao.confirmar(criada.segredo, "pix", voltarPara);
        if (!confirmado.ok) return setErro(confirmado.mensagem ?? t.assinar.erro);
        aoConcluir();
      });
    } catch (falha) {
      const motivo = codigoDoErro(falha);
      if (motivo === "NaoAtrasada") aoSair("nao-atrasada");
      else if (motivo === "JaAssinante") aoSair("ja-assinante");
      // A Stripe recusou o número que o `core` aceitou: nada foi encerrado.
      else if (motivo === "DocumentoInvalido") setErroDoDocumento(t.assinar.documentoInvalido);
      else if (motivo === "Ocupada" || motivo === "MuitosAoMesmoTempo") setErro(t.assinar.aguardeUmInstante);
      else if (motivo === "PixEmConferencia") setErro(t.assinar.pix.emConferencia);
      else setErro(passouDoLimite(falha) ? t.comum.muitasTentativas : t.assinar.erro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <p className="text-base text-foreground">{explicacao}</p>
        <CampoDoDocumento
          valor={documento}
          aoMudar={(novo) => {
            setDocumento(novo);
            setErroDoDocumento(null);
          }}
          erro={erroDoDocumento}
          travado={enviando}
        />
        <CampoVigiado tela="pagar-com-pix" pix />
        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}
        <Button type="button" size="lg" disabled={enviando} onClick={() => void enviar()} className="min-h-12 w-full sm:w-auto">
          {enviando ? t.assinar.processando : textos.botao}
        </Button>
      </CardContent>
    </Card>
  );
}
