import { lazy, Suspense } from "react";
import { TELA_DE_CONCLUIDO_SEM_LOGIN } from "@jilson/core";
import { usePlanosSemLogin } from "@/lib/assinar";
import { useT } from "@/lib/language";
import { navegador } from "@/lib/versao";

// O formulário (com o campo do cartão da Stripe) vem à parte: o pedaço é o MESMO da tela de quem está
// logado (`PEDACOS_DO_ALUNO`).
const FormularioDeAssinatura = lazy(() => import("@/components/assinar/FormularioDeAssinatura").then((m) => ({ default: m.FormularioDeAssinatura })));

/**
 * A TELA PÚBLICA DE ASSINAR, a parte do app (etapa 4.7, passos 6c e 6e): o que vai no meio da página
 * do servidor `/assinar` — o menu, o rodapé, o título e a frase são dela (`server/src/views/assinar.ts`).
 * Só o visitante chega aqui: quem está logado é levado pelo servidor à tela de assinar do app. O
 * formulário é o MESMO da tela logada (as duas telas iguais — decisão do operador, 27/10/2026), no
 * modo sem login. Depois do pagamento, a página de concluído carrega inteira (ela também é do
 * servidor); a tentativa vai pelo `sessionStorage`, nunca pelo endereço.
 */
export function AssinarSemLoginPage() {
  const t = useT();
  const planos = usePlanosSemLogin();
  if (planos.isPending) return <p className="text-muted-foreground">{t.comum.carregando}</p>;
  // Sem planos (a Stripe não deu os preços) é a mesma falha: não há o que assinar.
  if (planos.isError || planos.data.planos.length === 0) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t.assinar.erroPlanos}
      </p>
    );
  }
  return (
    <Suspense fallback={<p className="text-muted-foreground">{t.comum.carregando}</p>}>
      {/* As rotas do visitante nunca respondem "já é assinante" (o e-mail com conta é `JaTemConta`, no campo). */}
      <FormularioDeAssinatura dados={planos.data} semLogin aoConcluir={() => navegador.ir(TELA_DE_CONCLUIDO_SEM_LOGIN)} aoSaberQueJaAssina={() => {}} />
    </Suspense>
  );
}
