import { MOTIVOS_DE_CANCELAMENTO, TAMANHO_DO_COMENTARIO, type MotivoDoCancelamento as Motivo } from "@jilson/core";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/language";

/**
 * O MOTIVO do cancelamento: a lista curta e o "Quer contar mais?" — os dois OPCIONAIS (decisão do
 * operador, 11/10/2026: o botão de cancelar funciona sem nada). Só desenha: quem guarda a
 * escolha é a tela.
 */
export function MotivoDoCancelamento({
  motivo,
  aoEscolher,
  comentario,
  aoComentar,
  desligado,
}: {
  motivo: Motivo | null;
  aoEscolher: (motivo: Motivo) => void;
  comentario: string;
  aoComentar: (comentario: string) => void;
  desligado: boolean;
}) {
  const t = useT().faturamento.cancelamento;
  return (
    <fieldset className="max-w-3xl space-y-4" disabled={desligado}>
      <legend className="text-sm font-semibold text-foreground">{t.pergunta}</legend>
      <div className="space-y-2">
        {MOTIVOS_DE_CANCELAMENTO.map((opcao) => (
          <label key={opcao} className="flex items-center gap-3 text-sm text-foreground">
            <input type="radio" name="motivo-do-cancelamento" value={opcao} checked={motivo === opcao} onChange={() => aoEscolher(opcao)} className="size-4 accent-primary" />
            {t.motivos[opcao]}
          </label>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="contar-mais">{t.contarMais}</Label>
        <Textarea id="contar-mais" value={comentario} maxLength={TAMANHO_DO_COMENTARIO} onChange={(evento) => aoComentar(evento.target.value)} />
      </div>
    </fieldset>
  );
}
