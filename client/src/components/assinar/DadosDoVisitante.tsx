import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ENTRAR_PARA_ASSINAR } from "@/lib/acesso-por-codigo";
import { useT } from "@/lib/language";

// SÓ NA TELA PÚBLICA (etapa 4.7, passo 6e): o que a tela de quem está logado não pede — o e-mail (o
// da conta, ali) e a caixa de novidades (a escolha que a pessoa fez ao assinar pela primeira vez —
// decisão do operador, 27/10/2026). Textos aprovados por ele no mesmo dia (P81).

/** O e-mail, com "Já tem conta? Entrar": quem já tem conta entra e assina pela tela do app (decisão de 21/10/2026). */
export function CampoDoEmail({ valor, aoMudar, erro, travado }: { valor: string; aoMudar: (valor: string) => void; erro: string | null; travado: boolean }) {
  const t = useT().assinar;
  return (
    <div className="space-y-2">
      <Label htmlFor="email-do-visitante">{t.email}</Label>
      <Input
        id="email-do-visitante"
        type="email"
        name="email"
        autoComplete="email"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        disabled={travado}
        maxLength={254}
        className="max-w-md"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? "email-do-visitante-ajuda email-do-visitante-erro" : "email-do-visitante-ajuda"}
      />
      <p id="email-do-visitante-ajuda" className="text-sm text-muted-foreground">
        {t.emailAjuda}
      </p>
      {erro && (
        <p id="email-do-visitante-erro" role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {t.jaTemConta}{" "}
        <a href={ENTRAR_PARA_ASSINAR} className="font-medium text-primary underline-offset-2 hover:underline">
          {t.entrar}
        </a>
      </p>
    </div>
  );
}

/** A caixa de novidades, DESMARCADA de fábrica: marcada de fábrica não vale como consentimento (LGPD; P82, 12/10/2026). */
export function CaixaDeNovidades({ marcada, aoMudar, travado }: { marcada: boolean; aoMudar: (marcada: boolean) => void; travado: boolean }) {
  const t = useT().assinar;
  return (
    <label className="flex max-w-md items-start gap-3 text-sm text-foreground">
      <input type="checkbox" checked={marcada} onChange={(evento) => aoMudar(evento.target.checked)} disabled={travado} className="mt-0.5 h-4 w-4 accent-primary" />
      <span>{t.novidades}</span>
    </label>
  );
}
