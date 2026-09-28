import type { FormEvent, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import type { CourseUpdateInput } from "@jilson/core";
import * as api from "@/lib/api";
import { mensagemDeErroAoSalvar, type CourseFormValues } from "@/lib/course-form";
import { passoDoCurso, payloadDoPasso, type PassoDoCurso } from "@/lib/course-steps";
import { Button } from "@/components/ui/button";
import { useCursoDoEditor } from "./CourseEditorLayout";

/**
 * O formulário de UM passo: confere só os campos dele e envia só a parte dele
 * (o PATCH do servidor aceita envio parcial). Um erro em outro passo não trava
 * este, e salvar aqui não mexe no que ainda não foi salvo nos outros.
 */
export function StepForm({ passo, children }: { passo: PassoDoCurso; children: ReactNode }) {
  const { curso } = useCursoDoEditor();
  const { trigger, getValues } = useFormContext<CourseFormValues>();
  const queryClient = useQueryClient();

  const salvar = useMutation({
    mutationFn: (payload: CourseUpdateInput) => api.updateCourse(curso.id, payload),
    // Recarrega o curso: o ✓ do nível 2 e o topo leem o que ficou GRAVADO.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-course", curso.id] });
    },
  });

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!(await trigger(passoDoCurso(passo).campos))) return;
    salvar.mutate(payloadDoPasso(getValues(), passo));
  }

  return (
    <form onSubmit={enviar} className="space-y-12" noValidate>
      {children}
      {/* Falhou ao salvar: diz o porquê. `role="alert"` faz o leitor de tela
          anunciar; a mensagem some sozinha quando o próximo envio começa. */}
      {salvar.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mensagemDeErroAoSalvar(salvar.error)}
        </p>
      )}
      <div className="flex justify-end border-t border-border/40 pt-8">
        <Button type="submit" size="lg" disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
