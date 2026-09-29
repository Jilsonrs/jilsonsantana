import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTrilhas } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmBreve } from "@/components/content/EmBreve";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { contagem } from "@/lib/contagem";
import { useT } from "@/lib/language";

/**
 * MEUS ESTUDOS — o que é do aluno, num lugar só (decisão do operador,
 * 29/09/2026: tela própria, com um resumo dos quatro itens do nível 2).
 *
 * Um cartão por item, na ordem do nível 2. Só "Minhas trilhas" existe hoje; os
 * outros três saem com EM BREVE e SEM link (mesma trava do menu): Em andamento
 * e Concluídos esperam o progresso (Fase 5), Certificados, a Fase 6.5.
 *
 * No celular a gaveta ainda é de um nível só, então é por esta tela que o aluno
 * chega a Minhas trilhas ali.
 */
export function MeusEstudosPage() {
  const t = useT();

  return (
    <PageContainer>
      <PageHeader title={t.meusEstudos.titulo} description={t.meusEstudos.descricao} />

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Cartao titulo={t.nav.emAndamento} descricao={t.meusEstudos.emAndamentoDescricao} emBreve />
        <Cartao titulo={t.nav.minhasTrilhas} descricao={t.meusEstudos.minhasTrilhasDescricao}>
          <ResumoDasTrilhas />
        </Cartao>
        <Cartao titulo={t.nav.concluidos} descricao={t.meusEstudos.concluidosDescricao} emBreve />
        <Cartao titulo={t.nav.certificados} descricao={t.meusEstudos.certificadosDescricao} emBreve />
      </div>
    </PageContainer>
  );
}

function Cartao({
  titulo,
  descricao,
  emBreve,
  children,
}: {
  titulo: string;
  descricao: string;
  emBreve?: true;
  children?: ReactNode;
}) {
  return (
    <Card className={emBreve ? "text-muted-foreground" : undefined}>
      <CardHeader>
        {/* `h2` de verdade (o `CardTitle` é uma div): o leitor de tela navega
            pelos títulos, e assim alcança os quatro cartões. */}
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {titulo}
          {emBreve && <EmBreve />}
        </h2>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

/** As trilhas salvas: quantas são, e o caminho até elas. */
function ResumoDasTrilhas() {
  const t = useT();
  // Mesma chave da tela Minhas trilhas: quem vem de lá não busca de novo.
  const { data: trilhas, isLoading, isError } = useQuery({
    queryKey: ["myTrilhas"],
    queryFn: getMyTrilhas,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">{t.comum.carregando}</p>;
  if (isError) return <p className="text-sm text-destructive">{t.minhasTrilhas.erro}</p>;

  if (!trilhas || trilhas.length === 0) {
    // O vazio tem SAÍDA: as trilhas prontas, de onde se salva uma.
    return (
      <div className="space-y-4">
        <p className="text-sm">{t.meusEstudos.nenhumaTrilha}</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/trilhas">{t.meusEstudos.verTrilhas}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">
        {contagem(trilhas.length, t.meusEstudos.trilhaSalva, t.meusEstudos.trilhasSalvas)}
      </p>
      <Button asChild className="rounded-full">
        <Link to="/aluno/minhas-trilhas">{t.meusEstudos.abrirMinhasTrilhas}</Link>
      </Button>
    </div>
  );
}
