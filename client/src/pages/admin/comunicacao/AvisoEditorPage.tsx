import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { announcementSchema } from "@jilson/core";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { AvisoForm, type AvisoFormValues } from "@/components/admin/comunicacao/AvisoForm";
import { fraseDaConfirmacao, paraQuem, quandoFoiEnviado } from "@/lib/avisos";
import { AVISOS, ROTA_DOS_AVISOS } from "./AvisosPage";

const VAZIO: AvisoFormValues = { title: "", body: "", audience: "TODOS", courseId: null };

/** A frase do erro, pelo motivo que o servidor devolveu (admin: só português). */
function mensagemDoErro(erro: unknown): string {
  const codigo = isAxiosError(erro) ? (erro.response?.data as { error?: string } | undefined)?.error : undefined;
  if (codigo === "AudienceLocked") return 'Depois de enviada, o "para quem" não muda.';
  if (codigo === "AlreadySent") return "Esta notificação já foi enviada.";
  if (codigo === "CourseNotFound") return "O curso escolhido não existe mais.";
  return "Não foi possível salvar. Tente de novo.";
}

/**
 * NOVA NOTIFICAÇÃO e EDITAR (bloco C1 — decisões do operador, 06/10/2026). Rascunho:
 * Salvar como rascunho ou Enviar (que confirma para quantas pessoas vai). Enviada:
 * só Salvar — todos passam a ver o texto novo.
 */
export function AvisoEditorPage() {
  const { id } = useParams();
  const avisoId = id && /^\d+$/.test(id) ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const aviso = useQuery({ queryKey: [AVISOS, avisoId], queryFn: () => api.adminGetAviso(avisoId as number), enabled: avisoId !== null });
  const cursos = useQuery({ queryKey: ["admin-courses"], queryFn: api.adminGetCourses });
  const [salvo, setSalvo] = useState(false);
  const [aConfirmar, setAConfirmar] = useState<{ id: number; quantos: number } | null>(null);

  const form = useForm<AvisoFormValues>({
    resolver: zodResolver(announcementSchema),
    values: aviso.data
      ? { title: aviso.data.title, body: aviso.data.body, audience: aviso.data.audience, courseId: aviso.data.course?.id ?? null }
      : VAZIO,
    resetOptions: { keepDirtyValues: true },
  });

  const salvar = useMutation({
    mutationFn: (v: AvisoFormValues) => (avisoId ? api.adminSalvarAviso(avisoId, v) : api.adminCriarAviso(v)),
    onSuccess: (salvoNoServidor) => {
      void queryClient.invalidateQueries({ queryKey: [AVISOS] });
      queryClient.setQueryData([AVISOS, salvoNoServidor.id], salvoNoServidor);
      setSalvo(true);
      // Recém-criado: o endereço passa a ser o dele, e os próximos Salvar o atualizam.
      if (!avisoId) navigate(`${ROTA_DOS_AVISOS}/${salvoNoServidor.id}`, { replace: true });
    },
  });
  const enviar = useMutation({
    mutationFn: api.adminEnviarAviso,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [AVISOS] });
      navigate(ROTA_DOS_AVISOS);
    },
  });

  // Enviar = salvar o que está na tela, contar quem recebe e pedir a confirmação.
  const [erroAoContar, setErroAoContar] = useState(false);
  const prepararEnvio = form.handleSubmit(async (v) => {
    setSalvo(false);
    setErroAoContar(false);
    let gravado: api.AdminAviso;
    try {
      gravado = await salvar.mutateAsync(v);
    } catch {
      return; // a mensagem do erro aparece pela própria gravação
    }
    try {
      setAConfirmar({ id: gravado.id, quantos: await api.adminContarDestinatarios(v.audience, v.courseId) });
    } catch {
      setErroAoContar(true);
    }
  });

  const enviado = Boolean(aviso.data?.sentAt);
  const titulo = avisoId ? "Editar notificação" : "Nova notificação";

  if (avisoId !== null && aviso.isError) {
    return (
      <PageContainer>
        <PageHeader title={titulo} />
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível abrir esta notificação.
        </p>
      </PageContainer>
    );
  }
  if ((avisoId !== null && !aviso.data) || !cursos.data) {
    return (
      <PageContainer>
        <PageHeader title={titulo} />
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={titulo}
        description={aviso.data ? `${paraQuem(aviso.data)} · ${quandoFoiEnviado(aviso.data)}` : undefined}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to={ROTA_DOS_AVISOS}>Voltar para notificações</Link>
            </Button>
            <Button
              type="button"
              variant={enviado ? "default" : "outline"}
              disabled={salvar.isPending}
              onClick={form.handleSubmit((v) => {
                setSalvo(false);
                salvar.mutate(v);
              })}
            >
              {enviado ? "Salvar" : "Salvar como rascunho"}
            </Button>
            {!enviado && (
              <Button type="button" disabled={salvar.isPending || enviar.isPending} onClick={() => void prepararEnvio()}>
                Enviar
              </Button>
            )}
          </>
        }
      />

      {salvo && <p className="mb-6 text-sm text-muted-foreground">Salvo.</p>}
      {erroAoContar && (
        <p role="alert" className="mb-6 text-sm font-medium text-destructive">
          Salvo, mas não foi possível contar quem vai receber. Tente Enviar de novo.
        </p>
      )}
      {(salvar.isError || enviar.isError) && (
        <p role="alert" className="mb-6 text-sm font-medium text-destructive">
          {mensagemDoErro(salvar.error ?? enviar.error)}
        </p>
      )}

      {aConfirmar && (
        <div role="alertdialog" aria-labelledby="confirmar-envio" className="mb-8 rounded-xl border border-border bg-muted/40 p-5">
          <p id="confirmar-envio" className="font-medium text-foreground">
            {fraseDaConfirmacao(aConfirmar.quantos)}
          </p>
          <div className="mt-4 flex gap-2">
            <Button type="button" disabled={enviar.isPending} onClick={() => enviar.mutate(aConfirmar.id)}>
              Confirmar envio
            </Button>
            <Button type="button" variant="outline" onClick={() => setAConfirmar(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <AvisoForm cursos={cursos.data} enviado={enviado} />
        </form>
      </FormProvider>
    </PageContainer>
  );
}
