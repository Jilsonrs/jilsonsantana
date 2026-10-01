import { useState } from "react";
import { enderecoDoCurso, type LanguageCode } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field } from "./Field";

type Estado = "parado" | "copiado" | "falhou";

/**
 * O LINK DO CURSO, com o botão de copiar — no passo Publicar (operador,
 * 27–28/09/2026). Lê o slug e o idioma GRAVADOS: o link só existe para o que
 * está salvo.
 *
 * O link fica sempre visível num campo só de leitura: quem não conseguir copiar
 * pelo botão (navegador sem a área de transferência, ou permissão negada)
 * seleciona e copia dali. O aviso sai numa região `role="status"`, que já existe
 * antes do clique — é assim que o leitor de tela anuncia a mudança.
 */
export function CourseLinkField({ slug, idioma }: { slug: string; idioma: LanguageCode }) {
  const [estado, setEstado] = useState<Estado>("parado");
  const link = `${window.location.origin}${enderecoDoCurso(idioma, slug)}`;

  function copiar() {
    if (!navigator.clipboard?.writeText) {
      setEstado("falhou");
      return;
    }
    navigator.clipboard.writeText(link).then(
      () => setEstado("copiado"),
      () => setEstado("falhou"),
    );
  }

  return (
    <PageSection
      title="Link do curso"
    >
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Field id="courseLink" label="Link">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input id="courseLink" readOnly value={link} onFocus={(e) => e.target.select()} />
              {/* type="button": o link mora dentro do formulário do passo, e
                  copiar não pode salvar nada. */}
              <Button type="button" variant="outline" onClick={copiar}>
                Copiar link
              </Button>
            </div>
          </Field>
          <p role="status" className={estado === "falhou" ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {estado === "copiado" && "Link copiado."}
            {estado === "falhou" && "Não foi possível copiar. Selecione o link e copie."}
          </p>
          {idioma === "en" && (
            <p className="text-sm text-muted-foreground">
              A página dos cursos em inglês ainda não existe: este já é o endereço definitivo dela.
            </p>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
