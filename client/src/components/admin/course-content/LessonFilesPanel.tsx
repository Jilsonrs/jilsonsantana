import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { EXTENSOES_DOS_ARQUIVOS_DA_AULA } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { codigoDoErro } from "@/lib/course-form";
import { tamanhoLegivel } from "@/lib/tamanho-de-arquivo";
import { Button } from "@/components/ui/button";

const ACEITAS: readonly string[] = EXTENSOES_DOS_ARQUIVOS_DA_AULA;


const extensaoDe = (nome: string) => (nome.includes(".") ? (nome.split(".").pop() ?? "").toLowerCase() : "");

/**
 * OS ARQUIVOS PARA BAIXAR de uma aula (Bloco E, etapa 2, parte 2e — plano
 * aprovado pelo operador em 28/09/2026). Ficam numa zona própria do Bunny, sem
 * endereço público; o aluno assinante baixa pela aula na etapa 4 do Bloco U.
 * A tela confere o tipo antes de enviar; o servidor confere de novo. SEM limite de
 * tamanho (operador, 29/09/2026: em geral um .zip por curso), com a porcentagem.
 */
export function LessonFilesPanel({ lesson }: { lesson: AdminLesson }) {
  const queryClient = useQueryClient();
  const queryKey = ["lesson-files", lesson.id];
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useQuery({ queryKey, queryFn: () => api.listLessonFiles(lesson.id) });
  const [porcentagem, setPorcentagem] = useState(0);
  const recarregar = () => queryClient.invalidateQueries({ queryKey });

  const envio = useMutation({
    mutationFn: (arquivo: File) => {
      if (!ACEITAS.includes(extensaoDe(arquivo.name))) return Promise.reject(new Error("ArquivoRecusado"));
      setPorcentagem(0);
      return api.uploadLessonFile(lesson.id, arquivo, setPorcentagem);
    },
    onSuccess: recarregar,
  });
  const exclusao = useMutation({ mutationFn: api.deleteLessonFile, onSuccess: recarregar });

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Arquivos para baixar</p>
      {lista.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {lista.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível carregar os arquivos.
        </p>
      )}
      {lista.data && lista.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum arquivo nesta aula.</p>}
      {lista.data && lista.data.length > 0 && (
        <ul className="space-y-1">
          {lista.data.map((arquivo) => (
            <li key={arquivo.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {arquivo.originalName} <span className="text-muted-foreground">· {tamanhoLegivel(arquivo.sizeBytes)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Excluir o arquivo ${arquivo.originalName}`}
                disabled={exclusao.isPending}
                onClick={() => {
                  if (confirm(`Excluir o arquivo "${arquivo.originalName}"?`)) exclusao.mutate(arquivo.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={entrada}
        type="file"
        accept={ACEITAS.map((e) => `.${e}`).join(",")}
        className="hidden"
        data-testid={`lesson-file-${lesson.id}`}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) envio.mutate(arquivo);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={envio.isPending} onClick={() => entrada.current?.click()}>
        {envio.isPending ? `Enviando… ${porcentagem}%` : "Enviar arquivo"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Tipos aceitos: {ACEITAS.join(", ")}. Só assinantes baixam.
      </p>

      {envio.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {codigoDoErro(envio.error) === "StorageNaoConfigurado"
            ? "O armazenamento de arquivos não está configurado neste ambiente."
            : "Não foi possível enviar o arquivo. Use um dos tipos aceitos e tente de novo."}
        </p>
      )}
      {exclusao.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível excluir o arquivo. Tente de novo.
        </p>
      )}
    </div>
  );
}
