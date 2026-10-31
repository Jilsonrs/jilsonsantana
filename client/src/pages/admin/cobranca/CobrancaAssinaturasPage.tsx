import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { FiltroDasAssinaturas } from "@jilson/core";
import * as api from "@/lib/api";
import { useAssinaturasDoAdmin } from "@/lib/cobranca-admin";
import { enderecoDaFicha, precisaAcharNaStripe } from "@/lib/cobranca-ficha";
import { codigoDoErro } from "@/lib/course-form";
import { useIrPara } from "@/lib/versao";
import { FiltrosDasAssinaturas } from "@/components/admin/cobranca/FiltrosDasAssinaturas";
import { ListaDasAssinaturas } from "@/components/admin/cobranca/ListaDasAssinaturas";
import { ConferirNaStripe } from "@/components/admin/cobranca/ConferirNaStripe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/**
 * ADMIN → COBRANÇA → ASSINATURAS (Fase 4, etapa 4.7b, passo 1b — o mapa e o nome no menu decididos pelo operador,
 * 10/10 e 31/10/2026): todas as assinaturas da escola, a mais recente primeiro, com os filtros, a busca e quantas há
 * em cada situação. Só leitura. Admin: texto em português, na tela (o operador confere usando).
 */
export function CobrancaAssinaturasPage() {
  const [filtro, setFiltro] = useState<FiltroDasAssinaturas>("todas");
  const [pagina, setPagina] = useState(1);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState<string | undefined>(undefined);
  const lista = useAssinaturasDoAdmin({ filtro, pagina, ...(busca ? { busca } : {}) });
  const irPara = useIrPara();
  // O código de uma cobrança, fatura ou contestação (ch_, in_, du_): a lista não o acha sozinha — pergunta-se de
  // quem é, e a ficha abre direto.
  const achar = useMutation({
    mutationFn: (codigo: string) => api.adminAcharCodigo(codigo),
    onSuccess: (onde) => {
      const endereco = enderecoDaFicha(onde);
      if (endereco) irPara(endereco);
    },
  });

  function buscar(novaBusca: string | undefined) {
    achar.reset();
    if (novaBusca && precisaAcharNaStripe(novaBusca)) {
      achar.mutate(novaBusca);
      return;
    }
    setBusca(novaBusca);
    setPagina(1);
  }

  return (
    <PageContainer>
      <PageHeader title="Assinaturas" description="Todas as assinaturas da escola. Filtre pela situação ou busque pelo aluno." />

      <div className="space-y-12">
        <PageSection title="Todas as assinaturas">
          <div className="space-y-6">
            <FiltrosDasAssinaturas
              filtro={filtro}
              contagem={lista.data?.contagem}
              aoEscolher={(novo) => {
                setFiltro(novo);
                setPagina(1);
              }}
            />
            <form
              role="search"
              className="flex max-w-3xl flex-wrap items-center gap-2"
              onSubmit={(evento) => {
                evento.preventDefault();
                buscar(texto.trim() || undefined);
              }}
            >
              <Label htmlFor="busca-de-assinaturas" className="sr-only">
                Buscar assinaturas
              </Label>
              <Input
                id="busca-de-assinaturas"
                className="min-w-0 flex-1"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                placeholder="E-mail, nome ou o código da Stripe de um alerta (sub_, cus_, pi_, ch_, in_, du_)"
                maxLength={120}
                autoComplete="off"
              />
              <Button type="submit">Buscar</Button>
              {busca ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setTexto("");
                    buscar(undefined);
                  }}
                >
                  Limpar
                </Button>
              ) : null}
            </form>
            {achar.isPending ? <p className="text-muted-foreground">Procurando de quem é o código…</p> : null}
            {achar.isError ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {codigoDoErro(achar.error) === "NaoEncontrada" ? "Nenhuma pessoa da escola tem esse código." : "Não foi possível procurar o código. Tente de novo."}
              </p>
            ) : null}
            <ListaDasAssinaturas
              dados={lista.data}
              carregando={lista.isPending}
              falhou={lista.isError}
              aoTentarDeNovo={() => void lista.refetch()}
              busca={busca}
              pagina={pagina}
              aoMudarDePagina={setPagina}
            />
          </div>
        </PageSection>

        <PageSection
          title="Conferir na Stripe"
          description="Use quando alguém pagou e continua sem acesso, ou quando a assinatura acabou e a pessoa continua com acesso. O site busca na Stripe o que vale agora e acerta a conta."
        >
          <ConferirNaStripe />
        </PageSection>
      </div>
    </PageContainer>
  );
}
