import { useId, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import type { CourseUpdateInput } from "@jilson/core";
import * as api from "@/lib/api";
import { mensagemDeErroAoSalvar, type CourseFormValues } from "@/lib/course-form";
import { passoDoCurso, payloadDoPasso, type PassoDoCurso } from "@/lib/course-steps";
import { Button } from "@/components/ui/button";
import { useCursoDoEditor } from "./CourseEditorLayout";

/** Campo inválido: com o Salvar no topo, o campo marcado pode estar fora da tela. */
export const CONFIRA_OS_CAMPOS = "Confira os campos marcados antes de salvar.";

/**
 * O formulário de UM passo: confere só os campos dele e envia só a parte dele
 * (o PATCH do servidor aceita envio parcial). Um erro em outro passo não trava
 * este, e salvar aqui não mexe no que ainda não foi salvo nos outros.
 *
 * O SALVAR fica no TOPO, depois de "Voltar para cursos", e diz numa mensagem
 * flutuante se salvou ou não (decisões do operador, 03/10/2026, a partir da
 * Udemy). O botão é desenhado no lugar que o topo reserva e fica ligado a este
 * formulário pelo atributo `form`.
 */
export function StepForm({ passo, children }: { passo: PassoDoCurso; children: ReactNode }) {
  const { curso, acoes, avisar } = useCursoDoEditor();
  const formId = useId();
  const { trigger, getValues } = useFormContext<CourseFormValues>();
  const queryClient = useQueryClient();

  const salvar = useMutation({
    mutationFn: (payload: CourseUpdateInput) => api.updateCourse(curso.id, payload),
    // Recarrega o curso: o ✓ do nível 2 e o topo leem o que ficou GRAVADO.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-course", curso.id] });
      avisar("sucesso", "Suas alterações foram salvas.");
    },
    // Falhou ao salvar: diz o porquê, e a mensagem fica até o operador fechar.
    onError: (erro) => avisar("erro", mensagemDeErroAoSalvar(erro)),
  });

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!(await trigger(passoDoCurso(passo).campos))) {
      avisar("erro", CONFIRA_OS_CAMPOS);
      return;
    }
    salvar.mutate(payloadDoPasso(getValues(), passo));
  }

  return (
    <form id={formId} onSubmit={enviar} className="space-y-12" noValidate>
      {children}
      {acoes &&
        createPortal(
          <Button type="submit" form={formId} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Salvar"}
          </Button>,
          acoes,
        )}
    </form>
  );
}
