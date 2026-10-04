import { useFormContext, useWatch } from "react-hook-form";
import { LIMITES_DO_CURSO } from "@jilson/core";
import type { CourseFormValues } from "@/lib/course-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { Field, descritoPor } from "./Field";
import { MarkdownField } from "./MarkdownField";

type Mensagem = { nome: "welcomeMessage" | "congratsMessage"; titulo: string; dica: string; modo: string };

const MENSAGENS: Mensagem[] = [
  {
    nome: "welcomeMessage",
    titulo: "Mensagem de boas-vindas",
    dica: "Chega quando o aluno abre a primeira aula do curso. Em branco, nenhuma mensagem é enviada.",
    modo: "Modo de edição da mensagem de boas-vindas",
  },
  {
    nome: "congratsMessage",
    titulo: "Mensagem de parabéns",
    dica: "Chega quando o aluno conclui todas as aulas publicadas. Em branco, nenhuma mensagem é enviada.",
    modo: "Modo de edição da mensagem de parabéns",
  },
];

/**
 * O passo MENSAGENS do editor (Bloco E, etapa 4 — decisões do operador,
 * 04/10/2026): as duas mensagens do curso, que chegam ao aluno pelo sino de
 * Notificações. Mesmo editor da descrição (negrito, itálico, listas).
 */
export function CourseMessagesSection() {
  const { formState, control } = useFormContext<CourseFormValues>();
  const valores = useWatch({ control, name: ["welcomeMessage", "congratsMessage"] });
  return (
    <PageSection title="Mensagens do curso">
      <Card>
        <CardContent className="space-y-8 pt-6">
          {MENSAGENS.map((m, i) => (
            <Field
              key={m.nome}
              id={m.nome}
              label={m.titulo}
              error={formState.errors[m.nome]?.message}
              contador={{ atual: valores[i].length, limite: LIMITES_DO_CURSO.mensagem }}
              dica={m.dica}
            >
              <MarkdownField
                id={m.nome}
                name={m.nome}
                maxLength={LIMITES_DO_CURSO.mensagem}
                describedBy={descritoPor(m.nome, { dica: true, contador: true })}
                rotuloDoModo={m.modo}
              />
            </Field>
          ))}
        </CardContent>
      </Card>
    </PageSection>
  );
}
