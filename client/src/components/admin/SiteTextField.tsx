import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LanguageCode } from "@jilson/core";
import * as api from "@/lib/api";
import type { SiteTextField as Campo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// UM campo do dicionário, nos dois idiomas. Componente próprio porque cada
// campo salva SOZINHO: um formulário único com 155 campos e um botão no fim
// obrigaria a reenviar tudo para corrigir uma vírgula.

/** "home.pricing.features[0]" → "features[0]" — a seção já é o título do grupo. */
function rotulo(key: string): string {
  return key.split(".").slice(2).join(".") || key;
}

function Idioma({
  campo,
  language,
  onSalvar,
  salvando,
}: {
  campo: Campo;
  language: LanguageCode;
  onSalvar: (language: LanguageCode, valor: string) => void;
  salvando: boolean;
}) {
  const { factory, override } = campo[language];
  const noAr = override ?? factory;
  const [valor, setValor] = useState(noAr);
  const mudou = valor !== noAr;
  const id = `${campo.key}-${language}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs uppercase text-muted-foreground">
          {language === "pt" ? "Português" : "Inglês"}
        </Label>
        {override !== null && (
          <span className="text-xs text-muted-foreground">editado por você</span>
        )}
      </div>
      <Textarea
        id={id}
        rows={2}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        aria-label={`${rotulo(campo.key)} em ${language === "pt" ? "português" : "inglês"}`}
      />
      {/* O valor de fábrica fica VISÍVEL ao lado do atual: depois da primeira
          edição o texto do código fica velho, e é essa diferença que o operador
          precisa enxergar para saber o que vai voltar se ele limpar o campo. */}
      {override !== null && (
        <p className="text-xs text-muted-foreground">
          Padrão: <span className="italic">{factory || "(vazio)"}</span>
        </p>
      )}
      {mudou && (
        <div className="flex gap-2">
          <Button size="sm" disabled={salvando} onClick={() => onSalvar(language, valor)}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setValor(noAr)}>
            Cancelar
          </Button>
        </div>
      )}
      {!mudou && override !== null && (
        <Button size="sm" variant="ghost" disabled={salvando} onClick={() => onSalvar(language, "")}>
          Voltar ao padrão
        </Button>
      )}
    </div>
  );
}

export function SiteTextField({ campo }: { campo: Campo }) {
  const queryClient = useQueryClient();
  const salvar = useMutation({
    mutationFn: api.adminUpdateSiteText,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-site-text"] }),
  });

  return (
    <div className="space-y-3 border-t py-4">
      <p className="font-mono text-xs text-muted-foreground">{rotulo(campo.key)}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["pt", "en"] as const).map((language) => (
          // `key` inclui o valor no ar: quando o salvamento recarrega a lista, o
          // campo é remontado com o texto novo. Sem isso o `useState` guardaria
          // o valor antigo e "Salvar" reapareceria sozinho depois de salvar.
          <Idioma
            key={`${language}-${campo[language].override ?? campo[language].factory}`}
            campo={campo}
            language={language}
            salvando={salvar.isPending}
            onSalvar={(lang, valor) => salvar.mutate({ key: campo.key, language: lang, value: valor })}
          />
        ))}
      </div>
      {salvar.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
    </div>
  );
}
