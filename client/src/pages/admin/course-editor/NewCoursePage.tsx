import { useId, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as api from "@/lib/api";
import { courseFormSchema, blankValues, mensagemDeErroAoSalvar, type CourseFormValues } from "@/lib/course-form";
import { passoDoCurso, payloadDoPasso } from "@/lib/course-steps";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { CourseBasicsSection } from "@/components/admin/course-form/CourseBasicsSection";
import { AvisoFlutuante } from "@/components/admin/AvisoFlutuante";
import { useAvisoFlutuante } from "@/lib/aviso-flutuante";
import { CONFIRA_OS_CAMPOS } from "./StepForm";

/**
 * NOVO CURSO: só o passo 1. Os outros passos precisam do curso já gravado (o
 * endereço deles leva o id, e a capa e o vídeo vão para um curso que existe);
 * "Criar curso" grava e abre o editor, que diz "Curso criado.". O botão fica no
 * TOPO, depois de "Voltar para cursos", e o erro sai na mensagem flutuante
 * (decisões do operador, 03/10/2026, a partir da Udemy).
 */
export function NewCoursePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<CourseFormValues>({ resolver: zodResolver(courseFormSchema), defaultValues: blankValues });
  const formId = useId();
  const { aviso, avisar, fechar } = useAvisoFlutuante();

  const criar = useMutation({
    mutationFn: (values: CourseFormValues) =>
      api.createCourse({
        ...payloadDoPasso(values, "basico"),
        // Os três que o servidor exige na criação (também estão no passo 1).
        slug: values.slug,
        title: values.title,
        language: values.language,
      }),
    onSuccess: (novo) => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      navigate(`/admin/cursos/${novo.id}/basico`, { replace: true, state: { aviso: "Curso criado." } });
    },
    onError: (erro) => avisar("erro", mensagemDeErroAoSalvar(erro)),
  });

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!(await form.trigger(passoDoCurso("basico").campos))) {
      avisar("erro", CONFIRA_OS_CAMPOS);
      return;
    }
    criar.mutate(form.getValues());
  }

  return (
    <PageContainer>
      <PageHeader
        title="Novo curso"
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/cursos">Voltar para cursos</Link>
            </Button>
            <Button type="submit" form={formId} disabled={criar.isPending}>
              {criar.isPending ? "Criando…" : "Criar curso"}
            </Button>
          </>
        }
      />
      <FormProvider {...form}>
        <form id={formId} onSubmit={enviar} className="space-y-12" noValidate>
          <CourseBasicsSection />
        </form>
      </FormProvider>
      <AvisoFlutuante aviso={aviso} aoFechar={fechar} />
    </PageContainer>
  );
}
